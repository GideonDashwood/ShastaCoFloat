---
phase: 03-vesc-board-type-mock-ble
plan: "01"
subsystem: board-type-selection, ble-mock, live-telemetry
tags: [vesc, ble, mock, telemetry, board-picker]
dependency_graph:
  requires: []
  provides: [vesc-board-button, vesc-connect-row, vesc-stats-row, connectVESCMock]
  affects: [index.html, sw.js]
tech_stack:
  added: []
  patterns: [mock-interval-telemetry, board-type-conditional-display]
key_files:
  created: []
  modified:
    - index.html
    - sw.js
decisions:
  - connectVESCMock uses setInterval at 2s with sinusoidal mock data per RESEARCH.md ranges
  - vescMockInterval cleared in existing clearBlePollers() to satisfy T-03-01 DoS threat mitigation
  - vesc-stats-row placed immediately after ble-stats-row for consistent UI layout
metrics:
  duration: "~15 min"
  completed: 2026-05-13
  tasks_completed: 3
  tasks_total: 3
  files_modified: 2
---

# Phase 3 Plan 01: VESC Board Type + Mock BLE Summary

Added VESC as a selectable board type with mock BLE connection that drives live sinusoidal telemetry (battery, duty cycle, motor temp, voltage) updating every 2 seconds during an active ride.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add VESC board button, connect row HTML, and state variables | 6ee1ab4 | index.html |
| 2 | Implement connectVESCMock() function with stub comment block | 6ee1ab4 | index.html |
| 3 | Bump SW cache version and commit Plan 01 changes | 6ee1ab4 | sw.js |

(Tasks 1-3 were committed together per plan task 3 instruction: "commit both files together".)

## Edits Applied to index.html

| Edit | Location (post-edit line) | Description |
|------|--------------------------|-------------|
| 1 | Line 65-66 | Added `let vescMockInterval = null;` and `let vescVoltage = null;` after `bleKeepAlive` declaration |
| 2 | Line 689 | Added `vescMockInterval` clear guard inside `clearBlePollers()` |
| 3 | Lines 786-787 | Added `vesc-connect-row` show/hide logic inside `selectBoard()` |
| 4 | Lines 804-805 | Added `vesc-stats-row` show/hide logic inside `startRecording()` |
| 5 | Lines 1641-1644 | Added VESC board-card button (lightning bolt icon) to board-grid after EUC button |
| 6 | Lines 1658-1662 | Added `vesc-connect-row` div with `connectVESCMock()` button after `ble-row` div |
| 7 | Lines 1726-1741 | Added `vesc-stats-row` div with 4 telemetry cells after `ble-stats-row` div |
| 8 | Lines 737-783 | Inserted `connectVESCMock()` function body before `selectBoard()` (Task 2 edit) |

## connectVESCMock() Function Details

- Assigned to `window.connectVESCMock`
- Sets `bleConnected = true`, calls `setBleStatus('connected', 'VESC Mock')`, calls `toast('VESC mock connected')`
- Assigns `vescMockInterval = setInterval(callback, 2000)`
- Callback updates: `boardBattery`, `boardDutyCycle`, `boardTempF`, `boardSpeedMph`, `vescVoltage`
- Writes to 6 DOM IDs: `vesc-live-battery`, `vesc-live-duty`, `vesc-live-temp`, `live-voltage`, `live-speed`, `live-topspeed`
- Contains stub comment block with all 3 NUS UUIDs (6e400001, 6e400002, 6e400003) and COMM_GET_VALUES parse guide

## Deviations from Plan

### SW Version Bump (Deviation — pre-existing state)

**Rule applied:** Deviation noted in orchestrator prompt before execution.

**Found during:** Task 3 — reading sw.js before editing.

**Issue:** The plan specified bumping SW from `ridelogger-v28` to `ridelogger-v29`. However, sw.js already read `ridelogger-v29` at the start of this plan. This version was bumped by a prior security commit (`9fc253d security: rotate leaked Firebase API key, bump SW to v29`).

**Fix:** Bumped SW from `ridelogger-v29` to `ridelogger-v30` instead of the planned v28 -> v29.

**Files modified:** sw.js

**Impact on Plan 02:** Plan 02 should bump from `ridelogger-v30` to `ridelogger-v31` (instead of the planned v29 -> v30).

## Threat Model Compliance

- **T-03-01 (DoS — vescMockInterval):** Mitigated. `clearBlePollers()` now includes `if (vescMockInterval) { clearInterval(vescMockInterval); vescMockInterval = null; }`. The existing `stopRecording()` calls `clearBlePollers()`, so the interval is always cleaned up when a ride ends.
- **T-03-02 (Tampering — mock telemetry):** Accepted as planned. Values are hardcoded sinusoids with no user-controlled input.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `connectVESCMock` entire function | index.html | ~737 | Mock implementation — real VESC BLE protocol (NUS) not yet wired; stub comment documents the real protocol path |

The stub is intentional and expected. The plan goal (visible, testable mock telemetry end-to-end) is fully achieved. Real VESC BLE wiring is deferred to a future plan when a physical VESC board is available.

## Threat Flags

No new trust boundary surfaces introduced beyond what the plan's threat model documents. The mock interval writes only to DOM spans (no network endpoints, no Firestore calls, no user input paths).

## Self-Check

- [x] index.html modified with all 8 edits
- [x] sw.js bumped to ridelogger-v30
- [x] Commit 6ee1ab4 exists on feature/ridelogger-scaffold
- [x] All 6 grep patterns match in index.html
- [x] ridelogger-v30 confirmed in sw.js
