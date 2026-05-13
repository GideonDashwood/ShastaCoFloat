---
phase: 03-vesc-board-type-mock-ble
fixed_at: 2026-05-13T00:00:00Z
review_path: .planning/phases/03-vesc-board-type-mock-ble/03-REVIEW.md
iteration: 1
findings_in_scope: 7
fixed: 7
skipped: 0
status: all_fixed
---

# Phase 3: Code Review Fix Report

**Fixed at:** 2026-05-13
**Source review:** .planning/phases/03-vesc-board-type-mock-ble/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 7 (2 critical, 5 warnings)
- Fixed: 7
- Skipped: 0

## Fixed Issues

### CR-01: vescMockInterval leaks on double-click

**Files modified:** `index.html`, `sw.js`
**Commit:** cee917b
**Applied fix:** Added `if (vescMockInterval) return;` guard at the top of `connectVESCMock()`, immediately before the TODO comments. This was later superseded by WR-05's full toggle implementation.

---

### CR-02: resetRecordPage() never clears vescMockInterval

**Files modified:** `index.html`, `sw.js`
**Commit:** d25593d
**Applied fix:** Added `clearBlePollers();` call inside `resetRecordPage()` immediately before `vescVoltage = null;`. `clearBlePollers()` was confirmed to already handle `vescMockInterval` at its line 695. This ensures the mock interval stops when a ride is discarded.

---

### WR-01: avgMotorTemp written to Firestore for all board types

**Files modified:** `index.html`, `sw.js`
**Commit:** 4cdd590
**Applied fix:** Changed the temperature accumulation line in `timerInterval` from `if (boardTempF != null)` to `if (boardTempF != null && selectedBoard.type === 'vesc')`. This prevents Onewheel controller temperature from being stored as `avgMotorTemp`, a semantically VESC-specific field.

---

### WR-02: vescVoltage not reset in startRecording()

**Files modified:** `index.html`, `sw.js`
**Commit:** 9a441c6
**Applied fix:** Added `vescVoltage = null;` to the reset line in `startRecording()` alongside `boardBattery = null; boardTempF = null; boardDutyCycle = null;`. Prevents stale voltage from a prior session poisoning the first `_vescVoltageSamples` tick.

---

### WR-03: Filter dropdown missing VESC option

**Files modified:** `index.html`, `sw.js`
**Commit:** 344e57d
**Applied fix:** Added `<option value="vesc">VESC</option>` between the Onewheel and EUC options in the `#filter-board` select element (line ~1603). VESC rides can now be filtered to display exclusively.

---

### WR-04: loadProfileStats() misclassifies VESC as EUC

**Files modified:** `index.html`, `sw.js`
**Commit:** 46c0db5
**Applied fix:** Expanded the single ternary `r.boardType === 'onewheel' ? ... : 'EUC'` to a chained ternary that checks for `'vesc'` first, falling through to `'EUC'` only for genuinely unrecognized board types. VESC rides now appear as a separate bucket in the profile board breakdown.

---

### WR-05: connectVESCMock() has no disconnect path

**Files modified:** `index.html`, `sw.js`
**Commit:** 098f081
**Applied fix:** Replaced the simple `return` guard from CR-01 with a full disconnect toggle. When `vescMockInterval` is already set, the function now clears the interval, nulls the handle, sets `bleConnected = false`, nulls `vescVoltage`, calls `setBleStatus('idle')`, and shows a "VESC mock disconnected" toast before returning. This gives users a clean way to disconnect without starting and discarding a ride.

Note: SW version was bumped separately for each fix (v32 through v38) per project convention.

---

_Fixed: 2026-05-13_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
