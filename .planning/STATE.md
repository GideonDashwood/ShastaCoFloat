# Project State

## Current Status
- Phase: 1
- Phase name: Pint BLE Telemetry Fix
- Status: not started

## Project Reference
See: .planning/PROJECT.md (updated 2026-05-12)

**Core value**: A connected ride with accurate, readable telemetry
**Current focus**: Phase 1 — Pint BLE Telemetry Fix

## Current Position

| Field | Value |
|-------|-------|
| Milestone | Bug Fix |
| Phase | 1 of 2 |
| Plan | None yet |
| Status | Not started |
| Progress | [----------] 0% |

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
- SW cache version must be bumped on every deploy (currently `ridelogger-v20` → next: `ridelogger-v21`)

### Known Risks
- Physical Pint board required for end-to-end BLE validation; no emulator
- Encoding fix must be exhaustive — partial sweep leaves residual garbled characters
- XR/XR-C auth behavior assumed same as Pint (no auth) but not independently verified (v2 item)

### Blockers
None

## Session Continuity

Last updated: 2026-05-12
Next action: Plan Phase 1 via `/gsd-plan-phase 1`
