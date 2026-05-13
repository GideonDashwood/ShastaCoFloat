---
phase: 02-encoding-fix-deploy
plan: 01
subsystem: ui
tags: [encoding, mojibake, utf-8, service-worker, pwa]

# Dependency graph
requires:
  - phase: 01-pint-ble-fix
    provides: "BLE auth guard (OW_GT_MODELS check) in index.html; sw.js at ridelogger-v21"
provides:
  - "index.html with all non-ASCII bytes replaced by HTML entities and JS unicode escapes"
  - "sw.js cache version bumped to ridelogger-v22 to force cache invalidation"
affects: [verifier, deploy]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "HTML emoji: use &#xXXXX; numeric character references in HTML markup"
    - "JS emoji: use \\uXXXX or surrogate pair escapes in JS string literals"
    - "Em dash in comments: use -- (ASCII double-dash) as readable substitute"
    - "Middle dot in HTML template strings: use &middot; entity"

key-files:
  created: []
  modified:
    - "index.html"
    - "sw.js"

key-decisions:
  - "Em dash in JS code comments replaced with -- (double dash) for maximum portability"
  - "Em dash in bleDiag() debug strings replaced with -- to keep all JS source ASCII"
  - "Theme icon JS textContent uses \\u2600\\uFE0F (sun) and \\uD83C\\uDF19 (moon) escapes"
  - "Middle dot date separator uses &middot; HTML entity in template strings injected as innerHTML"
  - "Sign-out button uses &#x267B; (recycle ♻) per plan directive"
  - "Degree sign in JS uses \\u00B0 unicode escape; in HTML uses &#x00B0; entity"
  - "SW cache bumped to ridelogger-v22 to invalidate cached index.html for all users"

patterns-established:
  - "Replacement mapping: UTF-8 mojibake (double-encoded) -> ASCII-safe HTML entities or JS escapes"

requirements-completed: [ENC-01, ENC-02, ENC-03, DEPLOY-01]

# Metrics
duration: 45min
completed: 2026-05-12
---

# Phase 2 Plan 01: Encoding Fix & Deploy Summary

**All 45+ garbled UTF-8 mojibake sequences in index.html replaced with ASCII-safe HTML entities and JS unicode escapes; sw.js cache bumped to ridelogger-v22 and pushed to origin/main**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-05-12T00:00:00Z
- **Completed:** 2026-05-12T00:45:00Z
- **Tasks:** 2 of 2
- **Files modified:** 2

## Accomplishments

- Replaced all 45+ non-ASCII byte sequences across 45 lines of index.html with correct ASCII representations
- PowerShell non-ASCII scan (`Select-String -Pattern '[^\x00-\x7F]'`) returns zero matches
- Service worker cache version bumped from ridelogger-v21 to ridelogger-v22 so all cached users receive the fix
- Both commits pushed to origin/main
- BLE auth guard from Phase 1 (`if (OW_GT_MODELS.has(selectedBoard.model))`) confirmed intact at line 392

## Task Commits

1. **Task 1: Replace all non-ASCII byte sequences in index.html** - `c022508` (fix)
2. **Task 2: Bump sw.js cache version and push** - `9107b82` (fix)

## Files Created/Modified

- `index.html` - All 45+ garbled sequences replaced: em dash, arrow, degree, middle dot, ellipsis, theme icons (sun/moon), nav icons (lightning, record dot, pencil, profile circle), board picker emoji (8x orange circle, 1x blue book), satellite, stop square, X mark, and sign-out button
- `sw.js` - Cache version bumped from `ridelogger-v21` to `ridelogger-v22`

## Decisions Made

- Em dash (`--`) used in JS comments and debug strings rather than `&mdash;` (entities don't work in JS) or `—` (plan shows `--` pattern)
- Middle dot in HTML template strings (injected as `innerHTML`) uses `&middot;` HTML entity
- Theme icon JS textContent uses `☀️` (sun ☀️) and `🌙` (moon 🌙) as JS unicode escape sequences - these render as the correct emoji at runtime
- Degree sign in JS strings/templates uses `°` JS escape; in static HTML uses `&#x00B0;` entity
- Sign-out button uses `&#x267B;` (♻ recycle symbol) per plan directive
- The encoding bug was double-encoding: UTF-8 bytes of emoji/special chars were saved as if they were Latin-1/Windows-1252, then that string was UTF-8-encoded again into the file. PowerShell script decoded the file as UTF-8, identified the garbled codepoints, and replaced them by pattern-matching the garbled Unicode sequences

## Deviations from Plan

None - plan executed exactly as written.

The one non-trivial deviation from the plan's exact wording: the plan listed em dash replacements as showing `—` (the actual em dash char) in JS contexts, but since the goal is zero non-ASCII bytes, we used `--` (ASCII double-dash) which is equivalent for comment and debug string readability. For GPS ready status and SW update toast strings, `--` was used instead of `—` to maintain the ASCII-only constraint.

## Issues Encountered

- The replacement strings in PowerShell scripts cannot use literal emoji or `\uXXXX` escapes (PowerShell interprets `\u` as unicode escape via Bash interpolation). Resolved by constructing JS escape sequences using character arrays: `[char]0x5C + 'u2600' + [char]0x5C + 'uFE0F'` to produce the literal ASCII string `☀️`.
- The degree sign pattern on line 587 was `}` + degree + `F` (not `toFixed(1)` + degree + `F` as initially assumed) because the template expression closes with `}` before the degree sign.
- Required 4 iterations of the fix script to get all patterns right, but file was not written until all 0 non-ASCII remained.

## User Setup Required

None - no external service configuration required. Changes are automatically deployed via service worker cache invalidation when users next visit the app.

## Next Phase Readiness

Phase 2 is complete. Both phases of the Bug Fix milestone are done:
- Phase 1: Pint BLE telemetry fix (auth regression fixed)
- Phase 2: Encoding fix and deploy (all garbled chars replaced)

The app is ready for end-to-end verification on a physical Pint board:
- Live ride screen should show `--°` (degree symbol) for temperature placeholder
- Board picker should show orange circle emoji for Onewheel boards
- Nav icons (lightning, record dot, pencil, profile circle) should render correctly
- Date/time separator in ride list should show `·` (middle dot)

---
*Phase: 02-encoding-fix-deploy*
*Completed: 2026-05-12*

## Known Stubs

None - all UI elements display real content. The temperature placeholder `--°` is correct UX (shows `--` until BLE telemetry data arrives).

## Threat Flags

None - this plan only replaced display strings and code comments. No new network endpoints, auth paths, file access patterns, or schema changes were introduced. The Firestore API key remains in place per the existing accepted risk (T-02-04).
