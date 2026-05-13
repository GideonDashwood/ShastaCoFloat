# Requirements — Milestone v1.1 VESC Support + UI Refresh

## VESC Board Support

- [ ] **VESC-01**: User can select "VESC" as a board type from the board selector alongside GT, GTS, XR, and Pint
- [ ] **VESC-02**: App simulates a BLE connection to a VESC board using a mock that streams realistic fake telemetry (battery %, duty cycle, motor temp, speed, voltage) at regular intervals
- [ ] **VESC-03**: Live ride screen displays all 5 VESC telemetry values (battery %, duty cycle, motor temp, speed, voltage) updating in real time during a mock-connected session
- [ ] **VESC-04**: When the user ends a ride, the completed VESC ride saves to Firebase Firestore in the existing `rides` collection with `boardType: 'VESC'` and all 5 telemetry fields
- [ ] **VESC-05**: The VESC BLE connection code has a clearly marked stub comment block indicating where the real VESC protocol replaces the mock

## UI & Design

- [ ] **UI-01**: The entire app is restyled with a dark background, bold large metric numbers, and clean minimal layout — dark, sporty, and professional throughout
- [ ] **UI-02**: The live ride screen, ride history list, board selector, and ride detail view all reflect the new design consistently

## Future Requirements (not this milestone)

- Real VESC BLE protocol over Web Bluetooth — requires physical board to develop and test
- VESC-specific ride history filtering or stats — boardType field stored now, filtering deferred
- EUC board support — different protocol, different milestone
- iOS/Firefox BLE support — not possible with current Web Bluetooth API

## Out of Scope

- **Real VESC BLE wiring** — mock only for this milestone; user will wire real protocol separately
- **VESC ride history filtering** — all rides show together; boardType tag is future-proofing
- **EUC protocol** — out of scope for this milestone
- **Multi-board simultaneous connection** — single board per session
- **iOS/Firefox support** — Web Bluetooth API constraint

## Traceability

| Requirement | Phase |
|-------------|-------|
| VESC-01 | Phase 3 |
| VESC-02 | Phase 3 |
| VESC-03 | Phase 3 |
| VESC-04 | Phase 3 |
| VESC-05 | Phase 3 |
| UI-01 | Phase 4 |
| UI-02 | Phase 4 |

---

## Previous Milestone: Bug Fix (v1.0)

### BLE Telemetry (Pint) — All Validated ✓

- ✓ **BLE-01**: User connects Pint board without auth attempt — f3fe/f3ff auth handshake skipped for non-GT models
- ✓ **BLE-02**: Battery percentage displays and updates on Pint live ride screen within 5 seconds of connecting
- ✓ **BLE-03**: Duty cycle displays and updates on Pint live ride screen within 5 seconds of connecting
- ✓ **BLE-04**: Temperature shows a correct realistic value on Pint live ride screen
- ✓ **BLE-05**: Telemetry poller errors appear in the BLE diagnostic panel

### Encoding — All Validated ✓

- ✓ **ENC-01**: Live ride screen displays special characters correctly
- ✓ **ENC-02**: Ride detail view displays special characters correctly
- ✓ **ENC-03**: All non-ASCII bytes removed from index.html source

### Deployment — Validated ✓

- ✓ **DEPLOY-01**: Service worker cache bumped so users receive fixed version on next visit
