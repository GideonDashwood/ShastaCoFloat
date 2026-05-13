---
phase: 02-encoding-fix-deploy
verified: 2026-05-12T21:45:00Z
status: human_needed
score: 4/5 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Open the app in Chrome on a phone, navigate to the live ride screen and confirm the temperature placeholder reads --° (degree symbol visible, not garbled bytes)"
    expected: "Placeholder shows '--°' with a visible degree glyph"
    why_human: "PWA with no automated UI test suite; requires a real browser rendering pass"
  - test: "Open the board picker and confirm all Onewheel board cards show an orange circle emoji and the EUC card shows a blue book emoji"
    expected: "Emoji icons render correctly — not as garbled sequences or empty boxes"
    why_human: "Emoji rendering is font/OS-dependent and cannot be verified by source scan alone"
  - test: "Navigate to the ride list and confirm the date/time separator shows · (middle dot) between date and time"
    expected: "Separator is a visible interpunct '·', not garbled bytes"
    why_human: "Requires browser rendering of innerHTML template that uses &middot;"
  - test: "Tap the nav bar icons (lightning, record dot, pencil, profile circle) and confirm all render as recognizable symbols"
    expected: "All four icons render correctly as their intended glyphs"
    why_human: "Glyph rendering depends on font availability in the browser/OS"
---

# Phase 2: Encoding Fix & Deploy Verification Report

**Phase Goal:** All garbled characters are replaced with correct glyphs throughout the app and the fix is delivered to users via a bumped service worker cache.
**Verified:** 2026-05-12T21:45:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Live ride screen shows correct glyphs (→, °, —) — verifiable via source scan | VERIFIED | `°` at lines 587-588 (JS); `&#x00B0;` at line 1558 (HTML live-temp span); `->` and `--` used for arrows/em-dashes in JS comment/string contexts (HTML entities are invalid there; ASCII substitution is correct) |
| 2 | Ride detail view shows · (middle dot) — verifiable via source scan | VERIFIED | `&middot;` entity present at lines 267 and 314 in template strings injected as innerHTML |
| 3 | Board picker displays emoji icons correctly (&#x1F7E0; in HTML) | VERIFIED (source) / UNCERTAIN (render) | `&#x1F7E0;` at lines 1464-1492 (8 Onewheel cards); `&#x1F4D8;` at line 1496 (EUC); requires human browser test to confirm render |
| 4 | PowerShell scan returns zero matches for non-ASCII bytes | VERIFIED | `Select-String -Path index.html -Pattern '[^\x00-\x7F]'` returned zero output — no non-ASCII bytes remain |
| 5 | Returning users receive the fixed build automatically (sw.js cache version is ridelogger-v22) | VERIFIED | `sw.js` line 1: `const CACHE = 'ridelogger-v22';` confirmed |

**Score:** 4/5 truths fully verified programmatically (truth #3 source-verified, render requires human)

---

### ROADMAP Success Criteria Verification

| # | ROADMAP Success Criterion | Status | Evidence |
|---|--------------------------|--------|----------|
| 1 | Live ride screen shows correct special characters (->, deg, --) with no garbled sequences | VERIFIED | `->` at lines 571, 579, 587; `--` at line 646; `°` at lines 587-588; zero non-ASCII scan |
| 2 | Ride detail view shows correct special characters with no garbled sequences | VERIFIED | `&middot;` at lines 267, 314; zero non-ASCII scan confirms no residual garbling |
| 3 | PowerShell scan returns zero matches | VERIFIED | Scan executed — no output returned |
| 4 | Returning user on Chrome receives fixed build automatically (SW cache version bumped) | VERIFIED | `ridelogger-v22` on line 1 of sw.js; commit `9107b82` on origin/main |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `index.html` | All non-ASCII bytes replaced with HTML entities or JS unicode escapes | VERIFIED | 48 lines changed in commit `c022508`; PowerShell non-ASCII scan returns zero matches; file is pure ASCII |
| `sw.js` | Cache version `ridelogger-v22` on line 1 | VERIFIED | `const CACHE = 'ridelogger-v22';` confirmed at line 1 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| sw.js line 1 | browser cache | CACHE constant version string | WIRED | `ridelogger-v22` present; SW activate handler deletes old caches and claims clients |
| index.html | live-temp display | `boardTempF.toFixed(0) + '°'` | WIRED | Line 588: `document.getElementById('live-temp').textContent = boardTempF.toFixed(0) + '°';` — JS escape confirmed |

---

### Data-Flow Trace (Level 4)

Not applicable — this phase replaces static display strings and code comments. No new data paths were introduced. The degree sign and other glyphs are display-only; data flows (BLE telemetry reads) were established in Phase 1 and are unchanged.

---

### Behavioral Spot-Checks (Step 7b)

This is a no-build PWA served via a service worker. No runnable entry points exist to test without a browser. Spot-checks that can be done statically:

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| `Connecting...` string is ASCII-safe | Pattern search for 'Connecting' at line 630 | `'Connecting...'` — ASCII triple-dot (no non-ASCII ellipsis) | PASS |
| GPS ready string is ASCII-safe | Pattern search for 'GPS ready' at line 646 | `'GPS ready -- tap Start Ride'` — double-dash instead of em dash | PASS |
| SW update toast is ASCII-safe | Pattern search for 'App update ready' at line 1709 | `'App update ready -- will apply after ride ends'` — double-dash | PASS |
| Theme icon JS uses unicode escapes | Pattern search for u2600 at line 105 | `'☀️'` (sun) and `'🌙'` (moon) — correct JS escapes | PASS |

Note on `Connecting...`: The PLAN listed `'Connecting…'` (real ellipsis entity) as the fix target. The actual result is `'Connecting...'` (ASCII triple-dot). This is a valid deviation — the SUMMARY explicitly documents it as intentional (ASCII-only constraint). The non-ASCII scan confirms no garbled ellipsis bytes remain.

---

### Probe Execution

Step 7c: SKIPPED — no probe scripts exist in this repository (`scripts/` directory not present). The phase plan specified PowerShell inline scan commands, which were executed directly.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ENC-01 | 02-01-PLAN.md | Live ride screen displays special characters correctly (→, °, —, emoji where used) | SATISFIED | `°` in JS at lines 587-588; `&#x00B0;` in HTML at line 1558; zero non-ASCII scan |
| ENC-02 | 02-01-PLAN.md | Ride detail view displays special characters correctly | SATISFIED | `&middot;` at lines 267, 314; zero non-ASCII scan |
| ENC-03 | 02-01-PLAN.md | All non-ASCII bytes removed from index.html source (verified by scan) | SATISFIED | PowerShell scan returned zero matches |
| DEPLOY-01 | 02-01-PLAN.md | Service worker cache version bumped so users receive fixed version on next visit | SATISFIED | `ridelogger-v22` at sw.js line 1; commit `9107b82` on origin/main |

No orphaned requirements — all four Phase 2 requirement IDs (ENC-01, ENC-02, ENC-03, DEPLOY-01) are claimed in the plan and verified.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| None | — | — | — | — |

No `TBD`, `FIXME`, `XXX`, placeholder strings, or stub implementations found in the modified files. The SUMMARY correctly notes the temperature placeholder `--°` is intentional UX (shows `--` until BLE telemetry data arrives — not a stub).

---

### Phase 1 BLE Guard Regression Check

**Requirement:** BLE auth guard from Phase 1 must remain intact (PLAN acceptance criterion).

**Result:** VERIFIED — `if (OW_GT_MODELS.has(selectedBoard.model)) await tryGTUnlock(bleService);` is present at line 393. `OW_GT_MODELS` constant (`new Set(['GT', 'GTS', 'GTS-XL'])`) is at line 79. No regression.

---

### Commit Verification

| Commit | Hash | On origin/main | Files Changed | Status |
|--------|------|----------------|---------------|--------|
| fix(02-01): replace all non-ASCII byte sequences in index.html | `c022508` | Yes | `index.html` (48 insertions, 48 deletions) | VERIFIED |
| fix(02-01): bump SW cache version to ridelogger-v22 | `9107b82` | Yes | `sw.js` (1 insertion, 1 deletion) | VERIFIED |

Note: Two subsequent docs commits (`7c19ddb`, `ab20fe2`) exist on local main but have not been pushed to origin/main. These are tracking/documentation files — not code changes. The substantive fix commits are on origin/main.

---

### Human Verification Required

The following items require a real browser and (where noted) a physical device to confirm.

#### 1. Live Temperature Placeholder Glyph

**Test:** Open the PWA in Chrome. Navigate to the Live Ride screen (without connecting a board). Observe the temperature placeholder.
**Expected:** Displays `--°` with a visible degree symbol — not `--Â°` or other garbled sequence.
**Why human:** Font/glyph rendering cannot be confirmed by source scan; the `&#x00B0;` entity must be verified in a rendered browser context.

#### 2. Board Picker Emoji Rendering

**Test:** Open the PWA in Chrome. Open the board picker / settings screen. Observe the board cards for Onewheel models and the EUC model.
**Expected:** Onewheel board cards each show an orange circle emoji (🟠); EUC card shows a blue book emoji (📘). No empty boxes or garbled sequences.
**Why human:** Emoji rendering is font- and OS-dependent; `&#x1F7E0;` and `&#x1F4D8;` entities are correct but actual glyph display requires a live browser.

#### 3. Ride List Date/Time Separator

**Test:** Open the PWA in Chrome with at least one saved ride. Navigate to the rides list. Observe the separator between date and time in each ride card.
**Expected:** Separator is a visible middle dot `·` — not `Â·` or a bullet point or other garbled character.
**Why human:** `&middot;` is injected via innerHTML template string; must be verified in browser DOM.

#### 4. Nav Bar Icon Rendering

**Test:** Open the PWA in Chrome. Observe the bottom nav bar (mobile) and/or the sidebar (desktop). Check the icons: lightning bolt (Live), record dot (Record), pencil (Rides), profile circle (Settings/Profile).
**Expected:** All four icons render as recognizable symbols. No empty boxes or question-mark glyphs.
**Why human:** Icon glyphs (U+26A1, U+25CF, U+270F+FE0F, U+25CE) depend on font support in the browser.

---

### Gaps Summary

No programmatically-verifiable gaps found. All four requirements (ENC-01 through DEPLOY-01) are satisfied in the codebase. The non-ASCII scan is clean. The service worker version is correct. Both fix commits are on origin/main. The Phase 1 BLE guard is intact.

Status is `human_needed` because four visual rendering behaviors (degree glyph, emoji, middle dot, nav icons) require a browser to confirm. These are inherent to a no-build PWA with no automated test suite — they cannot be verified by source inspection alone.

---

_Verified: 2026-05-12T21:45:00Z_
_Verifier: Claude (gsd-verifier)_
