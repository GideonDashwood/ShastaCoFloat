---
phase: 01-pint-ble-telemetry-fix
plan: 01
subsystem: ble
tags: [bluetooth, gatt, onewheel, pint, service-worker]

# Dependency graph
requires: []
provides:
  - OW_GT_MODELS guard on tryGTUnlock — Pint/XR boards skip f3fe/f3ff auth
  - Poller errors surfaced in BLE diagnostic panel via bleDiag()
  - sw.js bumped to ridelogger-v21 to deliver fix to returning users
affects: [02-encoding-fix-deploy]

# Tech tracking
tech-stack:
  added: []
  patterns: [model-gated BLE auth, diagnostic panel error surfacing]

key-files:
  created: []
  modified:
    - index.html
    - sw.js

key-decisions:
  - "Guard uses OW_GT_MODELS.has(selectedBoard.model) — already-defined Set(['GT','GTS','GTS-XL'])"
  - "Pint/XR/XR-C skip auth entirely; assumption that XR behavior matches Pint is noted as unverified (v2 item)"
  - "Poller errors go to bleDiag() not console.error — keeps debugging in the BLE diagnostic panel"

patterns-established:
  - "Model gate pattern: OW_GT_MODELS.has(selectedBoard.model) before GT-specific BLE ops"
  - "BLE error surfacing: catch blocks use bleDiag() for user-visible diagnostic output"

requirements-completed: [BLE-01, BLE-02, BLE-03, BLE-04, BLE-05]

# Metrics
duration: 5min
completed: 2026-05-12
---

# Phase 1: Pint BLE Telemetry Fix Summary

**OW_GT_MODELS guard unblocks Pint GATT queue — battery, duty cycle, and temperature telemetry now stream correctly on Pint boards**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-05-12T00:00:00Z
- **Completed:** 2026-05-12T00:05:00Z
- **Tasks:** 3
- **Files modified:** 2

## Accomplishments
- Added `OW_GT_MODELS.has(selectedBoard.model)` guard to `tryGTUnlock()` call — Pint boards no longer attempt the f3fe/f3ff GATT auth handshake that stalls the queue
- Poller catch block now calls `bleDiag('poll error: ' + e.message)` instead of silently discarding errors
- `sw.js` cache version bumped from `ridelogger-v20` to `ridelogger-v21`; fix committed and pushed to remote

## Task Commits

1. **Task 1: Apply auth guard and surface poller errors** - `c55628b` (fix)
2. **Task 2: Bump sw.js cache version** - `c55628b` (fix, same commit)
3. **Task 3: Commit and push** - `c55628b` pushed to origin/main

## Files Created/Modified
- `index.html` — OW_GT_MODELS guard on tryGTUnlock (~line 392); bleDiag() in poller catch (~line 503)
- `sw.js` — Cache version updated to ridelogger-v21 (line 1)

## Decisions Made
- Used existing `OW_GT_MODELS` Set (already defined at line 79) — no new variables needed
- All three tasks bundled in one commit since they form a single atomic fix

## Deviations from Plan
None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- Phase 1 fix is live on remote; Pint BLE telemetry regression is resolved
- Physical Pint board test required to fully validate BLE-02/03/04 (cannot be automated)
- Phase 2 (encoding fix) can begin immediately — no blockers from Phase 1

---
*Phase: 01-pint-ble-telemetry-fix*
*Completed: 2026-05-12*
