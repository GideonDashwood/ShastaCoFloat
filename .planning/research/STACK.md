# Stack Research: Onewheel BLE Protocol (Pint / Pint S / Pint X)

**Researched:** 2026-05-12
**Confidence:** MEDIUM — primary source is training knowledge of community reverse-engineering
(android-ponewheel, WheelLog, Float Control teardowns) plus full read of current app code.
Web search and WebFetch were blocked during this session; findings could not be cross-verified
against live GitHub sources. Flag any LOW-confidence item for manual verification before
shipping a Pint-specific fix.

---

## Auth Challenge (f3fe / f3ff)

- **Pint support:** NO
- **Evidence:** Community consensus from android-ponewheel, WheelLog, and Float Control
  reverse-engineering work (training data, MEDIUM confidence). The f3fe/f3ff auth
  characteristics were introduced on the GT family; the XR never used them and the Pint /
  Pint S / Pint X do not expose them. Attempting `service.getCharacteristic('e659f3fe...')`
  on a Pint board results in a GATT "no such characteristic" or "unknown attribute" error.
- **Current code bug:** `tryGTUnlock()` is called unconditionally for all boards (commit
  comment "All Onewheel models use the f3fe/f3ff auth handshake" is incorrect). The catch
  block silently swallows the f3fe getCharacteristic failure, but the `await new Promise(r =>
  setTimeout(r, 800))` wait inside `tryGTUnlock` still runs — adding 800 ms of dead time
  before telemetry subscriptions begin on every Pint connect. If f3fe is missing, the board
  sends no challenge, auth never completes, and subsequent reads of f303/f30d/f310 may be
  gated behind an auth state the board never entered.
- **Recommendation:** SKIP auth on Pint family. Gate `tryGTUnlock()` behind a model check.
  The current `OW_GT_MODELS = new Set(['GT', 'GTS', 'GTS-XL'])` set is defined but unused in
  the connect path — use it. Pseudocode:

  ```js
  if (OW_GT_MODELS.has(selectedBoard.model)) {
    await tryGTUnlock(bleService);
  }
  ```

  For Pint / Pint S / Pint X / XR: skip auth entirely and go straight to subscribeChar calls.

- **What about XR?** XR also does NOT use f3fe/f3ff. Same skip applies.
- **LOW-confidence note:** Some community members reported that Pint X (not Pint or Pint S)
  received a firmware update that added a lightweight auth step distinct from GT's f3fe/f3ff.
  If Pint X telemetry is also broken, this is worth investigating separately. Pint and Pint S
  are universally reported as auth-free.

---

## Service UUID

- **UUID:** `e659f300-ea98-11e3-ac10-0800200c9a66`
- **Correct for Pint:** YES — this UUID is used across all Onewheel models (XR, Pint, GT).
  It is not model-specific. Confidence: HIGH (consistent across all reverse-engineering sources).

---

## Battery Characteristic (f303)

- **Full UUID:** `e659f303-ea98-11e3-ac10-0800200c9a66`
- **Data type:** uint8 or uint16 depending on model
- **XR / GT byte layout:** 2 bytes — byte 0 = sequence counter or flags (discard), byte 1 =
  battery percent (uint8, 0–100, no scaling, direct percent value).
- **Pint byte layout:** Reports vary. Most community implementations treat it as 1 byte (uint8,
  0–100 direct). Some sources see 2 bytes on Pint X with the same layout as XR (byte 1 =
  percent). LOW confidence on exact Pint byte count.
- **Current code:** `raw.byteLength > 1 ? raw.getUint8(1) : raw.getUint8(0)` — this logic is
  correct as a safe fallback for both layouts. If the board returns 1 byte, it reads byte 0.
  If it returns 2 bytes, it reads byte 1.
- **Why battery reads 0:** Most likely cause is that `tryGTUnlock()` throws on f3fe before
  auth completes, and the board (incorrectly assumed to need auth) blocks or ignores subsequent
  reads. Skipping auth on Pint should fix this. Secondary cause: the characteristic may return
  2 bytes of zeros if read before the board is fully initialized — the existing 1.5s initial
  poll delay partly addresses this.
- **Scaling:** None — raw byte value IS the percent (0–100).
- **Range:** 0–100 (integer percent).
- **Evidence:** android-ponewheel source code, WheelLog Onewheel plugin, Float Control
  teardowns (training data, MEDIUM confidence).

---

## Duty Cycle Characteristic (f30d)

- **Full UUID:** `e659f30d-ea98-11e3-ac10-0800200c9a66`
- **Data type:** int16, big-endian (2 bytes, signed)
- **Byte offset:** 0 (both bytes form a single int16)
- **Parsing:** `getInt16(0, false)` → divide by 327.67 (= 32767 ÷ 100) → result is duty
  percent −100 to +100. Take `Math.abs()` for a 0–100% display value.
- **Scaling factor:** ÷ 327.67
- **Range raw:** −32767 to +32767 (signed; negative = reverse thrust)
- **Range output:** 0–100%
- **Current code:** `Math.abs(val / 327.67)` — CORRECT. This is consistent with all known
  community implementations.
- **Why duty reads 0:** Same root cause as battery — auth failure blocking reads. The parsing
  itself is correct.
- **Evidence:** WheelLog, android-ponewheel (training data, MEDIUM confidence). The 327.67
  divisor is universally consistent across sources.

---

## Temperature Characteristic (f310)

- **Full UUID:** `e659f310-ea98-11e3-ac10-0800200c9a66`
- **Data type:** int16, big-endian (2 bytes, signed)
- **Byte offset:** 0
- **Parsing:** `getInt16(0, false)` → divide by 10 → result in degrees Celsius.
- **Scaling:** ÷ 10
- **Unit:** Raw value is tenths of a degree Celsius. Divide by 10 for °C, then convert to °F
  if desired: `(raw / 10) * 9/5 + 32`.
- **Range example:** Raw 250 = 25.0 °C = 77 °F (typical ambient).
- **Current code:** `getInt16(0, false) / 10` then `* 9/5 + 32` — CORRECT.
- **Why temp reads 0:** Same root cause as battery — auth failure. The parsing is correct.
- **Evidence:** android-ponewheel, WheelLog (training data, MEDIUM confidence).

---

## RPM Characteristic (f302)

- **Full UUID:** `e659f302-ea98-11e3-ac10-0800200c9a66`
- **Data type:** int16, big-endian
- **Parsing:** `getInt16(0, false)` → raw RPM (signed; negative = reverse). Multiply by
  circumference and convert to mph.
- **Current code:** `Math.abs(rpm) * circ * 60 / 63360` — CORRECT. Pint circumference 32.9
  inches is correct in `OW_WHEEL_CIRC`.
- **Notifications:** f302 pushes notifications reliably on all models including Pint.
  If RPM works but battery/duty/temp are 0, this confirms the issue is auth-gating on slow
  characteristics, not a general BLE connection failure.

---

## Notification vs Poll

- **Pint pushes notifications on f302 (RPM):** YES — confirmed by current working behavior.
- **Pint pushes notifications on f303/f30d/f310:** MAYBE — community reports are mixed.
  Most implementations treat these as read-only on Pint (no notify property). The XR does
  support notify on these characteristics; Pint support is inconsistent by firmware version.
- **Recommended approach:** POLL + notify-if-available (current approach is correct).
  `subscribeChar()` already checks `char.properties.notify` before calling
  `startNotifications()` — this is the right pattern. The 5s `startTelemetryPolling()` backup
  is correct and necessary for Pint.
- **Timing:** The 1.5s initial poll delay is appropriate. Do not remove it.
- **Critical fix needed:** Remove the 800ms auth wait from the Pint connect path. Currently
  `tryGTUnlock` always runs its `setTimeout(r, 800)` even when f3fe is absent, adding dead
  time and potentially leaving the board in a state where it rejects reads.

---

## Characteristic Properties on Pint (expected)

Based on community teardowns (LOW–MEDIUM confidence — verify with `discoverAllChars` diag
output from a real Pint connection):

| Short UUID | Property        | Notes                                    |
|------------|-----------------|------------------------------------------|
| f302       | notify + read   | RPM — notifications work on Pint         |
| f303       | read only        | Battery — poll only on Pint              |
| f30d       | read only        | Duty — poll only on Pint                 |
| f310       | read only        | Temp — poll only on Pint                 |
| f318       | read only        | Serial — readable without auth on Pint   |
| f3fe       | ABSENT           | Not present on Pint at all               |
| f3ff       | ABSENT           | Not present on Pint at all               |

The `discoverAllChars` diagnostic output in the BLE diag panel will show the actual properties
when connected to a real Pint. Check the diag log to confirm.

---

## Root Cause Summary

All three stuck-at-0 readings (battery, duty, temp) share one root cause:

1. `tryGTUnlock()` runs unconditionally on connect.
2. `service.getCharacteristic(OW_CHAR_AUTH_IN)` throws on Pint (characteristic absent).
3. The catch block logs "Auth setup error" but the function resolves instead of re-throwing.
4. The `await new Promise(r => setTimeout(r, 800))` inside the try block may or may not
   execute depending on where exactly the throw occurs — if it throws before the timeout,
   the 800ms is skipped, which is actually better.
5. More importantly: if f3fe IS somehow found (e.g., Pint X variant) but no challenge
   notification arrives, the board is stuck waiting for auth that never completes. Reads of
   f303/f30d/f310 may return zeros or errors until auth is resolved.

**Fix:** Add board-model guard before `tryGTUnlock`. Skip it entirely for Pint / Pint S /
Pint X / XR. Only run for GT / GTS / GTS-XL.

---

## Known Open-Source References

Note: WebFetch was blocked during research — these are from training knowledge only.
Verify before citing them as authoritative.

- **android-ponewheel** (github.com/ponewheel/android-ponewheel) — Java/Android, full
  characteristic map including byte parsing for battery, RPM, duty, temp. PRIMARY reference.
  Confirms f303 byte 1 = percent, f30d int16/327.67, f310 int16/10.

- **WheelLog** (github.com/Wheellog/Wheellog.Android) — Android app supporting multiple EUC
  and Onewheel models. Contains a Onewheel protocol module.

- **Puck.js Onewheel** — JavaScript BLE implementation for Espruino/Puck.js hardware.
  Confirms the same characteristic UUIDs and parse logic.

- **Float Control** (iOS, closed source) — Most feature-complete third-party app. Auth
  behavior is not publicly documented but community teardowns confirm Pint skips auth.

- **Craft&Ride Onewheel BLE spec** — Partial community documentation at
  github.com/OnewheelCommunityEdition — includes characteristic list but may be incomplete
  for Pint family specifically.

---

## Recommended Code Change (minimal)

```js
// In the connect flow, replace:
await tryGTUnlock(bleService);

// With:
const needsAuth = OW_GT_MODELS.has(selectedBoard.model);
if (needsAuth) {
  await tryGTUnlock(bleService);
} else {
  bleDiag('Auth skipped — not a GT family board');
}
```

`OW_GT_MODELS` is already defined as `new Set(['GT', 'GTS', 'GTS-XL'])` — just use it.

---

## Verification Checklist (before closing this bug)

- [ ] Connect a Pint to the app with diag panel open
- [ ] Confirm f3fe and f3ff do NOT appear in `discoverAllChars` output
- [ ] Confirm f303, f30d, f310 appear with `r=1 n=0` (read, no notify) or `r=1 n=1`
- [ ] After skipping auth, confirm battery, duty, temp show non-zero values within 2–3s
- [ ] Verify battery % matches the Onewheel app reading on the same board
- [ ] Verify temperature is plausible (ambient + motor heat, should be 60–100°F at rest)
- [ ] Verify duty cycle responds during riding (non-zero when moving, higher under load)
