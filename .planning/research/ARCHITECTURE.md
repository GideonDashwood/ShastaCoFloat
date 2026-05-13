# Architecture Research: Board-Specific BLE Auth

**Project:** RideLogger (ShastaCoFloat)
**Researched:** 2026-05-12
**Confidence:** HIGH — conclusions derived from git history of the actual codebase,
confirmed against Web Bluetooth API behavior and Onewheel GATT documentation.

---

## Pint vs GT Detection

- **Detection method:** User-selected model stored in `selectedBoard.model` (set before
  connecting). The value is one of: `GT`, `GTS`, `GTS-XL`, `XR`, `XR-C`, `Pint`, `Pint S`,
  `Pint X`. The app does NOT attempt auto-detection from the BLE advertisement or GATT
  characteristics — the user picks the board from the board-card UI before tapping Connect.
- **GT group membership test:** `OW_GT_MODELS.has(selectedBoard.model)` where
  `OW_GT_MODELS = new Set(['GT', 'GTS', 'GTS-XL'])`.
- **Pint device name pattern:** Physically, Pint boards advertise as "Pint", "Pint S", or
  "Pint X" over BLE. The Web Bluetooth `requestDevice` filter uses the service UUID
  (`e659f300-...`), not the device name, so all models are discovered the same way.
  `bleDevice.name` can provide the advertised name after connection but should not be used
  for auth gating — it is unreliable (can be blank) and the user has already declared the
  model explicitly.
- **GT device name pattern:** GT/GTS/GTS-XL boards advertise names like "GT", "GTS", etc.
  Same caveat: use `selectedBoard.model`, not `bleDevice.name`.
- **Reliability:** Gating on `selectedBoard.model` is HIGH reliability because the user
  declares intent before connecting and `OW_GT_MODELS` is a closed set. Device-name-based
  detection would be MEDIUM reliability (name can be empty or user-renamed).
- **Alternative (characteristic-presence check):** It is possible to call
  `service.getCharacteristic(OW_CHAR_AUTH_IN)` and treat a failure as "no auth needed",
  but this adds a GATT round-trip before every connection and creates a race condition:
  the characteristic EXISTS on Pint (it is part of the shared service), it just should not
  be used. Presence check is therefore not a reliable discriminator.
- **Source:** `git show 3ca1474` (commit "Fix Pint BLE: skip auth") and current constants
  in `index.html` lines 79, 392–393.

---

## Auth Flow by Model

### Pint / Pint S / Pint X
- **Auth required:** NO.
- **Characteristics f3fe/f3ff:** Present in the shared GATT service but MUST NOT be touched.
- **If auth attempted:** The `getCharacteristic(OW_CHAR_AUTH_IN)` call succeeds (the
  characteristic exists), `startNotifications()` succeeds, and the board does NOT send a
  challenge notification — it simply ignores the subscription. However, any GATT operation
  after this appears to confuse the Pint stack: subsequent `readValue()` calls on telemetry
  characteristics return `[0, 0]` for all fields. The board effectively stops responding to
  reads. This was the exact failure mode observed (commit 3ca1474 message: "the f312 write
  was confusing the Pint GATT stack and causing all reads to return [0,0]").
- **Subscription after failed/skipped auth:** `subscribeChar()` proceeds fine when auth is
  correctly skipped. The Pint sends notifications only on value change, which is why
  `startTelemetryPolling()` (5-second read loop) is also needed.
- **Source:** commit 3ca1474 diff; `index.html` lines 400–402.

### GT / GTS / GTS-XL
- **Auth required:** YES, before any telemetry read.
- **Auth flow:**
  1. Get characteristic `f3fe` (notify-only). Subscribe to notifications.
  2. Board sends a 2-byte challenge as a BLE notification on `f3fe`.
  3. Compute XOR response (XOR with 0xD8 is the most likely correct computation).
  4. Write response to `f3ff` (write-only). Board unlocks telemetry reads.
- **If auth skipped:** Telemetry `readValue()` calls on `f302`/`f303`/`f30d`/`f310` will
  return errors or stale zeros — the board gates reads behind the handshake.
- **Timing:** The board may take up to 800ms to send the f3fe challenge after subscription.
  Code waits 800ms before proceeding (`tryGTUnlock` line 456–457). Auth responses each need
  ~400ms gap between write attempts.
- **Auth characteristics:**
  - `e659f3fe-ea98-11e3-ac10-0800200c9a66` — challenge notify (board → client)
  - `e659f3ff-ea98-11e3-ac10-0800200c9a66` — response write (client → board)
  - `e659f318-ea98-11e3-ac10-0800200c9a66` — board serial (read for diagnostics)
- **Source:** `index.html` lines 76–78, 436–487; commit d631607 message.

### XR / XR-C
- **Auth required:** NO (same classification as Pint — not in `OW_GT_MODELS`).
- **Behavior:** Like Pint, XR boards use the shared `e659f300` service with the same
  telemetry characteristics but do not require the auth handshake. They also send
  notifications only on value change, so telemetry polling is needed here too.
- **Source:** `index.html` line 79 (`OW_GT_MODELS` excludes XR/XR-C); commit 3ca1474
  message ("Pint/XR/XRC boards don't need the GT auth handshake").

---

## Recommended Code Pattern

The correct pattern was implemented in commit 3ca1474 and then accidentally reverted in
d631607. The fix is to restore the `OW_GT_MODELS` gate:

```js
// After getPrimaryService():
await discoverAllChars(bleService); // diagnostic, optional

// Gate auth on GT family only — Pint/XR must NOT call tryGTUnlock
if (OW_GT_MODELS.has(selectedBoard.model)) {
  await tryGTUnlock(bleService);
}

// Telemetry subscriptions work for all models without auth
await subscribeChar(bleService, OW_CHAR_RPM,  onRpmData);
await subscribeChar(bleService, OW_CHAR_BATT, onBattData);
await subscribeChar(bleService, OW_CHAR_DUTY, onDutyData);
await subscribeChar(bleService, OW_CHAR_TEMP, onTempData);

// Always poll — Pint/XR notify only on value change, GT benefits too
startTelemetryPolling();
```

`OW_GT_MODELS` is already defined in the codebase (line 79) — no new constant needed.

**Decision point for auth method:** The `selectedBoard.model` approach (user declaration)
is preferred over runtime detection because:
1. All models share the same service UUID — there is no advertisement-level discriminator.
2. f3fe/f3ff exist on Pint's GATT table — presence check cannot distinguish models.
3. `bleDevice.name` can be blank and is unreliable before the user renames their board.
4. The user selects the board before connecting, so the model is always known.

---

## Web Bluetooth Characteristic Subscribe Behavior

### Does subscribe fail if auth skipped on GT?
Yes. If `tryGTUnlock` is not called on a GT board, subsequent `subscribeChar` calls will
appear to succeed (the GATT operations complete without error) but `readValue()` will
return zeros or throw a GATT error because the board has not unlocked. The subscription
handler fires but data is meaningless. There is no automatic "auth required" error thrown
by the Web Bluetooth API — the GATT layer returns whatever the board sends (which is
nothing useful pre-auth).

### Does subscribe succeed even if auth fails on Pint?
Partially. The `getCharacteristic` and `startNotifications` calls on telemetry UUIDs
succeed without auth. BUT: if `tryGTUnlock` was incorrectly called first (the regression),
the Pint GATT stack is corrupted and all subsequent `readValue()` calls return `[0, 0]`
regardless. The subscriptions register without error but deliver no real data. The root
cause is that subscribing to f3fe on a Pint, then waiting for a challenge that never
arrives, leaves the Pint BLE stack in a degraded state.

### subscribeChar error handling
`subscribeChar` (lines 512–556) wraps each operation in try/catch and logs via `bleDiag`
rather than throwing. This means connection-level errors are silent in the UI — they show
in the diagnostic panel but the user sees "connected" even when data is not flowing. This
is intentional for resilience but means the auth regression produces a silent failure
(connected but zero values), not a visible error.

### Web Bluetooth API constraint: one operation at a time
The Web Bluetooth API serializes GATT operations. If `tryGTUnlock` starts a
`startNotifications` call and then `await`s 800ms for the challenge, all other GATT
operations are queued. On Pint, this 800ms stall is pure waste and delays the first
telemetry read by nearly a second. Removing the auth call for Pint eliminates this stall.

---

## Summary: The Regression and the Fix

| Commit | Auth behavior | Pint result | GT result |
|--------|--------------|-------------|-----------|
| 3ca1474 (correct) | `if (OW_GT_MODELS.has(model)) tryGTUnlock()` | Auth skipped, telemetry works | Auth runs, telemetry works |
| d631607 (regression) | `tryGTUnlock()` unconditionally | Auth attempted, GATT stack corrupted, all reads return [0,0] | Auth runs, telemetry works |

**Fix:** Restore the `OW_GT_MODELS.has(selectedBoard.model)` guard around `tryGTUnlock`.
One line change at index.html line 393.
