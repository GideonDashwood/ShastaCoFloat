---
phase: 01-pint-ble-telemetry-fix
reviewed: 2026-05-12T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - index.html
  - sw.js
findings:
  critical: 0
  warning: 2
  info: 2
  total: 4
status: issues_found
---

# Phase 1: Code Review Report

**Reviewed:** 2026-05-12
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Reviewed the two targeted Phase 1 edits to `index.html` (BLE auth guard and poll-error diagnostic) and the `sw.js` cache bump to `ridelogger-v21`.

The primary fix — guarding `tryGTUnlock()` behind `OW_GT_MODELS.has(selectedBoard.model)` at line 393 — is correctly implemented. The Set membership check is safe when `selectedBoard.model` is `null` (returns `false`), so no guard on board-not-selected is needed. All three GT/GTS/GTS-XL model strings in the Set match the hardcoded board card values exactly. The sw.js version bump is correct.

Two warnings were found:

1. The telemetry poll reschedule at line 504 is unconditional — it fires after both success and exception paths, meaning a GATT error during polling will keep rescheduling the poll even though the BLE stack may be in a broken state. Cleanup relies entirely on `onBleDisconnected` setting `bleConnected = false`, which may not fire promptly if the OS-level disconnect event is delayed.

2. `startTelemetryPolling()` runs for all board types including GT/GTS/GTS-XL (line 402). The function comment says "Pint/XR boards only" but it is called unconditionally. For GT boards this is harmless redundancy, but it creates unnecessary GATT traffic on boards that already push notifications reliably.

Two info-level items are also noted: pre-existing encoding corruption in user-visible strings (Phase 2 scope), and a silent inner catch in `subscribeChar`.

---

## Warnings

### WR-01: Poll reschedule is unconditional after GATT error — can loop during zombie disconnect

**File:** `index.html:503-505`
**Issue:** `setTimeout(poll, 5000)` on line 504 executes unconditionally — outside the try block and not gated on success. If `readValue()` throws (e.g., the GATT connection dies mid-poll), the catch at line 503 logs the error and then line 504 immediately schedules the next poll. The guard at line 493 (`if (!bleConnected || !bleService) return`) stops the loop only after `onBleDisconnected` fires and sets `bleConnected = false`. If the OS-level `gattserverdisconnected` event is delayed (a known Chrome BLE timing issue), the poll can repeatedly throw and reschedule for several seconds, flooding the diagnostic log and making GATT calls against a dead connection.

**Fix:** Move the reschedule inside a finally block that first checks `bleConnected`, or check the flag again before scheduling:
```javascript
const poll = async () => {
  if (!bleConnected || !bleService) return;
  try {
    const readAndFire = async (uuid, handler) => {
      const char = await bleService.getCharacteristic(uuid);
      const val = await char.readValue();
      handler({ target: { value: val } });
    };
    await readAndFire(OW_CHAR_BATT, onBattData);
    await readAndFire(OW_CHAR_DUTY, onDutyData);
    await readAndFire(OW_CHAR_TEMP, onTempData);
  } catch(e) {
    bleDiag('poll error: ' + e.message);
    if (!bleConnected || !bleService) return; // stop on disconnect
  }
  const id = setTimeout(poll, 5000);
  blePollers.push(id);
};
```

### WR-02: `startTelemetryPolling()` called unconditionally for all board models including GT/GTS

**File:** `index.html:400-402`
**Issue:** The comment on line 400 correctly says "Pint/XR boards only push notifications when a value changes" — implying GT boards do not need polling. But `startTelemetryPolling()` is called at line 402 for every connected board, including GT/GTS/GTS-XL. For GT boards that have completed the auth handshake and are actively pushing notifications, the 5-second poll issues redundant `readValue()` GATT calls on top of notifications. This adds unnecessary GATT queue traffic and could interfere with the auth notification handler (`characteristicvaluechanged` on `OW_CHAR_AUTH_IN`) that may still fire asynchronously during the early polling window.

**Fix:** Guard `startTelemetryPolling()` behind a model check, consistent with the auth guard pattern:
```javascript
// Only Pint/XR need polling backup; GT boards push notifications reliably
if (!OW_GT_MODELS.has(selectedBoard.model)) startTelemetryPolling();
```

---

## Info

### IN-01: Pre-existing encoding corruption in user-visible UI strings (Phase 2 scope)

**File:** `index.html:588, 630`
**Issue:** Garbled multi-byte sequences appear in strings that are set as `textContent` and rendered to users. Line 588: `boardTempF.toFixed(0) + 'Â°'` — the temperature degree symbol is garbled and will display as `Â°` to users. Line 630: `'Connectingâ€¦'` — the ellipsis character is garbled. These are pre-existing encoding bugs (Phase 2 scope) not introduced by Phase 1, but they are confirmed still present in the shipped file.

**Fix:** Phase 2 work — replace garbled sequences with HTML entities or correct Unicode:
- `'Â°'` → `'°'` (or `'°'`)
- `'Connectingâ€¦'` → `'Connecting…'` (or `'Connecting...'`)

### IN-02: Silent `catch(e) {}` in `subscribeChar` inner poll swallows GATT read errors

**File:** `index.html:545`
**Issue:** The inner per-characteristic poll inside `subscribeChar` (for characteristics that have `read` but not `notify`) has an empty catch block at line 545. A GATT read error is swallowed with no diagnostic output, making it impossible to debug why a non-notifying characteristic stops updating. This is inconsistent with the Phase 1 change that added logging to the equivalent catch in `startTelemetryPolling`.

**Fix:**
```javascript
} catch(e) { bleDiag(`${short}: poll read failed — ${e.message}`); }
```

---

_Reviewed: 2026-05-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
