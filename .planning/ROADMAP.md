# RideLogger — Milestone v1.1: VESC Support + UI Refresh

## Phases

- [ ] **Phase 3: VESC Board Type + Mock BLE** — Add VESC to the board selector, connect via mock BLE, stream fake telemetry, save rides to Firebase
- [ ] **Phase 4: UI Redesign** — Replace the current plain UI with a dark, sporty, minimal design across the entire app

---

## Phase Details

### Phase 3: VESC Board Type + Mock BLE
**Goal**: User can select VESC as a board type, "connect" to a mock BLE device, see 5 live telemetry values updating on the ride screen, and save a completed ride to Firebase tagged as VESC.
**Mode**: mvp
**Depends on**: Nothing (continues from Bug Fix milestone)
**Requirements**: VESC-01, VESC-02, VESC-03, VESC-04, VESC-05
**Plans**: TBD
**Success Criteria** (what must be TRUE):
  1. "VESC" appears in the board selector dropdown and can be selected.
  2. Clicking "Connect" with VESC selected triggers the mock connection (no real BLE scan needed) and the app transitions to the live ride screen.
  3. Battery %, duty cycle, motor temp, speed, and voltage all display on the live ride screen with realistic values updating every ~2 seconds.
  4. Ending the ride writes a document to the Firebase `rides` collection that includes `boardType: 'VESC'` and all 5 telemetry fields.
  5. The mock BLE implementation has a clearly marked `// TODO: VESC BLE — replace this mock with real VESC protocol` stub block.

### Phase 4: UI Redesign
**Goal**: The entire app is restyled with a dark, sporty, minimal aesthetic — dark background, bold metric numbers, clean layout — applied consistently across all screens.
**Mode**: mvp
**Depends on**: Phase 3 (so redesign applies to VESC screens too)
**Requirements**: UI-01, UI-02
**Plans**: TBD
**Success Criteria** (what must be TRUE):
  1. App background is dark (#111 or similar) instead of white/light, making it look like a performance dashboard.
  2. Live metric values (speed, battery, duty cycle, temp) are displayed in large, bold, high-contrast numbers — easily readable at a glance.
  3. The board selector, live ride screen, ride history list, and ride detail view all use the new design consistently.
  4. The app looks polished and professional — no plain unstyled elements, consistent spacing, clear visual hierarchy.
  5. The new design applies to both the Onewheel boards and the VESC board screens.

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Pint BLE Telemetry Fix | 1/1 | Complete | 2026-05-12 |
| 2. Encoding Fix & Deploy | 1/1 | Complete | 2026-05-12 |
| 3. VESC Board Type + Mock BLE | 0/? | Not started | — |
| 4. UI Redesign | 0/? | Not started | — |
