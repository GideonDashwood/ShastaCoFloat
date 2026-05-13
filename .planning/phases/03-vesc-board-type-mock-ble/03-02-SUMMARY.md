---
phase: 03-vesc-board-type-mock-ble
plan: "02"
subsystem: vesc-ride-save, board-labels, interval-cleanup
tags: [vesc, firestore, ride-save, board-labels, interval-cleanup, sw-bump]
dependency_graph:
  requires: [03-01-PLAN.md]
  provides: [vescVoltage-accumulation, avgMotorTemp-accumulation, vesc-save-title, vesc-board-labels, clearBlePollers-in-stopRecording, resetRecordPage-vesc-cleanup]
  affects: [index.html, sw.js]
tech_stack:
  added: []
  patterns: [sample-accumulation, titleMap-object, averaged-firestore-fields]
key_files:
  created: []
  modified:
    - index.html
    - sw.js
decisions:
  - vescVoltage and avgMotorTemp are averages over samples collected each second during the ride (null if no samples)
  - clearBlePollers() called in stopRecording() before showPage('save') to ensure vescMockInterval is always cleared on ride end
  - titleMap object used instead of ternary chain for clean extension to future board types
  - SW bumped to ridelogger-v31 (deviation: plan specified v30, but Plan 01 already consumed v30)
metrics:
  duration: "~10 min"
  completed: 2026-05-13
  tasks_completed: 2
  tasks_total: 2
  files_modified: 2
---

# Phase 3 Plan 02: VESC Ride Save + Board Labels + Interval Cleanup Summary

Wired VESC voltage and temperature sample accumulation during recording, fixed the save screen title for VESC rides, added vescVoltage and avgMotorTemp averaged fields to the Firestore write, labelled VESC rides correctly in the rides list and detail modal, cleared the mock interval on ride stop, and reset VESC UI state on ride end. SW cache bumped to ridelogger-v31.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Wire vescVoltage+avgMotorTemp accumulation, fix stopRecording, extend confirmSave, fix board labels, fix resetRecordPage | 0682a3a | index.html |
| 2 | Bump SW cache version to v31, commit, and push | 0682a3a | sw.js |

(Tasks 1 and 2 committed together per plan task 2 instruction: "Both index.html and sw.js must be in the same commit".)

## Edits Applied to index.html

| Edit | Location | Description |
|------|----------|-------------|
| 1 | Line ~805-806 | Added `window._vescVoltageSamples = []` and `window._tempSamples = []` after `window._dutyMax = dutyMax` in `startRecording()` initialisation block |
| 2 | Line ~829-830 | Added `_vescVoltageSamples.push(vescVoltage)` and `_tempSamples.push(boardTempF)` in `timerInterval` callback |
| 3 | Line ~894 | Added `clearBlePollers()` call immediately before `showPage('save')` in `stopRecording()` |
| 4 | Line ~895-897 | Replaced single ternary save-title assignment with `_titleMap` object supporting `vesc: 'VESC ride'` |
| 5 | Line ~930-936 | Added `vescVoltage` and `avgMotorTemp` averaged fields to `confirmSave()` `addDoc` object |
| 6 | Line ~269-272 | Added VESC branch to `renderRidesList()` boardLabel (`r.boardType === 'vesc' ? 'VESC'`) |
| 7 | Line ~317-320 | Added VESC branch to `openRide()` boardLabel (`ride.boardType === 'vesc' ? 'VESC'`) |
| 8 | Line ~969-970 | Added `vesc-connect-row` hide logic in `resetRecordPage()` |
| 9 | Line ~971 | Added `vescVoltage = null` in `resetRecordPage()` to clear voltage state on ride reset |

## sw.js Change

- Bumped `const CACHE = 'ridelogger-v30'` to `const CACHE = 'ridelogger-v31'`

## Deviations from Plan

### SW Version Bump (Deviation — cascaded from Plan 01 deviation)

**Rule applied:** Deviation noted in orchestrator prompt before execution.

**Found during:** Task 2 — reading sw.js confirmed it was already at `ridelogger-v30` (Plan 01 had bumped from v29 to v30 due to its own pre-existing state deviation).

**Issue:** This plan specified bumping SW from `ridelogger-v29` to `ridelogger-v30`. However, sw.js was already at `ridelogger-v30` at the start of this plan (Plan 01 consumed v30 instead of the planned v28->v29 due to a prior security commit at v29).

**Fix:** Bumped SW from `ridelogger-v30` to `ridelogger-v31`.

**Files modified:** sw.js

**Impact:** None — SW version is monotonically increasing; v31 works identically to the planned v30.

## VESC Requirements Status

| Requirement | Status | Notes |
|-------------|--------|-------|
| VESC-01: VESC in board picker and selectable | DONE | Plan 01 |
| VESC-02: Mock BLE connect with sinusoidal telemetry at 2s | DONE | Plan 01 |
| VESC-03: vesc-stats-row visible with all 4 values updating | DONE | Plan 01 + this plan (voltage accumulation) |
| VESC-04: confirmSave writes boardType:'VESC' + vescVoltage + avgMotorTemp | DONE | This plan |
| VESC-05: Stub comment block with NUS UUIDs in connectVESCMock | DONE | Plan 01 |
| Interval leak closed: clearBlePollers() in stopRecording() | DONE | This plan (T-03-05 mitigated) |
| SW bump: ridelogger-v31 (planned v30) | DONE | This plan |
| Commit + push: feature branch updated | DONE | Commit 0682a3a pushed to feature/ridelogger-scaffold |

## Threat Model Compliance

- **T-03-03 (Tampering — vescVoltage):** Accepted. `vescVoltage` is computed from mock interval averages with no user-controlled input.
- **T-03-04 (Info Disclosure — boardType):** Accepted. `boardType` is the app-controlled constant `'vesc'`; no PII.
- **T-03-05 (DoS — vescMockInterval not cleared):** Mitigated. `clearBlePollers()` is now called inside `stopRecording()` before `showPage('save')` — clears `vescMockInterval` on every ride-end path.
- **T-03-06 (Tampering — avgMotorTemp):** Accepted. Value computed from `boardTempF` set by mock interval; no user-controlled input.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| `connectVESCMock` entire function | index.html | ~737 | Mock implementation — real VESC BLE protocol (NUS) not yet wired; stub comment documents the real protocol path (carried from Plan 01) |

## Threat Flags

No new trust boundary surfaces introduced beyond what the plan's threat model documents.

## Self-Check

- [x] index.html: 9 edits applied — all grep patterns match
- [x] sw.js: bumped to ridelogger-v31 (confirmed by Select-String)
- [x] Commit 0682a3a exists on feature/ridelogger-scaffold
- [x] Both index.html and sw.js included in commit (2 files changed, 25 insertions, 4 deletions)
- [x] git push completed successfully (remote: feature/ridelogger-scaffold updated)
- [x] clearBlePollers() confirmed at line 894 (inside stopRecording) — T-03-05 mitigated
- [x] _vescVoltageSamples, _tempSamples, avgMotorTemp, _titleMap, vesc->VESC branches all confirmed via grep

## Self-Check: PASSED
