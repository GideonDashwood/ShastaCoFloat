---
phase: 03-vesc-board-type-mock-ble
reviewed: 2026-05-13T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - index.html
  - sw.js
findings:
  critical: 2
  warning: 5
  info: 2
  total: 9
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-05-13
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 3 adds a VESC board type with a mock BLE interval, saves `vescVoltage` and `avgMotorTemp` to Firestore, adds VESC labels to the ride list and modal, and cleans up the mock interval on stop/reset. The wiring is mostly correct but contains two blocking bugs: the mock interval leaks on double-click (first handle is overwritten before being cleared), and `resetRecordPage()` — called on Discard — does not clear the interval at all, leaving a ghost interval that writes telemetry state indefinitely. There are also several lower-severity issues around cross-board data contamination, missing filter/profile support for the new board type, and an incorrect version badge.

---

## Critical Issues

### CR-01: `vescMockInterval` leaks on double-click — first interval handle overwritten and never cleared

**File:** `index.html:762`

**Issue:** `connectVESCMock()` has no guard against being called when a mock session is already active. The second call overwrites `vescMockInterval` with a new handle before the first interval is cleared. `clearBlePollers()` can only cancel the most recently stored handle; the original interval fires forever, accumulating voltage/temp samples and writing to DOM elements even after the user navigates away or starts a new ride.

The bug is reproducible by tapping "Connect VESC (Mock)" twice before starting a ride.

**Fix:**
```javascript
window.connectVESCMock = function() {
  if (vescMockInterval) return; // already running -- ignore re-tap
  bleConnected = true;
  setBleStatus('connected', 'VESC Mock');
  toast('VESC mock connected');
  let t = 0;
  vescMockInterval = setInterval(() => {
    // ... existing body ...
  }, 2000);
}
```

---

### CR-02: `resetRecordPage()` never clears `vescMockInterval` — interval leaks on Discard

**File:** `index.html:961-974`

**Issue:** `discardRide()` calls `resetRecordPage()` directly. `resetRecordPage()` hides the VESC row and nulls `vescVoltage`, but it never calls `clearBlePollers()`. The `vescMockInterval` handle is still live and continues firing every 2 seconds, writing to DOM elements (`vesc-live-battery`, `live-voltage`, etc.) and updating module-level state (`boardBattery`, `boardTempF`, `vescVoltage`, `topSpeedMph`).

Contrast with `stopRecording()` (line 894), which correctly calls `clearBlePollers()` before showing the save page — `discardRide()` skips that call entirely.

After discard, if the user starts a new Onewheel ride, the leaked VESC mock will continue to set `vescVoltage` (non-null), causing `timerInterval` to fill `_vescVoltageSamples` with spurious data that gets saved to Firestore under the Onewheel ride document.

**Fix:**
```javascript
function resetRecordPage() {
  document.getElementById('pre-ride').style.display = 'block';
  document.getElementById('active-ride').style.display = 'none';
  document.querySelectorAll('.board-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('start-btn').disabled = true;
  document.getElementById('gps-status').textContent = 'Select a board to begin';
  const bleRow = document.getElementById('ble-row');
  if (bleRow) { bleRow.style.display = 'none'; setBleStatus('idle'); }
  const vescRow = document.getElementById('vesc-connect-row');
  if (vescRow) vescRow.style.display = 'none';
  clearBlePollers();          // <-- ADD: clears vescMockInterval
  vescVoltage = null;
  selectedBoard = { type: null, model: null };
  if (recordMap) { recordMap.remove(); mapInstances = mapInstances.filter(m => m !== recordMap); recordMap = null; }
}
```

---

## Warnings

### WR-01: `avgMotorTemp` written to Firestore for Onewheel rides

**File:** `index.html:829-830` and `index.html:933-935`

**Issue:** `window._tempSamples` accumulates `boardTempF` whenever it is non-null, regardless of `selectedBoard.type`. For a Onewheel ride, `boardTempF` is populated by `onTempData()` via BLE. The accumulation loop runs unconditionally:

```javascript
if (boardTempF != null) window._tempSamples.push(boardTempF);
```

`confirmSave()` then saves this as `avgMotorTemp` — a VESC-specific field concept — on every ride type. Onewheel temperature is controller/FET temperature, not motor temperature. The field name is semantically wrong for Onewheel rides, and querying `avgMotorTemp != null` will incorrectly match Onewheel documents.

**Fix:** Gate the temperature sample on board type, or rename the field to `avgTempF` for generality:

```javascript
// In timerInterval:
if (boardTempF != null && selectedBoard.type === 'vesc') window._tempSamples.push(boardTempF);

// Or, rename in confirmSave():
avgBoardTemp: (window._tempSamples && window._tempSamples.length) ? ... : null,
```

---

### WR-02: `vescVoltage` module-level variable not reset in `startRecording()`

**File:** `index.html:799-806`

**Issue:** `startRecording()` resets `window._vescVoltageSamples = []` but does not reset the module-level `vescVoltage` variable. If a previous VESC mock run left `vescVoltage` non-null (e.g., ride was saved but `connectVESCMock` was not re-invoked and the interval was stopped cleanly), `vescVoltage` persists with its last value. The new ride's `timerInterval` then pushes that stale value into `_vescVoltageSamples` on the very first tick, before the VESC mock interval has fired any new data, poisoning the average.

**Fix:**
```javascript
// In startRecording(), alongside the other resets:
vescVoltage = null;
```

---

### WR-03: Filter dropdown on Rides page does not include `vesc` option

**File:** `index.html:1598-1603`

**Issue:** The `<select id="filter-board">` has options for `""` (all), `onewheel`, and `euc` — but not `vesc`. VESC rides are always included in "All boards" and can never be filtered to show exclusively. This is a regression in parity: the new board type is first-class for recording but second-class for browsing.

**Fix:**
```html
<select id="filter-board" onchange="loadRides()">
  <option value="">All boards</option>
  <option value="onewheel">Onewheel</option>
  <option value="vesc">VESC</option>
  <option value="euc">EUC</option>
</select>
```

---

### WR-04: `loadProfileStats()` board breakdown misclassifies VESC rides as "EUC"

**File:** `index.html:1030-1032`

**Issue:** The profile breakdown uses:

```javascript
const key = r.boardType === 'onewheel' ? `Onewheel ${r.boardModel||''}`.trim() : 'EUC';
```

Any ride that is not `onewheel` — including `vesc` — is bucketed under `'EUC'`. A user with both VESC and EUC rides will see a single inflated "EUC" count mixing the two board types.

**Fix:**
```javascript
const key = r.boardType === 'onewheel'
  ? `Onewheel ${r.boardModel || ''}`.trim()
  : r.boardType === 'vesc' ? 'VESC'
  : 'EUC';
```

---

### WR-05: `connectVESCMock()` sets `bleConnected = true` but mock can never be disconnected by the user

**File:** `index.html:758-782`

**Issue:** After `connectVESCMock()` runs, `bleConnected` is `true` and `setBleStatus('connected', 'VESC Mock')` is called. However, there is no disconnect path for the VESC mock: `connectBLE()` guards on `!navigator.bluetooth` and uses `navigator.bluetooth.requestDevice(...)` — it is not reachable for VESC. The VESC connect button (`vesc-btn`) calls only `connectVESCMock()`, with no toggle-to-disconnect behavior.

If the user wants to switch boards after connecting VESC mock (without starting a ride), they cannot: the "Connect VESC (Mock)" button will fire a second mock interval (see CR-01). The only clean exit is starting and stopping/discarding a ride.

**Fix:** Add a toggle in `connectVESCMock()`:

```javascript
window.connectVESCMock = function() {
  if (vescMockInterval) {
    clearInterval(vescMockInterval);
    vescMockInterval = null;
    bleConnected = false;
    vescVoltage = null;
    setBleStatus('idle');
    toast('VESC mock disconnected');
    return;
  }
  // ... existing connect logic ...
}
```

---

## Info

### IN-01: App version badge in topbar is stale (shows "v20", SW is at v31)

**File:** `index.html:1536`

**Issue:** The visible version label in the topbar reads `v20` while `sw.js` is at `ridelogger-v31`. The badge was not updated across the 11 SW version bumps since it was introduced. This is cosmetic but misleading for support/debug purposes.

**Fix:**
```html
<span style="font-size:0.65rem;color:var(--text3);font-family:var(--font-mono);">v31</span>
```

---

### IN-02: `'VESC'` board label injected into innerHTML without `escHtml()` — inconsistent escaping

**File:** `index.html:271` and `index.html:319`

**Issue:** In both `renderRidesList()` and `openRide()`, the `onewheel` branch wraps its label in `escHtml()` but the `vesc` and `euc` branches inject hardcoded string literals directly:

```javascript
: r.boardType === 'vesc' ? 'VESC'
: 'EUC';
```

This is not exploitable (the values are hardcoded, not user-controlled), but it is inconsistent with the escaping pattern used throughout. If this ternary is ever extended to include a user-controlled value (e.g., a custom board name field) the escaping would be missing.

**Fix:** For consistency, wrap all branches:
```javascript
const boardLabel = r.boardType === 'onewheel'
  ? escHtml(`OW ${r.boardModel || ''}`.trim())
  : r.boardType === 'vesc' ? escHtml('VESC')
  : escHtml('EUC');
```

---

_Reviewed: 2026-05-13_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
