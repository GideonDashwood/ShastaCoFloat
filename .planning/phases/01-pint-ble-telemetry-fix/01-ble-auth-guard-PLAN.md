---
id: 01-ble-auth-guard
phase: 1
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - index.html
  - sw.js
autonomous: true
requirements:
  - BLE-01
  - BLE-02
  - BLE-03
  - BLE-04
  - BLE-05

must_haves:
  truths:
    - "Connecting a Pint board does NOT trigger the f3fe/f3ff auth handshake — the BLE diagnostic panel shows no 'challenge' log line"
    - "Battery percentage shows a realistic non-zero value on the live ride screen within 5 seconds of connecting the Pint"
    - "Duty cycle and temperature both display realistic non-zero values on the live ride screen within 5 seconds of connecting the Pint"
    - "When the telemetry poller catches an error, the error message appears in the BLE diagnostic panel (not silently discarded)"
    - "sw.js cache version is incremented from ridelogger-v20 to ridelogger-v21"
    - "Changes are committed and pushed to the remote repository"
  artifacts:
    - path: "index.html"
      provides: "Guarded tryGTUnlock call (GT/GTS/GTS-XL only) and poller error surfacing"
      contains: "OW_GT_MODELS.has(selectedBoard.model)"
    - path: "sw.js"
      provides: "Bumped cache version"
      contains: "ridelogger-v21"
  key_links:
    - from: "connectBLE (line ~393)"
      to: "tryGTUnlock"
      via: "OW_GT_MODELS.has(selectedBoard.model) guard"
      pattern: "OW_GT_MODELS\\.has\\(selectedBoard\\.model\\)"
    - from: "startTelemetryPolling catch block (line ~503)"
      to: "bleDiag"
      via: "bleDiag('poll error: ' + e.message)"
      pattern: "bleDiag\\('poll error"
---

<objective>
Fix the Pint BLE telemetry regression by guarding the GT-only auth handshake so it only runs for GT/GTS/GTS-XL models. Surface telemetry poller errors in the BLE diagnostic panel instead of silently discarding them. Bump the service worker cache version to deliver the fix to users.

Purpose: The unconditional call to tryGTUnlock() blocks the GATT queue on Pint boards, which do not support the f3fe/f3ff auth characteristics. This starves battery, duty cycle, and temperature reads, causing them to display as 0. Guarding the call unblocks all three telemetry streams simultaneously (BLE-02, BLE-03, BLE-04).

Output:
- index.html with the auth guard applied and poller errors surfaced to bleDiag
- sw.js with cache version bumped to ridelogger-v21
- Changes committed and pushed
</objective>

<execution_context>
@C:/Users/bills/.claude/get-shit-done/workflows/execute-plan.md
@C:/Users/bills/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@C:/Users/bills/ShastaCoFloat/.planning/ROADMAP.md
@C:/Users/bills/ShastaCoFloat/.planning/REQUIREMENTS.md
@C:/Users/bills/ShastaCoFloat/.planning/STATE.md
@C:/Users/bills/ShastaCoFloat/CLAUDE.md
</context>

<tasks>

<task type="auto">
  <name>Task 1: Apply auth guard and surface poller errors in index.html</name>

  <read_first>
    - C:/Users/bills/ShastaCoFloat/index.html — read lines 79 (OW_GT_MODELS definition), 370-412 (connectBLE function), 436-461 (tryGTUnlock function), 489-510 (startTelemetryPolling function), 512-556 (subscribeChar function) before touching anything
  </read_first>

  <files>index.html</files>

  <action>
    Make exactly two targeted edits to index.html.

    EDIT 1 — Auth guard (BLE-01, unblocks BLE-02/03/04):
    At line ~393, inside the connectBLE function, the current unconditional call is:
      await tryGTUnlock(bleService);
    Replace it with:
      if (OW_GT_MODELS.has(selectedBoard.model)) await tryGTUnlock(bleService);

    OW_GT_MODELS is already defined at line 79 as new Set(['GT', 'GTS', 'GTS-XL']). No other changes to the function are needed.

    EDIT 2 — Surface poller errors (BLE-05):
    In startTelemetryPolling (lines ~489-510), the inner poll async function has a catch block at line ~503 that currently reads:
      } catch(e) {}
    Replace it with:
      } catch(e) { bleDiag('poll error: ' + e.message); }

    The bleDiag function (line ~361) writes to the #ble-diag element and console.log. This is the correct surface for poller errors.

    Do NOT modify the catch block inside subscribeChar (lines ~544-545) — that block handles individual characteristic discovery failures during initial connect and is separate from the poller. Do NOT change tryGTUnlock itself. Do NOT change any other logic.
  </action>

  <verify>
    <automated>
      PowerShell: Select-String -Path C:/Users/bills/ShastaCoFloat/index.html -Pattern "OW_GT_MODELS\.has\(selectedBoard\.model\)" | Select-Object -ExpandProperty Line
      Expected: line containing: if (OW_GT_MODELS.has(selectedBoard.model)) await tryGTUnlock(bleService);

      PowerShell: Select-String -Path C:/Users/bills/ShastaCoFloat/index.html -Pattern "await tryGTUnlock\(bleService\)" | Select-Object -ExpandProperty Line
      Expected: exactly ONE match, and that match must contain the OW_GT_MODELS guard (not a bare unconditional call)

      PowerShell: Select-String -Path C:/Users/bills/ShastaCoFloat/index.html -Pattern "bleDiag\('poll error" | Select-Object -ExpandProperty Line
      Expected: at least one match in startTelemetryPolling
    </automated>
  </verify>

  <acceptance_criteria>
    - index.html line ~393 reads: if (OW_GT_MODELS.has(selectedBoard.model)) await tryGTUnlock(bleService);
    - index.html does NOT contain a bare unconditional call: await tryGTUnlock(bleService); (without the if guard)
    - index.html startTelemetryPolling catch block reads: } catch(e) { bleDiag('poll error: ' + e.message); }
    - tryGTUnlock function body (lines ~436-461) is unchanged
    - subscribeChar function body is unchanged
    - OW_GT_MODELS definition at line ~79 is unchanged
  </acceptance_criteria>

  <done>index.html contains the OW_GT_MODELS guard on tryGTUnlock and surfaces poller errors via bleDiag</done>
</task>

<task type="auto">
  <name>Task 2: Bump sw.js cache version to ridelogger-v21</name>

  <read_first>
    - C:/Users/bills/ShastaCoFloat/sw.js — read the entire file (33 lines) to confirm current cache version before editing
  </read_first>

  <files>sw.js</files>

  <action>
    In sw.js line 1, change the cache version string:
      const CACHE = 'ridelogger-v20';
    to:
      const CACHE = 'ridelogger-v21';

    No other changes to sw.js.

    This causes the service worker to invalidate the old cache on activate, delete ridelogger-v20, and serve the updated index.html to returning users. The activate handler already calls self.clients.claim() and posts SW_UPDATED, so no additional logic is needed.
  </action>

  <verify>
    <automated>
      PowerShell: Select-String -Path C:/Users/bills/ShastaCoFloat/sw.js -Pattern "ridelogger-v21" | Select-Object -ExpandProperty Line
      Expected: const CACHE = 'ridelogger-v21';

      PowerShell: Select-String -Path C:/Users/bills/ShastaCoFloat/sw.js -Pattern "ridelogger-v20"
      Expected: no matches (old version string is gone)
    </automated>
  </verify>

  <acceptance_criteria>
    - sw.js line 1 reads: const CACHE = 'ridelogger-v21';
    - sw.js does NOT contain 'ridelogger-v20'
    - All other sw.js content is unchanged (ASSETS array, install/activate/fetch listeners remain identical)
  </acceptance_criteria>

  <done>sw.js cache version is ridelogger-v21</done>
</task>

<task type="auto">
  <name>Task 3: Commit and push changes</name>

  <read_first>
    - Run: git -C C:/Users/bills/ShastaCoFloat diff --stat
    - Confirm both index.html and sw.js appear as modified before committing
  </read_first>

  <files>index.html, sw.js</files>

  <action>
    Stage both files and create a single commit, then push to the remote.

    Stage: git add index.html sw.js
    Commit message: fix(ble): guard GT auth handshake to Pint; surface poller errors

    The commit message body (optional) can include:
    - tryGTUnlock() now only runs for GT/GTS/GTS-XL models (OW_GT_MODELS guard)
    - Pint/XR boards skip f3fe/f3ff auth, unblocking battery/duty/temp reads
    - Poller catch block now logs to bleDiag instead of swallowing errors
    - sw.js bumped to ridelogger-v21

    Push: git push

    Per CLAUDE.md convention: always commit and push after every change.
  </action>

  <verify>
    <automated>
      git -C C:/Users/bills/ShastaCoFloat log --oneline -1
      Expected: commit message contains "ble" or "BLE" or "auth" or "Pint"

      git -C C:/Users/bills/ShastaCoFloat status
      Expected: working tree clean (nothing to commit)

      git -C C:/Users/bills/ShastaCoFloat log --oneline -1 origin/main..HEAD
      Expected: empty (changes pushed to remote)
    </automated>
  </verify>

  <acceptance_criteria>
    - git status shows clean working tree
    - git log -1 shows the fix commit with both index.html and sw.js in the diff
    - Remote is up to date (git log origin/main..HEAD returns no commits)
  </acceptance_criteria>

  <done>Changes committed and pushed; remote repository contains the Pint BLE fix</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| BLE device → app | Board sends raw bytes over GATT; app parses without server validation |
| App → Firestore | Firebase API key is client-visible; Firestore security rules must restrict writes to authenticated users |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-01-01 | Spoofing | BLE device pairing | accept | Web Bluetooth requires user gesture to pair; OS handles device identity |
| T-01-02 | Tampering | GATT characteristic values | accept | Telemetry data is display-only; malicious values affect UI readout, not stored data |
| T-01-03 | Information Disclosure | Firebase API key in index.html | accept | Key is client-side by design; Firestore security rules restrict read/write to authenticated users |
| T-01-04 | Denial of Service | GATT queue starvation (the regression being fixed) | mitigate | Auth guard added — Pint no longer blocks GATT queue attempting f3fe/f3ff subscribe |
</threat_model>

<verification>
After all tasks complete, verify the phase goal:

1. BLE-01: `Select-String -Path index.html -Pattern "OW_GT_MODELS\.has\(selectedBoard\.model\)"` returns exactly one match on the line containing tryGTUnlock — no bare unconditional call exists.

2. BLE-02/03/04 (functional — requires physical Pint board): Connect Pint board and observe the live ride screen within 5 seconds. Battery shows a percentage > 0, duty cycle shows a value > 0 while riding, temperature shows a value in the range 50-120°F.

3. BLE-05: `Select-String -Path index.html -Pattern "bleDiag\('poll error"` returns at least one match in the startTelemetryPolling function. When a poller read fails (observable in the BLE diagnostic panel), the error message appears rather than being silently swallowed.

4. SW version: `Select-String -Path sw.js -Pattern "ridelogger-v21"` returns one match. No match for "ridelogger-v20".

5. Commit: `git log --oneline -1` shows the fix commit. `git status` is clean. `git log origin/main..HEAD` is empty.
</verification>

<success_criteria>
- index.html contains: if (OW_GT_MODELS.has(selectedBoard.model)) await tryGTUnlock(bleService);
- index.html does NOT contain a bare: await tryGTUnlock(bleService); (unconditional)
- index.html startTelemetryPolling catch reads: } catch(e) { bleDiag('poll error: ' + e.message); }
- sw.js contains: const CACHE = 'ridelogger-v21';
- git status is clean and remote is current
</success_criteria>

<output>
After all tasks complete, create `.planning/phases/01-pint-ble-telemetry-fix/01-ble-auth-guard-SUMMARY.md` using the summary template at `@C:/Users/bills/.claude/get-shit-done/templates/summary.md`.
</output>
