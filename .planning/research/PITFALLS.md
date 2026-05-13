# Pitfalls: Encoding Bugs and BLE Gotchas

**Project:** RideLogger PWA  
**Researched:** 2026-05-12  
**Applies to:** `index.html` (single-file, vanilla JS, no build toolchain)

---

## Encoding Pitfalls

### Root Cause: Garbled UTF-8 in index.html

**Confirmed present.** Grep of the live file shows:
- `â†'` in place of `→` (U+2192, UTF-8 bytes: E2 86 92)
- `â€"` in place of `—` (U+2014, UTF-8 bytes: E2 80 94)
- `Â°` in place of `°` (U+00B0, UTF-8 bytes: C2 B0)

These are the exact byte patterns produced by **UTF-8 double-encoding**: each raw UTF-8 byte is treated as Latin-1 (ISO-8859-1) and then re-encoded as UTF-8. The byte E2 (0xE2) becomes `â` (U+00E2), 86 (0x86) becomes `†` (U+0086), 92 (0x92) becomes `'` — producing `â†'`.

**Most likely cause for this project:**  
VS Code on Windows saved the file correctly as UTF-8, but at some point the file was opened and re-saved by a tool (git editor, Windows Notepad before Win10 1903, a copy-paste through a terminal with a CP1252 code page, or an HTTP response that omitted `charset=utf-8` and the browser defaulted to Latin-1 for an inline string). The `<meta charset="UTF-8">` declaration is present and correct at line 4, ruling out a missing charset as the browser-side display cause — the corruption is **baked into the bytes of the file itself**, not a rendering issue.

**How to detect:**  
Run a hex dump on suspicious lines. The sequence `E2 80 94` is a correct em-dash; `C3 A2 E2 80 94` is a double-encoded em-dash. In VS Code: open the file, look at the bottom status bar — it should say `UTF-8` (not `UTF-8 with BOM`, not `Windows 1252`). A BOM (`EF BB BF` at byte 0) would not cause these symptoms but is a separate risk.

**Immediate fix:**  
Replace all garbled sequences with HTML entities. This is the safest long-term approach because entities are pure ASCII and cannot be corrupted by any encoding pipeline:

| Wrong (in file now) | Character | Safe entity | Numeric entity |
|---|---|---|---|
| `â†'` | → | `&rarr;` | `&#x2192;` |
| `â€"` | — | `&mdash;` | `&#x2014;` |
| `Â°` | ° | `&deg;` | `&#xB0;` |
| `â—` | ● | `&#x25CF;` | (use entity) |
| `â—Ž` | ◎ | `&#x25CE;` | (use entity) |
| `ðŸŸ ` | 🟠 | N/A — use ASCII label or img | avoid emoji in HTML |
| `ðŸ"˜` | 🔘 | N/A — use ASCII label or img | avoid emoji in HTML |
| `â˜€ï¸` | ☀️ | `&#x2600;&#xFE0F;` | risky — use text |
| `ðŸŒ™` | 🌙 | `&#x1F319;` | avoid |

**Find all corrupted sequences in the file:**
```
# In VS Code: Ctrl+H, enable Regex, search:
[â€â†Â°â—ðŸ]
# Or from PowerShell (shows line numbers):
Select-String -Path index.html -Pattern '[^\x00-\x7F]' | Select-Object LineNumber, Line
```

**Prevention:**  
1. Replace all non-ASCII characters in `index.html` with HTML entities or ASCII equivalents.  
2. Add a `.editorconfig` with `charset = utf-8` to lock the encoding for all editors.  
3. Do not paste content from browser address bars, Word, or Windows Terminal — all have copy encoding bugs on Windows.

---

### Safe Special Character Handling

**Recommendation: Use HTML entities for all non-ASCII in a single-file PWA.**

Raw UTF-8 in a `.html` file is technically valid when the file is saved as UTF-8 and the charset meta is present. However, in a no-build-toolchain project edited on Windows by multiple tools, the risk of silent re-encoding is high. HTML entities are pure ASCII — they survive every encoding pipeline.

| Character | Raw UTF-8 risk | Preferred form |
|---|---|---|
| → | High (3-byte, garbles to â†') | `&rarr;` |
| — | High (3-byte, garbles to â€") | `&mdash;` |
| · (middle dot) | Medium | `&middot;` |
| ° | Medium (2-byte) | `&deg;` |
| Emoji (🟠, 🌙) | Very high (4-byte sequences) | Avoid; use SVG icons, CSS, or text labels |
| & | N/A — ASCII but special | `&amp;` (always) |

The `<meta charset="UTF-8">` at line 4 is necessary and correct. It must stay within the first 1024 bytes of the document (MDN requirement). It is already correctly placed. Do not change it.

For JS string literals in `<script>` blocks, HTML entities do **not** work — use Unicode escapes:
```js
// Safe in JS strings:
const arrow = '→';   // →
const dash  = '—';   // —
const deg   = '°';   // °

// Or just use ASCII alternatives:
const arrow = '->';
const dash  = '-';
```

---

### Git Encoding Risks on Windows

**CRLF conversion does NOT corrupt UTF-8.** This is confirmed by the git documentation: CRLF conversion only touches bytes 0x0D and 0x0A, which never appear as continuation bytes in valid UTF-8 sequences (continuation bytes are 0x80–0xBF). The garbled characters in this project are **not** caused by git line-ending conversion.

**What git `text=auto` does do:** It may refuse to commit a file that git detects as binary due to stray null bytes or high-byte density. A UTF-8 file with many emoji can occasionally trigger this. Use `-text` on `index.html` in `.gitattributes` if git ever rejects it.

**Recommended `.gitattributes`:**
```gitattributes
# Normalize all text files to LF in repo, CRLF in Windows working tree
* text=auto

# Force HTML/JS/CSS to LF regardless of OS
*.html text eol=lf
*.js   text eol=lf
*.css  text eol=lf

# Treat SW explicitly
sw.js  text eol=lf
```

The `eol=lf` on `*.html` ensures VS Code on Windows does not insert CRLF into the file, which can cause subtle diffs and confuse some tools. It does not affect UTF-8 byte correctness.

**UTF-8 BOM risk:** If any tool saves `index.html` with a BOM (`EF BB BF` prefix), some older parsers misread the first line. The current file does not have a BOM (VS Code default for UTF-8 is no-BOM). Keep it that way. In VS Code: bottom status bar must show `UTF-8` not `UTF-8 with BOM`.

---

## BLE Pitfalls

### Values Stuck at 0 — Pint Battery and Duty Cycle

**Confirmed regression pattern in this codebase.** The commit history shows `tryGTUnlock()` was progressively applied to all boards including Pint. The code at line 392–393 now runs auth unconditionally:

```js
// All Onewheel models use the f3fe/f3ff auth handshake
await tryGTUnlock(bleService);
```

The Pint does **not** use the GT auth handshake. When `tryGTUnlock` runs against a Pint:
1. `startNotifications()` is called on `f3fe` — the Pint may or may not have this characteristic, or may handle it differently.
2. The code then waits 800ms for a challenge that never arrives (Pint does not send a challenge).
3. `subscribeChar()` for battery (`OW_CHAR_BATT`) and duty (`OW_CHAR_DUTY`) is called immediately after — before the board has acknowledged readiness.
4. The Pint sends telemetry only on value change, not on subscribe. If battery is stable at a given %, no notification fires. The 5s poller (`startTelemetryPolling`) then calls `readValue()`, but if the GATT server is still busy with the stalled auth sequence, the read can fail silently (caught and suppressed in the `catch(e) {}` block at line 545).

**Root cause of stuck-at-0:** The `onBattData` and `onDutyData` handlers are never called because:
- No notification arrives (Pint, stable value)
- The poll `readValue()` fails silently because a prior GATT operation is still pending
- The initial value of `boardBattery` and `boardDutyCycle` variables is `null`, which renders as `0%` or `0` in the UI

**Fix:**
```js
const BOARDS_REQUIRING_AUTH = new Set(['GT', 'GTS', 'GTS-XL']);

// In connectBLE():
if (BOARDS_REQUIRING_AUTH.has(selectedBoard.model)) {
  await tryGTUnlock(bleService);
}
```

This is exactly what `OW_GT_MODELS` (defined at line 79) was intended to gate. The guard was removed during the auth iteration sprints.

---

### Auth Timing: Subscribing Before Auth Completes

**What goes wrong:** On GT/GTS/GTS-XL boards, the board sends telemetry only after the auth handshake succeeds. If `subscribeChar()` is called before auth completes and the board does not yet trust the client, it will not send notification data even though `startNotifications()` resolved successfully. The characteristic subscribe call succeeds at the GATT protocol level (it writes the CCCD descriptor), but the board-level application firmware gates data behind auth.

**Symptom:** `startNotifications()` resolves, `characteristicvaluechanged` listener is registered, but no events ever fire. Values stay at initialization defaults (0 / null).

**Correct order for GT-family boards:**
```
1. connect() → getPrimaryService()
2. tryGTUnlock() — subscribe to f3fe, wait for challenge, write f3ff response, wait for ACK
3. subscribeChar() for RPM, batt, duty, temp
4. startTelemetryPolling()
```

The current code has the correct order for GT boards (lines 392–402). The problem is the incorrect application of step 2 to Pint boards.

**What happens if `startNotifications()` is called on a characteristic the board rejects?**  
The promise resolves (GATT layer accepts the CCCD write), but no `characteristicvaluechanged` events are dispatched. There is no error surfaced to JS. This is one of the hardest-to-debug failure modes in Web Bluetooth — silent success with no data.

---

### GATT Operation Queuing: One Operation at a Time

**Critical Web Bluetooth constraint.** The browser's Web Bluetooth stack serializes all GATT operations on a given device. If a previous operation (`readValue`, `writeValue`, `startNotifications`) has not resolved or rejected yet, subsequent operations queue behind it. If any operation stalls (e.g., a `writeValue` to `f3ff` that the Pint ignores), the entire queue stalls.

**In the current `sendAuthResponse` function (lines 463–487):**
- Up to 5 `writeValue()` calls are attempted sequentially.
- Each `writeValue()` waits for a response (`writeValue` with response = default).
- If the Pint receives a write to `f3ff` that it doesn't understand, it may NAK or time out, blocking subsequent GATT operations for the timeout duration (typically 30s on Chrome's internal ATT timeout).

**Fix:** Add a guard so `sendAuthResponse` is never called for Pint. Also consider using `writeValueWithoutResponse()` for auth response writes if the characteristic supports it, to avoid ATT-level blocking.

---

### Notification vs Poll — When to Use Each

**Notifications (`startNotifications` + `characteristicvaluechanged`):**
- Use when the board pushes data continuously or on every meaningful change (RPM is always changing during a ride).
- GT/GTS/GTS-XL: push RPM on every motor cycle update. Battery and duty are pushed only on significant change.
- Pint/XR: push RPM on change, but battery and duty change rarely mid-ride (battery barely moves in 5 minutes). Notifications will not fire for a stable battery.

**Poll (`readValue` on a timer):**
- Correct for slow-changing characteristics on boards that do not push proactively.
- Current poll interval: 5s (line 546). This is reasonable for battery; consider 3s for duty cycle since it fluctuates more.
- **Critical:** `readValue()` will fail with `NetworkError: GATT operation already in progress` if another GATT operation is pending. The current poller catches and suppresses this error, which means a stalled auth sequence silently kills all polling. Log these errors to the BLE diag panel rather than swallowing them.

**Recommended pattern for Pint:**
```js
// Skip auth entirely for Pint
// Subscribe to RPM (changes every update)
// Poll battery and duty every 5s
// Log any readValue NetworkError to bleDiag so it is visible
```

**Poll interval recommendation:** 5s for battery, 2–3s for duty cycle. RPM should always use notifications (too fast to poll efficiently).

---

### Missing or Duplicate Event Listeners

**Pitfall:** If `connectBLE()` is called more than once (disconnect + reconnect), `addEventListener('characteristicvaluechanged', handler)` adds a **second listener** to the same characteristic object if the characteristic reference is reused. The handler fires twice, doubling all values.

**Detection:** Battery reads jump to 200%, duty cycle is double.

**Fix:** Always call `removeEventListener` before `addEventListener` on reconnect, or use `{ once: false }` with explicit cleanup tracked in a map. The safest pattern:
```js
char.removeEventListener('characteristicvaluechanged', handler);
char.addEventListener('characteristicvaluechanged', handler);
```

Or store characteristic references and call `stopNotifications()` + remove listeners in `disconnectBLE()` before the next connect.

---

### `characteristic.value` Is Null Before First Read or Notification

**The `value` property of a `BluetoothRemoteGATTCharacteristic` is `null` (or an empty DataView) until:**
1. `readValue()` resolves, OR
2. A `characteristicvaluechanged` event fires

Any handler that attempts to call `e.target.value.getInt16(...)` before a value arrives will throw. The current handlers (`onBattData`, `onDutyData`, etc.) accept the event and read immediately — this is correct. The risk is if `handler({ target: { value: val } })` is called manually (as the poll does at line 498) when `val` could be empty.

**Verify:** `readValue()` always returns a `DataView`, never null, when the promise resolves. The manual poll pattern is safe as long as `readValue()` resolves before the handler is invoked, which it does.

---

## Prevention Strategies

1. **Replace all non-ASCII in `index.html` with HTML entities or ASCII.** Run `Select-String -Path index.html -Pattern '[^\x00-\x7F]'` in PowerShell to find every non-ASCII byte. The result list is the fix target. Emoji in button icons should become SVG or CSS symbols.

2. **Gate auth by board model.** `OW_GT_MODELS` already exists for this purpose. Restore the guard: `if (OW_GT_MODELS.has(selectedBoard.model)) await tryGTUnlock(bleService);`

3. **Log GATT errors to `bleDiag` instead of swallowing them.** The `catch(e) {}` in the poller hides the most important diagnostic signal when auth stalls the queue. Change to `catch(e) { bleDiag('poll fail: ' + e.message); }`.

4. **Add a GATT operation timeout guard.** Wrap long GATT operations in a `Promise.race` with a 5s timeout so a stalled write does not block the queue indefinitely:
   ```js
   const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('GATT timeout')), 5000));
   await Promise.race([authOut.writeValue(bytes), timeout]);
   ```

5. **Use `writeValueWithoutResponse()` for auth writes if the characteristic supports it.** This avoids ATT acknowledgment blocking.

6. **Test reconnect paths.** Disconnect and reconnect at least twice in a session to catch duplicate event listener accumulation.

7. **Add `.editorconfig`** with `charset = utf-8`, `end_of_line = lf`, `insert_final_newline = true` to prevent future encoding drift from editor variations.

---

## Sources

- MDN: `BluetoothRemoteGATTCharacteristic` — https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTCharacteristic
- MDN: `startNotifications()` — https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTCharacteristic/startNotifications
- MDN: `readValue()` — https://developer.mozilla.org/en-US/docs/Web/API/BluetoothRemoteGATTCharacteristic/readValue
- MDN: `<meta charset>` placement rule (must be within first 1024 bytes) — https://developer.mozilla.org/en-US/docs/Web/HTML/Element/meta#charset
- MDN: UTF-8 double-encoding mechanics — https://developer.mozilla.org/en-US/docs/Glossary/UTF-8
- git-scm: gitattributes CRLF safety for UTF-8 — https://git-scm.com/docs/gitattributes
- Code evidence: `index.html` lines 81, 438, 448, 466, 477, 525, 532, 535, 554, 571, 579, 587, 588 — garbled sequences confirmed in-file
- Code evidence: `index.html` line 392–393 — unconditional auth applied to all boards
- Code evidence: `index.html` line 545 — silent GATT error suppression in poller
