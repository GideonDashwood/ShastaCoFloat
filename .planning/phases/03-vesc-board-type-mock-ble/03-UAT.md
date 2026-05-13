---
status: complete
phase: 03-vesc-board-type-mock-ble
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: 2026-05-13T00:00:00Z
updated: 2026-05-13T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. VESC board button in picker
expected: Board picker shows a VESC option (lightning bolt icon) alongside Onewheel and EUC. Tapping it highlights it as selected.
result: pass

### 2. vesc-connect-row appears on VESC select
expected: After selecting the VESC board, a "Connect VESC (Mock)" button row appears below the board picker (similar to how the BLE row appears for Onewheel). No such row appears when Onewheel or EUC is selected.
result: pass

### 3. Mock connect — status and toast
expected: Clicking "Connect VESC (Mock)" shows a toast "VESC mock connected" and the BLE status indicator changes to connected/green showing "VESC Mock". The Start Ride button becomes enabled.
result: issue
reported: "Toast appears and Start Ride becomes enabled, but BLE status indicator does not turn green"
severity: major

### 4. Live telemetry updates during recording
expected: After starting a VESC ride, the VESC stats row shows battery %, duty cycle, motor temp, and voltage. All four values change (oscillate) approximately every 2 seconds — they are not static zeros.
result: pass

### 5. Disconnect toggle
expected: While VESC mock is connected (but before starting a ride), clicking "Connect VESC (Mock)" again disconnects — shows toast "VESC mock disconnected", BLE status returns to idle, and the button resets. Clicking once more reconnects.
result: issue
reported: "Selecting Connect VESC (Mock) again only shows 'connected' toast again — no disconnect occurs"
severity: major

### 6. Stop recording — save screen title
expected: Starting a VESC ride and pressing Stop shows the save screen with title "VESC ride" (not "Onewheel ride" or "EUC ride").
result: pass

### 7. Discard ride — clean state
expected: Starting a VESC ride and pressing Discard (instead of Save) returns to the board picker with no lingering telemetry. The vesc-stats-row values are no longer updating in the background. Selecting a board and starting a new ride works normally.
result: pass

### 8. Saved VESC ride shows VESC label in rides list
expected: After saving a VESC ride, it appears in the Rides list with a "VESC" board label (not "EUC" or blank).
result: pass

### 9. VESC filter in rides dropdown
expected: The "Filter by board" dropdown on the Rides page includes a "VESC" option. Selecting it shows only VESC rides; selecting "All boards" shows everything again.
result: issue
reported: "VESC option does not appear in the filter dropdown"
severity: major

## Summary

total: 9
passed: 6
issues: 3
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "BLE status indicator turns green and button reads 'Disconnect VESC (Mock)' after connecting"
  status: fixed
  reason: "User reported: dot did not turn green and button text did not change"
  fix: "vesc-dot and vesc-btn updated directly in connectVESCMock() — commits b7d17fa, d6d898a"
  confirmed: true
  severity: major
  test: 3

- truth: "Clicking Connect VESC (Mock) while already connected disconnects — toast 'VESC mock disconnected', status returns to idle"
  status: fixed
  reason: "User reported: second tap showed 'connected' toast again — toggle not deployed"
  fix: "WR-05 disconnect toggle (commit 098f081) pushed to remote — now live on Vercel preview"
  confirmed: true
  severity: major
  test: 5

- truth: "Filter by board dropdown includes a VESC option that shows only VESC rides when selected"
  status: fixed
  reason: "User reported: VESC option did not appear — WR-03 fix not deployed"
  fix: "WR-03 filter option (commit 344e57d) pushed to remote — now live on Vercel preview"
  confirmed: true
  severity: major
  test: 9
