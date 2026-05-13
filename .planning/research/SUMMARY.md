# Research Summary

## Root Causes Confirmed

### 1. Pint BLE Telemetry — Auth Regression
- **What**: Battery %, duty cycle, and temperature all read as 0 on Pint boards
- **Where**: `index.html` lines 392–393 — `tryGTUnlock()` is called unconditionally for every board model
- **Why**: Pint has `f3fe`/`f3ff` characteristics in its GATT table, so `startNotifications()` on f3fe succeeds. But Pint never sends a challenge notification. The `sendAuthResponse` function then attempts up to 5 `writeValueWithResponse()` calls against f3ff — each blocked call holds the GATT queue for Chrome's ATT timeout (~30s), starving all subsequent `readValue()` calls in the telemetry poller. Board reports "connected" but delivers zeros.
- **Fix**: Wrap `tryGTUnlock` in `if (OW_GT_MODELS.has(selectedBoard.model))`. `OW_GT_MODELS = new Set(['GT', 'GTS', 'GTS-XL'])` is already defined at line 79 but the guard was dropped in commit `d631607`.

### 2. Encoding Bug — Double-Encoded UTF-8
- **What**: Garbled characters visible on live ride screen and ride detail view: `â†'` (→), `â€"` (—), `Â°` (°), emoji fragments like `ðŸŸ `
- **Where**: Baked into the file's bytes at lines 81, 438, 477, 525, 587, 588, 1390, 1398 and others — not a browser rendering artifact
- **Why**: The file was re-saved through a Latin-1-assuming editor or tool at some point. The `<meta charset="UTF-8">` at line 4 is correct; the corruption is upstream in the file bytes.
- **Fix**: Replace all non-ASCII characters — use HTML entities in markup (e.g., `&rarr;`, `&mdash;`, `&deg;`) and Unicode escapes in `<script>` strings (e.g., `→`).

## Key Findings

### BLE Protocol
- **Battery (f303)**: 2-byte value, `getUint8(1)` is the percentage (0–100, no scaling). Direct percent.
- **Duty cycle (f30d)**: Signed Int16 big-endian, divide by 327.67, take abs → 0–100%. Typical range: 5–20% flat, 30–60% acceleration, >80% approaching pushback.
- **Temperature (f310)**: Signed Int16 big-endian, tenths of Celsius. Raw 250 = 25.0°C. Current `getInt16(0, false) / 10 × 9/5 + 32` formula is correct.
- **Parsing is not the bug** — byte parsing logic for all three characteristics is correct. Auth is blocking the reads before they happen.
- **Polling approach is correct**: Pint does not push notifications for f303/f30d/f310. The existing 5s `startTelemetryPolling()` is right — just needs auth out of the way first.

### Poller Silent Failure
- `catch(e) {}` at line 545 silently swallows `NetworkError: GATT operation already in progress` — the exact error that fires when auth stalls the GATT queue for Pint. No diagnostic output, no user feedback, appears connected but delivers zeros.
- Fix: change to `catch(e) { bleDiag('poll fail: ' + e.message); }` for visibility.

### Encoding
- Git CRLF conversion is safe for UTF-8 (only touches 0x0D/0x0A; UTF-8 continuation bytes are 0x80–0xBF). Not the cause.
- Enumerate all non-ASCII: `Select-String -Path index.html -Pattern '[^\x00-\x7F]'`
- In `<script>` blocks: use Unicode escapes (`→`, `—`, `°`)
- In HTML markup: use named entities (`&rarr;`, `&mdash;`, `&deg;`)

## Fix Strategy

1. **Guard BLE auth by model** — wrap `tryGTUnlock()` in `if (OW_GT_MODELS.has(selectedBoard.model))` (one line change, line ~392)
2. **Surface poller errors** — change `catch(e) {}` to `catch(e) { bleDiag('poll fail: ' + e.message); }` (line ~545)
3. **Fix encoding** — enumerate all non-ASCII bytes, replace with entities/Unicode escapes throughout `index.html`
4. **Bump SW version** — increment `ridelogger-v20` → `ridelogger-v21` after any change to `index.html`

## Risks & Watch-Outs
- Auth guard must use `OW_GT_MODELS` (GT/GTS/GTS-XL) — XR and XR-C also don't need the auth challenge. Verify XR behavior separately.
- After fixing auth, the 5s poller fires immediately — battery should show non-zero on first poll if board is charged. If still zero, that's a separate read issue.
- Encoding fix must cover all garbled sequences — partial fix leaves some characters broken. Run the PowerShell scan after the fix to confirm zero non-ASCII bytes.
- SW version bump is required or users will get cached broken version.

## Validation
- Connect Pint → open BLE diag panel → confirm f3fe auth attempt is NOT made (no "challenge" log line)
- After 5s, battery % should show real value (e.g., 85%)
- Duty cycle should show non-zero during active riding (5–60%)
- Temp should show realistic value (30–65°C converted to °F)
- `Select-String -Path index.html -Pattern '[^\x00-\x7F]'` returns zero matches
- Live ride screen and ride detail view show correct characters (→, —, °)
