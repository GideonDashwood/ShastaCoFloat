---
phase: 02-encoding-fix-deploy
reviewed: 2026-05-12T00:00:00Z
depth: standard
files_reviewed: 2
files_reviewed_list:
  - index.html
  - sw.js
findings:
  critical: 1
  warning: 2
  info: 2
  total: 5
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-05-12
**Depth:** standard
**Files Reviewed:** 2
**Status:** issues_found

## Summary

Phase 2 successfully replaced all 49 mojibake UTF-8 sequences that were baked into `index.html`. The file is now clean ASCII (the only remaining non-ASCII byte on line 1 is a UTF-8 BOM that pre-dates this phase and was present in both the old and new file). The SW cache version was correctly bumped from `ridelogger-v21` to `ridelogger-v22`. The Phase 1 BLE auth guard (`if (OW_GT_MODELS.has(selectedBoard.model)) await tryGTUnlock(bleService)`) is intact at line 393 and was not disturbed.

One critical pre-existing bug was exposed clearly by this diff: the SW update guard on line 1708 always reloads even during an active ride because `watchId` is a module-scoped variable never exposed to the plain `<script>` block that reads it. This bug was not introduced by Phase 2, but it is present in the shipped code and causes real data loss during an active ride if a SW update arrives.

Two warnings and two info items are documented below.

---

## Critical Issues

### CR-01: SW update auto-reload guard is broken — will interrupt active rides

**File:** `index.html:1708`

**Issue:** The plain `<script>` block at line 1702 references `watchId` and `toast` — both are `let`/`function` declarations inside the `<script type="module">` block. ES module scope is isolated: variables declared in a module are not accessible to non-module scripts. At runtime, `watchId` in the SW message handler resolves to `undefined` (not the module-scoped variable). The condition `if (!watchId)` is therefore always truthy, so `window.location.reload()` fires unconditionally — including during an active GPS recording session. This is data loss: the ride in progress is destroyed the moment a new SW activates.

`toast` on line 1709 is exposed via `window.toast = toast` (line 906), so the fallback branch works — but it is unreachable because the guard never passes.

**Fix:** Expose `watchId` on `window` inside the module so the non-module script can read it. Add a setter at the assignment sites:

```js
// In the module, replace bare `watchId = ...` assignments with:
watchId = navigator.geolocation.watchPosition(...);
window._watchId = watchId;          // line 681

// And in clearWatch:
navigator.geolocation.clearWatch(watchId); watchId = null;
window._watchId = null;             // line 736
```

Then in the non-module `<script>`:

```js
if (!window._watchId) window.location.reload();
else toast('App update ready -- will apply after ride ends');
```

---

## Warnings

### WR-01: BOM present in index.html and sw.js

**File:** `index.html:1`, `sw.js:1`

**Issue:** Both files have a UTF-8 BOM (`\xEF\xBB\xBF`) as the first byte. The BOM is harmless for HTML served by a web server (browsers ignore it), but it is non-standard for JavaScript files. For `sw.js` in particular, while modern browsers tolerate it, the BOM can cause subtle issues with some older service worker implementations and concatenation tooling. This is pre-existing, not introduced by Phase 2.

**Fix:** Open both files in an editor configured to save as "UTF-8 without BOM" and re-save. On Windows PowerShell:

```powershell
$content = [System.IO.File]::ReadAllText('sw.js', [System.Text.Encoding]::UTF8)
[System.IO.File]::WriteAllText('sw.js', $content, (New-Object System.Text.UTF8Encoding $false))
```

### WR-02: `boardModel` and `boardLabel` inserted into innerHTML without escaping

**File:** `index.html:274`, `index.html:314`, `index.html:873`

**Issue:** Three innerHTML injection sites use `r.boardModel` (or a string derived from it) without calling `escHtml()`. At lines 274 and 314 the `boardLabel` template literal (`Onewheel ${ride.boardModel}`) is inserted directly. At line 873 `k` (built from `r.boardModel` via `\`Onewheel ${r.boardModel||''}\``) is inserted directly into the board-breakdown panel.

Because `boardModel` values are constrained today to a hardcoded `<select>`, exploitation requires a compromised Firestore write (e.g., direct API call with a malicious model string). If that ever happens, any stored XSS payload in `boardModel` will execute in every session for that user. This is pre-existing — not introduced by Phase 2 — but is the only remaining XSS surface in the file.

**Fix:** Apply `escHtml()` at each injection point:

```js
// line 263-274 (renderRidesList)
const boardLabel = r.boardType === 'onewheel'
  ? escHtml(`OW ${r.boardModel || ''}`.trim())
  : 'EUC';

// line 308-314 (openRide modal)
const boardLabel = ride.boardType === 'onewheel'
  ? escHtml(`Onewheel ${ride.boardModel || ''}`.trim())
  : 'EUC';

// line 868-873 (board breakdown)
const key = r.boardType === 'onewheel'
  ? `Onewheel ${r.boardModel||''}`.trim()
  : 'EUC';
// then at line 873:
`<span class="board-row-name">${escHtml(k)}</span>`
```

---

## Info

### IN-01: In-app version badge shows v20, SW is at v22

**File:** `index.html:1373`

**Issue:** The visible version number in the topbar (`v20`) was not updated when the SW cache version was bumped to `v22` in Phase 1 and `v22` in Phase 2. This causes confusion when debugging caching issues.

**Fix:**
```html
<span style="font-size:0.65rem;color:var(--text3);font-family:var(--font-mono);">v22</span>
```

### IN-02: Theme icon initial value in HTML uses numeric entity; JS uses Unicode escape

**File:** `index.html:1377`, `index.html:104-105`

**Issue:** The static initial icon in HTML is `&#x2600;&#xFE0F;` (sun). The `updateThemeIcon()` function correctly sets `'☀️'` for dark theme. These produce the same character, so there is no visual bug. However, the `updateThemeIcon` call happens on `DOMContentLoaded` (line 91) and will overwrite the static value immediately, making the static value irrelevant. The inconsistency is minor but could confuse future editors.

**Fix:** Either remove the hardcoded initial value in the HTML and rely solely on `updateThemeIcon()` being called on load, or align the static HTML value's notation with the JS (`&#x2600;&#xFE0F;` is fine as-is — this is informational only).

---

_Reviewed: 2026-05-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
