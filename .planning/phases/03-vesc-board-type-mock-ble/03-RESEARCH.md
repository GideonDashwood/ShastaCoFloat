# Phase 3: VESC Board Type + Mock BLE — Research

**Researched:** 2026-05-13
**Domain:** Single-file PWA BLE integration, VESC protocol, Firebase Firestore
**Confidence:** HIGH (codebase fully read; VESC protocol verified from multiple sources)

---

## Summary

Phase 3 adds VESC as a selectable board type in the existing board picker, bypasses the real
Web Bluetooth scan with a mock that streams 5 telemetry values via `setInterval`, displays those
values on the live ride screen (with voltage as a new metric), and saves completed rides to
Firestore tagged `boardType: 'VESC'`.

The entire app lives in `index.html` (~1810 lines). There is no build step. Every change
is a direct edit to `index.html`, followed by a `sw.js` cache-version bump, then commit + push.

The work splits cleanly into four surgical edit sites:

1. **Board picker HTML** — add one `<button class="board-card">` for VESC.
2. **`selectBoard()` JS** — show the mock-connect button (not the real BLE row) for VESC.
3. **Live ride screen HTML** — add a 5th telemetry row for VESC metrics including voltage.
4. **`startRecording()` and new `connectVESCMock()` JS** — drive the mock interval and update DOM.
5. **`confirmSave()` JS** — include VESC telemetry fields when saving.
6. **`stopRecording()` / default title** — handle `'vesc'` board type.

The real VESC BLE protocol uses the Nordic UART Service (NUS) with well-known 128-bit UUIDs.
The stub comment block must document those UUIDs and the `COMM_GET_VALUES` packet format so the
user can drop in the real implementation tonight.

**Primary recommendation:** Make every change additive. Do not refactor existing OW logic —
branch on `selectedBoard.type === 'vesc'` at each decision point.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| VESC-01 | User can select "VESC" as a board type from the board selector alongside GT, GTS, XR, and Pint | Add `<button class="board-card">` in `#page-record` board-grid; call `selectBoard('vesc','VESC')` |
| VESC-02 | App simulates a BLE connection using a mock that streams realistic fake telemetry at regular intervals | `connectVESCMock()` function using `setInterval` at 2 s; sinusoidal/random values for 5 metrics |
| VESC-03 | Live ride screen displays all 5 VESC telemetry values updating in real time | Add `#vesc-stats-row` div (mirrors `#ble-stats-row`); add `#live-voltage` span; show/hide per board type |
| VESC-04 | Completed VESC ride saves to Firebase with `boardType: 'VESC'` and all 5 telemetry fields | Extend `confirmSave()` to include `vescVoltage`, `avgBattery`, `maxDutyCycle`, `topSpeed`, `avgMotorTemp` |
| VESC-05 | VESC BLE code has a clearly marked stub comment block indicating where real protocol replaces mock | Stub comment block documenting NUS UUIDs and `COMM_GET_VALUES` packet format |
</phase_requirements>

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Board type selection | Browser / Client | — | UI state only; `selectedBoard` variable set in JS |
| Mock BLE interval timer | Browser / Client | — | `setInterval` in-page JS; no server involvement |
| Live telemetry display | Browser / Client | — | Direct DOM writes to existing `live-*` spans |
| Ride save to Firestore | API / Backend (Firebase) | Browser / Client | `addDoc` call already wired; just add new fields |
| Voltage display (new metric) | Browser / Client | — | New span in existing `live-stats-secondary` grid |

---

## Codebase Analysis — Exact Edit Points

All line numbers verified by reading `index.html` in this session.

### 1. Board Selector HTML (line ~1556–1593)

The board grid is a `<div class="board-grid">` containing `<button class="board-card">` elements.
Each calls `selectBoard(type, model)` with `data-board="type-model"` attribute.

**Current boards:** GTS-XL, GTS, GT, XR-C, XR, Pint S, Pint X, Pint, EUC.

**Insert:** One new button after EUC:

```html
<button class="board-card" onclick="selectBoard('vesc','VESC')" data-board="vesc-VESC">
  <div class="board-icon">&#x26A1;</div>
  <div>VESC</div>
</button>
```

[VERIFIED: index.html lines 1556-1593, read in this session]

### 2. `selectBoard()` Function (line ~734)

```javascript
window.selectBoard = function(type, model) {
  selectedBoard = { type, model };
  document.querySelectorAll('.board-card').forEach(c => c.classList.remove('selected'));
  document.querySelector(`[data-board="${type}-${model}"]`).classList.add('selected');
  document.getElementById('start-btn').disabled = false;
  document.getElementById('gps-status').textContent = 'GPS ready -- tap Start Ride';
  const bleRow = document.getElementById('ble-row');
  if (bleRow) bleRow.style.display = type === 'onewheel' ? 'block' : 'none';
}
```

**Current:** `ble-row` is shown only for `type === 'onewheel'`. EUC and VESC both hide it.

**Change needed:** Add a `#vesc-connect-row` div (a separate row for the VESC mock connect button)
and show it when `type === 'vesc'`. The real `ble-row` stays unchanged.

```javascript
const vescRow = document.getElementById('vesc-connect-row');
if (vescRow) vescRow.style.display = type === 'vesc' ? 'block' : 'none';
```

[VERIFIED: index.html line 734, read in this session]

### 3. `startRecording()` — telemetry row visibility (line ~757)

```javascript
document.getElementById('ble-stats-row').style.display =
  selectedBoard.type === 'onewheel' ? 'grid' : 'none';
```

**Change needed:** Also show `#vesc-stats-row` when `type === 'vesc'`:

```javascript
document.getElementById('ble-stats-row').style.display =
  selectedBoard.type === 'onewheel' ? 'grid' : 'none';
document.getElementById('vesc-stats-row').style.display =
  selectedBoard.type === 'vesc' ? 'grid' : 'none';
```

[VERIFIED: index.html line 757, read in this session]

### 4. `stopRecording()` — default save title (line ~837)

```javascript
document.getElementById('save-title').value =
  selectedBoard.type === 'onewheel' ? 'Onewheel ride' : 'EUC ride';
```

**Change needed:** Add VESC case:

```javascript
const titleMap = { onewheel: 'Onewheel ride', vesc: 'VESC ride', euc: 'EUC ride' };
document.getElementById('save-title').value = titleMap[selectedBoard.type] || 'Ride';
```

[VERIFIED: index.html line 837, read in this session]

### 5. `confirmSave()` — Firebase write (lines ~856–879)

Current fields saved for all rides: `userId`, `title`, `notes`, `boardType`, `boardModel`,
`route`, `distanceKm`, `durationSeconds`, `topSpeedKmh`, `avgSpeedKmh`, `elevGainFt`,
`elevLossFt`, `avgBattery`, `maxDutyCycle`, `startedAt`, `createdAt`.

Battery samples are accumulated per-second in `window._battSamples`; max duty in
`window._dutyMax`. Both are already set for OW; they will also work for VESC if the mock
writes to the same `boardBattery` and `boardDutyCycle` state variables.

**New field needed:** `vescVoltage` — final/avg voltage reading during the ride. Add a module-level
accumulator `window._vescVoltageSamples = []` similar to `_battSamples`. Add to Firestore write:

```javascript
vescVoltage: (window._vescVoltageSamples?.length)
  ? parseFloat((window._vescVoltageSamples.reduce((a,b)=>a+b,0)/window._vescVoltageSamples.length).toFixed(1))
  : null,
```

[VERIFIED: index.html lines 846-879, read in this session]

### 6. `renderRidesList()` / `openRide()` — board label (lines ~267, ~312)

```javascript
const boardLabel = r.boardType === 'onewheel'
  ? escHtml(`OW ${r.boardModel || ''}`.trim()) : 'EUC';
```

**Change needed:** Add VESC branch:

```javascript
const boardLabel = r.boardType === 'onewheel'
  ? escHtml(`OW ${r.boardModel || ''}`.trim())
  : r.boardType === 'vesc' ? 'VESC'
  : 'EUC';
```

Same pattern in `openRide()` for the detail modal label.

[VERIFIED: index.html lines 267, 312, read in this session]

---

## Architecture Patterns

### Mock BLE Pattern

No real BLE involved for VESC. When user clicks "Connect VESC (Mock)":

1. Set `bleConnected = true` (reuses the existing flag so GPS speed fallback stops overriding)
2. Start `setInterval` at 2000 ms generating realistic values
3. Write directly to existing DOM spans (`live-battery`, `live-temp`, `live-duty`, `live-speed`,
   `live-topspeed`) plus the new `live-voltage` span
4. Store interval ID in `bleKeepAlive` (already cleared on disconnect)

```javascript
// TODO: VESC BLE — replace this mock with real VESC protocol
// Real implementation: connect to Nordic UART Service (NUS)
//   Service UUID : 6e400001-b5a3-f393-e0a9-e50e24dcca9e
//   RX char (write): 6e400002-b5a3-f393-e0a9-e50e24dcca9e
//   TX char (notify): 6e400003-b5a3-f393-e0a9-e50e24dcca9e
// Send COMM_GET_VALUES request: [0x02, 0x01, 0x04, CRC_HI, CRC_LO, 0x03]
// Parse response (big-endian, byte offsets from payload start):
//   [0]      : command echo (0x04)
//   [1-2]    : temp_fet * 10  (Int16)  -> divide by 10 for deg C
//   [3-4]    : temp_motor * 10 (Int16) -> divide by 10 for deg C
//   [5-8]    : current_motor * 100 (Int32)
//   [9-12]   : current_in * 100 (Int32)
//   [21-22]  : duty_cycle * 1000 (Int16) -> divide by 10 for %
//   [23-26]  : rpm (Int32)
//   [27-28]  : v_in * 10 (Int16) -> divide by 10 for volts
function connectVESCMock() {
  bleConnected = true;
  setBleStatus('connected', 'VESC Mock');
  toast('VESC mock connected');
  let t = 0;
  vescMockInterval = setInterval(() => {
    t += 0.1;
    const battery  = Math.round(60 + 30 * Math.sin(t * 0.05));  // 60-90%
    const duty     = Math.round(20 + 40 * Math.abs(Math.sin(t * 0.3))); // 20-60%
    const tempC    = +(35 + 15 * Math.sin(t * 0.07)).toFixed(1); // 35-50 C
    const speedMph = +(10 + 12 * Math.abs(Math.sin(t * 0.2))).toFixed(1); // 10-22 mph
    const voltage  = +(48 + 8 * Math.sin(t * 0.04)).toFixed(1);  // 40-56 V
    boardBattery  = battery;
    boardDutyCycle = duty;
    boardTempF    = tempC * 9/5 + 32;
    boardSpeedMph = speedMph;
    if (speedMph > topSpeedMph) topSpeedMph = speedMph;
    window._vescVoltage = voltage;
    document.getElementById('live-battery').textContent  = battery + '%';
    document.getElementById('live-duty').textContent     = duty + '%';
    document.getElementById('live-temp').textContent     = (tempC * 9/5 + 32).toFixed(0) + '°';
    document.getElementById('live-speed').textContent    = speedMph.toFixed(1);
    document.getElementById('live-topspeed').textContent = topSpeedMph.toFixed(1);
    document.getElementById('live-voltage').textContent  = voltage + 'V';
  }, 2000);
}
```

[ASSUMED] — exact sinusoidal ranges are representative; user may tune

### New HTML: VESC Connect Row (pre-ride section, after `ble-row`)

```html
<!-- VESC mock connect -- only shown when VESC is selected -->
<div id="vesc-connect-row" style="display:none;margin-top:0.75rem;">
  <button class="btn-ble" id="vesc-btn" onclick="connectVESCMock()">
    <span class="ble-dot" id="vesc-dot"></span>
    Connect VESC (Mock)
  </button>
</div>
```

### New HTML: VESC Telemetry Row (active-ride section)

Mirrors `#ble-stats-row`. Battery, temp, duty, and BLE label already exist as spans reused by OW.
Voltage is new — needs its own span. Two options:

**Option A (recommended):** Add a dedicated `#vesc-stats-row` div that holds all 5 VESC metrics
(battery, duty, temp, speed, voltage) and is shown/hidden independently of `#ble-stats-row`.
This is cleaner and avoids coupling VESC/OW display logic.

```html
<!-- VESC telemetry row -- only shown for VESC -->
<div class="live-stats-secondary" id="vesc-stats-row" style="display:none;margin-top:0;">
  <div class="live-stat-sm">
    <span id="vesc-live-battery">--%</span>
    <label>battery</label>
  </div>
  <div class="live-stat-sm">
    <span id="vesc-live-duty">--%</span>
    <label>duty cycle</label>
  </div>
  <div class="live-stat-sm">
    <span id="vesc-live-temp">--&#x00B0;</span>
    <label>motor temp</label>
  </div>
  <div class="live-stat-sm">
    <span id="live-voltage">--V</span>
    <label>voltage</label>
  </div>
</div>
```

**Note:** Using separate `vesc-live-*` IDs avoids any chance of VESC mock writes colliding with
OW telemetry DOM updates if both code paths run simultaneously (they won't in practice, but it is
cleaner). The mock function writes to `vesc-live-*` for the VESC row AND to the shared `live-speed`
/ `live-topspeed` spans (which are always visible regardless of board type).

[ASSUMED] — Option A vs B is a discretion call; planner may choose shared IDs to minimise new HTML

---

## Standard Stack

This phase uses zero new libraries. Everything is native browser APIs.

| Technology | Version | Purpose |
|------------|---------|---------|
| `setInterval` / `clearInterval` | Web standard | Mock telemetry tick |
| Firebase Firestore `addDoc` | 11.0.0 (already loaded) | Save VESC ride |
| Web Bluetooth API | Already present | Real stub (not called for mock) |
| No new npm packages | — | No build toolchain |

[VERIFIED: index.html lines 17-19 — Firebase 11.0.0 already imported]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Accumulating battery/duty samples | Custom ring buffer | Reuse `window._battSamples` / `window._dutyMax` pattern already in `startRecording()` |
| BLE disconnect cleanup | Custom teardown | Reuse `clearBlePollers()` — it already clears `bleKeepAlive` |
| Connection status UI | Custom state machine | Reuse `setBleStatus(state, name)` — already handles all three states |
| Toast notifications | Custom | Reuse `toast(msg)` |
| HTML escaping | Custom | Reuse `escHtml()` |

---

## VESC BLE Protocol Reference (for stub comment)

The real VESC BLE protocol uses the **Nordic UART Service (NUS)** — a community standard from
Nordic Semiconductor, not VESC-specific.

| Item | Value |
|------|-------|
| Service UUID | `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| RX characteristic (client writes) | `6e400002-b5a3-f393-e0a9-e50e24dcca9e` |
| TX characteristic (client subscribes) | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` |
| Packet start byte (short packet) | `0x02` |
| Payload length | 1 byte |
| Stop byte | `0x03` |
| CRC | 2 bytes, CRC-16-CCITT on payload |
| Command ID for GET_VALUES | `0x04` |

**`COMM_GET_VALUES` request:** `[0x02, 0x01, 0x04, CRC_HI, CRC_LO, 0x03]`

**Response payload byte offsets** (payload starts at byte index 2, after start+length):

| Bytes | Field | Type | Scale | Result |
|-------|-------|------|-------|--------|
| 0 | command echo | uint8 | — | should be 0x04 |
| 1-2 | temp_fet | Int16 | /10 | FET temp deg C |
| 3-4 | temp_motor | Int16 | /10 | motor temp deg C |
| 5-8 | current_motor | Int32 | /100 | motor current A |
| 9-12 | current_in | Int32 | /100 | battery current A |
| 13-16 | avg_id | Int32 | /100 | |
| 17-20 | avg_iq | Int32 | /100 | |
| 21-22 | duty_cycle | Int16 | /1000 | duty 0.0–1.0 |
| 23-26 | rpm | Int32 | /1 | eRPM |
| 27-28 | v_in | Int16 | /10 | battery voltage V |
| 29-32 | amp_hours | Int32 | /10000 | |
| 33-36 | amp_hours_charged | Int32 | /10000 | |
| 37-40 | watt_hours | Int32 | /10000 | |
| 41-44 | watt_hours_charged | Int32 | /10000 | |
| 45-48 | tachometer | Int32 | /1 | |
| 49-52 | tachometer_abs | Int32 | /1 | |
| 53 | fault_code | uint8 | — | 0 = no fault |

All multi-byte values are **big-endian**.

Speed in mph from RPM: `speedMph = (rpm / motorPoles / gearRatio) * wheelCircumferenceInches * 60 / 63360`
(poles and gearing are hardware-specific — the stub should note this.)

[CITED: https://github.com/ilektron/esp32-ble-vesc-controller/blob/main/VESC%20Protocol.md]
[CITED: http://vedder.se/2015/10/communicating-with-the-vesc-using-uart/]
[CITED: https://github.com/vedderb/nrf51_vesc]

---

## Realistic Mock Telemetry Ranges (VESC)

| Metric | Realistic Range | Mock Formula |
|--------|-----------------|--------------|
| Battery % | 20–100% | `60 + 30 * sin(t * 0.05)` → 30–90% |
| Duty cycle | 0–80% | `20 + 40 * abs(sin(t * 0.3))` → 20–60% |
| Motor temp | 25–70 deg C | `35 + 15 * sin(t * 0.07)` → 20–50 deg C |
| Speed | 0–25 mph | `10 + 12 * abs(sin(t * 0.2))` → 0–22 mph |
| Voltage | 36–63 V (10S battery) | `48 + 8 * sin(t * 0.04)` → 40–56 V |

[ASSUMED] — ranges are representative for common VESC DIY e-skate setups; user will tune

---

## State Variable Additions

Three new module-level variables needed:

```javascript
let vescMockInterval = null;   // handle for mock setInterval (cleared in clearBlePollers)
let vescVoltage = null;        // current voltage reading (like boardBattery)
```

`window._vescVoltageSamples` accumulates per-second voltage readings during `timerInterval`
(same pattern as `window._battSamples`).

**`clearBlePollers()` must also clear `vescMockInterval`:**

```javascript
function clearBlePollers() {
  blePollers.forEach(clearTimeout);
  blePollers = [];
  if (bleKeepAlive) { clearInterval(bleKeepAlive); bleKeepAlive = null; }
  if (vescMockInterval) { clearInterval(vescMockInterval); vescMockInterval = null; }
}
```

[VERIFIED: clearBlePollers at index.html line 683]

---

## Common Pitfalls

### Pitfall 1: Mock interval not cleared on stop/disconnect
**What goes wrong:** `stopRecording()` navigates away but the mock interval keeps firing,
writing to DOM elements that may no longer be visible. If user starts another ride, two
intervals are running.
**Prevention:** `stopRecording()` calls `disconnectBLE()` → which calls `clearBlePollers()` →
which clears `vescMockInterval`. Verify `disconnectBLE()` is called on stop.
**Warning sign:** Console shows interval ticks after ride ends.

[VERIFIED: stopRecording at line 829 — does NOT call disconnectBLE. Must add call or inline clearBlePollers]

### Pitfall 2: `bleConnected` flag affects GPS speed fallback
**What goes wrong:** `onGpsUpdate()` checks `if (!bleConnected || boardSpeedMph == null)` to
decide whether to use GPS speed. If `bleConnected = true` for VESC mock but the mock hasn't
fired yet, GPS speed shows `0.0` for the first 2 seconds.
**Prevention:** Either set `boardSpeedMph = 0` before first mock tick, or accept 2s latency.
The 2s latency is acceptable. No action required.
[VERIFIED: onGpsUpdate at line 804]

### Pitfall 3: `selectBoard()` data-board attribute with spaces
**What goes wrong:** `document.querySelector('[data-board="vesc-VESC"]')` fails if the
attribute string contains spaces. "Pint S" and "Pint X" already work because they use a
space in the value (`data-board="onewheel-Pint S"`) — the querySelector uses an exact string
match which handles spaces fine. VESC uses no spaces, so no issue.
[VERIFIED: index.html line 737]

### Pitfall 4: `stopRecording()` default title doesn't cover 'vesc'
**What goes wrong:** `selectedBoard.type === 'onewheel' ? 'Onewheel ride' : 'EUC ride'`
— VESC gets title "EUC ride" without an explicit branch.
**Prevention:** Add VESC case (see edit point 4 above).
[VERIFIED: line 837]

### Pitfall 5: SW cache not bumped
**What goes wrong:** Users get stale cached `index.html` from the service worker.
**Prevention:** After editing `index.html`, increment `const CACHE = 'ridelogger-vXX'` in `sw.js`.
Current version: `ridelogger-v28`. Next: `ridelogger-v29`.
[VERIFIED: sw.js line 1]

### Pitfall 6: `resetRecordPage()` doesn't reset VESC row visibility
**What goes wrong:** After a ride ends and the record page resets, `#vesc-connect-row` stays
visible if the user had VESC selected.
**Prevention:** Add `if (vescRow) { vescRow.style.display = 'none'; }` to `resetRecordPage()`.
[VERIFIED: resetRecordPage at line 895]

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all changes are edits to index.html; no new tools,
services, or runtimes required).

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Sinusoidal mock ranges (30-90% batt, 40-56V, etc.) are representative | Mock Telemetry Ranges | Low — user can tune values; functional correctness not affected |
| A2 | Using separate `vesc-live-*` span IDs is preferred over reusing `live-battery` etc. | Architecture Patterns | Low — planner can choose either approach; both work |
| A3 | VESC `COMM_GET_VALUES` response byte offsets match current VESC firmware (6.x) | VESC Protocol Reference | Medium — offsets may vary between firmware versions; but this is stub documentation only, not runtime-executed code |

---

## Open Questions

1. **Should `connectVESCMock()` also set `boardSpeedMph` so the live-speed primary stat card updates?**
   - What we know: `live-speed` is in `#live-stats` (always visible primary row). The mock
     writes to it directly. `onGpsUpdate` will stop overriding once `bleConnected = true`.
   - What's unclear: Whether the user wants speed in the primary 4-card row OR only in the VESC
     telemetry secondary row.
   - Recommendation: Write to both `live-speed` (primary) and `vesc-live-speed` if added to
     VESC row. The primary row already has the span — reuse it.

2. **Should `vesc-stats-row` include speed and top-speed, or just battery/duty/temp/voltage?**
   - What we know: Speed and top-speed are already in the primary stat row (always visible).
     `ble-stats-row` only adds battery, temp, duty, and a BLE status indicator (4 cells).
   - Recommendation: Match the 4-cell grid pattern. Add battery, duty, temp, voltage as the
     4 VESC cells. Speed is already in the primary row.

---

## Sources

### Primary (HIGH confidence)
- `index.html` (read in full, 2026-05-13) — all edit points, existing patterns, variable names
- `sw.js` (read in full, 2026-05-13) — current cache version ridelogger-v28

### Secondary (MEDIUM confidence)
- [nrf51_vesc — vedderb/nrf51_vesc GitHub](https://github.com/vedderb/nrf51_vesc) — NUS UUIDs confirmed
- [VESC Protocol.md — ilektron/esp32-ble-vesc-controller](https://github.com/ilektron/esp32-ble-vesc-controller/blob/main/VESC%20Protocol.md) — packet structure
- [Communicating with VESC via UART — vedder.se](http://vedder.se/2015/10/communicating-with-the-vesc-using-uart/) — GET_VALUES fields
- [Nordic UART Service docs — pybricksdev](https://docs.pybricks.com/projects/pybricksdev/en/latest/api/ble/nus.html) — NUS UUID standard

### Tertiary (LOW confidence)
- WebSearch result for byte offsets — COMM_GET_VALUES response offsets cited from search summary; primary source is vedderb/bldc datatypes.h (not fetched)

---

## Metadata

**Confidence breakdown:**
- Codebase edit points: HIGH — index.html read in full
- Standard stack: HIGH — no new libraries
- Mock BLE pattern: HIGH — setInterval is the standard browser pattern
- VESC NUS UUIDs: HIGH — confirmed by multiple sources
- VESC GET_VALUES byte offsets: MEDIUM — cross-referenced two sources; not verified against live firmware

**Research date:** 2026-05-13
**Valid until:** 2026-06-13 (stable — no external dependencies change between now and implementation)
