# Features Research: Expected Pint Telemetry

**Researched:** 2026-05-12
**Source basis:** Codebase parsing code (index.html lines 558–589), community-validated Onewheel BLE reverse-engineering, android-ponewheel project patterns, Float Control app behavior known from community documentation.

---

## Battery %

- **Characteristic UUID:** `e659f303-ea98-11e3-ac10-0800200c9a66` (`f303`)
- **Expected range:** 0–100 (integer percent, no scaling needed)
- **Raw value format:** The current code reads `getUint8(1)` when the response is >1 byte, or `getUint8(0)` for a single-byte response. The Pint sends a 2-byte value; byte 0 appears to be a status/flag byte, byte 1 is the actual battery percent.
- **Typical values:** 100 when fully charged, drops to ~5–10 at board cutoff. Real example: raw bytes `[0, 87]` → 87%.
- **Known Pint problem:** If byte-index selection is wrong (reading byte 0 instead of byte 1, or applying uint16 math), the value appears stuck at 0 or at a nonsensical number. The current fix (`byteLength > 1 ? getUint8(1) : getUint8(0)`) is correct per the community ponewheel project.
- **Confidence:** HIGH — parsing logic matches community-validated android-ponewheel source. The byte-index conditional was added specifically to fix Pint boards.

---

## Duty Cycle

- **Characteristic UUID:** `e659f30d-ea98-11e3-ac10-0800200c9a66` (`f30d`)
- **What it represents:** Motor torque demand as a fraction of maximum. Essentially "how hard is the motor working." High duty = hard acceleration, uphill, heavy rider. At 100% the board hits pushback or nosedives.
- **Raw value format:** Signed Int16, big-endian (`getInt16(0, false)`). Negative values = backward motion. Range: −32767 to +32767.
- **Conversion:** `Math.abs(val / 327.67)` → percentage 0–100. (32767 / 327.67 = 100.0)
- **Expected range:** 0–100% displayed. Raw: ±32767 max.
- **Typical riding values:**
  - Coasting flat: 5–20%
  - Moderate acceleration: 20–50%
  - Hard push / uphill: 50–80%
  - Pushback threshold: ~80–85% (board-configured)
  - Near-nosedive: >90% (dangerous)
- **Known Pint problem:** If duty reads stuck at 0 or at ~50% constantly, the characteristic subscription is not receiving notifications (board only notifies on change) and the polling fallback has not fired yet, OR auth never completed so the char returns zeros. After auth and the first 5s poll both fire, it should update.
- **Confidence:** HIGH for conversion formula (matches android-ponewheel and multiple community sources). MEDIUM for typical threshold numbers (community consensus, not official FM documentation).

---

## Temperature

- **Characteristic UUID:** `e659f310-ea98-11e3-ac10-0800200c9a66` (`f310`)
- **What it measures:** Controller/motor controller temperature (not ambient). This is the power electronics package, not the motor winding itself. Future Motion labels it "controller temp" in the official app.
- **Raw value format:** Signed Int16, big-endian (`getInt16(0, false)`).
- **Unit as received:** Tenths of a degree Celsius. Raw value 250 = 25.0°C.
- **Conversion:** `raw.getInt16(0, false) / 10` → Celsius. Then `tempC * 9/5 + 32` → Fahrenheit for display.
- **Typical range:**
  - Cold start / idle: 20–30°C (68–86°F)
  - Normal riding: 30–50°C (86–122°F)
  - Warm summer ride or sustained hills: 50–65°C (122–149°F)
  - Thermal warning territory: >70°C (>158°F) — board throttles power
- **Known Pint problem:** If temp shows a wild number (e.g., 3276°C or −3000°C), it's an endian error — reading little-endian instead of big-endian. If it shows exactly 0°C permanently, the characteristic read is failing silently or returning a zero-initialized buffer. The current code (`getInt16(0, false)` / 10) is correct per community sources.
- **Confidence:** HIGH for conversion (tenths-of-Celsius is documented in ponewheel and Rewheels projects). MEDIUM for thermal thresholds (community consensus from rider reports).

---

## Speed (for reference)

- **Pint top speed:** ~16 mph (factory limit, hardware-enforced via pushback at ~14 mph, hard cutoff ~16 mph). Pint X: ~18 mph.
- **Characteristic UUID:** `e659f302-ea98-11e3-ac10-0800200c9a66` (`f302`)
- **Raw value format:** Signed Int16, big-endian. Represents motor RPM. Negative = reverse.
- **Tire circumference used:** 32.9 inches (Pint, Pint S, Pint X — all share same 10.5" tire).
- **Calculation in code:** `Math.abs(rpm) * 32.9 * 60 / 63360` → mph
  - 63360 = inches per mile (5280 ft × 12 in)
  - Breakdown: inches/rev × rev/min × 60 min/hr ÷ 63360 in/mi
- **Expected RPM at top speed:** 16 mph × 63360 / (32.9 × 60) ≈ 513 RPM
- **Typical values during riding:**
  - Standing still: 0 RPM
  - Walking pace (3 mph): ~96 RPM
  - Cruising (10 mph): ~320 RPM
  - Top speed (16 mph): ~513 RPM
- **Confidence:** HIGH — circumference value cross-referenced with Pint 10.5" tire spec. Formula is standard and used identically in android-ponewheel.

---

## Validation Approach

### During a real ride, values are correct if:

| Metric | Sanity check |
|--------|-------------|
| Battery % | Reads 90–100% right after a full charge. Decreases slowly during ride. Never jumps. Whole-number integer (0–100). |
| Duty cycle | Near 0% while standing still. Spikes to 30–60% on acceleration. Returns to single digits on flat coast. Never exceeds 100%. |
| Temperature | Starts at ambient-ish (20–35°C / 68–95°F). Climbs slowly during riding. Does not read 0°F, 3276°F, or below freezing on a warm day. |
| Speed | 0.0 when stopped. Matches perceived speed. Does not exceed 18 mph on a stock Pint. |

### Common wrong-value signatures and their cause:

| Symptom | Likely cause |
|---------|-------------|
| Battery stuck at 0% | Reading byte 0 instead of byte 1 on a 2-byte response |
| Battery stuck at a fixed non-zero value (e.g., always 65%) | Notification never received after auth failure; polling fallback not running |
| Duty stuck at 0% always | Auth failed, board returning zeros; or notification missed and no poll |
| Duty stuck at ~50% | Possible raw value being read as unsigned (negative values not handled) |
| Temp reads −40°F or 3276°F | Endian mismatch or divide-by-10 missing |
| Temp stuck at 32°F (0°C) | Characteristic read returning zero-initialized DataView |
| Speed correct but others wrong | RPM char (f302) fires via notify; battery/duty/temp need the 5s poll to fire |

### Recommended live test protocol:

1. Connect to Pint immediately after a full charge — battery should read 98–100%.
2. Watch BLE diag panel for `batt bytes=[...]` log — confirm byte 1 is the large number, byte 0 is small/zero.
3. Accelerate hard — duty should spike visibly above 40%.
4. After 5 minutes riding — temp should be clearly above room temperature (>30°C / 86°F).
5. Compare duty to "effort felt" — uphills and hard starts should show higher duty than flat coasting.

---

## Sources

| Claim | Source | Confidence |
|-------|--------|------------|
| Battery byte-index (byte 1 of 2) | `index.html` line 570 — added to fix Pint specifically | HIGH |
| Duty = Int16 / 327.67 | `index.html` line 578; matches android-ponewheel `OWDevice.java` pattern | HIGH |
| Temp = Int16 / 10 in Celsius | `index.html` line 585; matches community Rewheels/ponewheel reverse-engineering | HIGH |
| Pint tire circumference 32.9" | `index.html` line 85; matches 10.5" Pint tire spec | HIGH |
| Duty typical thresholds (20–80%) | Community rider reports, Float Control app display ranges | MEDIUM |
| Temp typical ranges (30–65°C) | Community rider reports, Onewheel subreddit/forums | MEDIUM |
| Pint top speed 16 mph | Official Future Motion Pint spec (factory-limited) | HIGH |
| Controller temp (not motor winding) | ponewheel project issue comments, Rewheels documentation | MEDIUM |
