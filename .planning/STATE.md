# Project State

## Current Status
- Phase: 2
- Phase name: Encoding Fix & Deploy
- Status: Ready to execute
- Plans: 1 (02-01-encoding-sweep)

## Project Reference
See: .planning/PROJECT.md (updated 2026-05-12)

**Core value**: A connected ride with accurate, readable telemetry
**Current focus**: Phase 2 — Encoding Fix & Deploy

## Current Position

| Field | Value |
|-------|-------|
| Milestone | Bug Fix |
| Phase | 2 of 2 |
| Plan | 02-01 (1 of 1) |
| Status | Ready to execute |
| Progress | [-----     ] 0% |

## Performance Metrics

| Metric | Value |
|--------|-------|
| Requirements total | 9 |
| Requirements complete | 0 |
| Phases complete | 0/2 |

## Accumulated Context

### Key Decisions
- Auth guard uses `OW_GT_MODELS` set (GT/GTS/GTS-XL only) — Pint/XR/XR-C skip auth
- Encoding fix targets all non-ASCII bytes: HTML entities in markup, Unicode escapes in script blocks
- SW cache version must be bumped on every deploy (Phase 1 used ridelogger-v21 → Phase 2 targets ridelogger-v22)

### Known Risks
- Physical Pint board required for end-to-end BLE validation; no emulator
- Encoding fix must be exhaustive — partial sweep leaves residual garbled characters
- XR/XR-C auth behavior assumed same as Pint (no auth) but not independently verified (v2 item)

### Blockers
None

## Session Continuity

Last updated: 2026-05-12
Next action: Execute Phase 2 via `/gsd-execute-phase 2`
