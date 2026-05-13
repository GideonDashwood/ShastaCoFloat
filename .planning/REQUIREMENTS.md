# Requirements — RideLogger Bug Fix Milestone

## v1 Requirements

### BLE Telemetry (Pint)

- [ ] **BLE-01**: User connects Pint board without auth attempt — f3fe/f3ff auth handshake is skipped for non-GT models (Pint, Pint S, Pint X, XR, XR-C)
- [ ] **BLE-02**: Battery percentage displays and updates on Pint live ride screen within 5 seconds of connecting
- [ ] **BLE-03**: Duty cycle displays and updates on Pint live ride screen within 5 seconds of connecting
- [ ] **BLE-04**: Temperature shows a correct realistic value on Pint live ride screen (formula is correct; fix unblocks the reads)
- [ ] **BLE-05**: Telemetry poller errors appear in the BLE diagnostic panel instead of being silently discarded

### Encoding

- [ ] **ENC-01**: Live ride screen displays special characters correctly (→, °, —, emoji where used)
- [ ] **ENC-02**: Ride detail view displays special characters correctly
- [ ] **ENC-03**: All non-ASCII bytes are removed from index.html source (verified by scan)

### Deployment

- [ ] **DEPLOY-01**: Service worker cache version is bumped so users receive the fixed version on next visit

## v2 (Deferred)

- XR/XR-C auth behavior verified independently (assumed same as Pint — no auth — but untested)
- GT/GTS/GTS-XL telemetry regression tested after Pint fix (auth still applies, must not break)
- Offline write queue for Firestore (rides fail silently when offline)
- `topSpeedKmh`/`avgSpeedKmh` field naming corrected in Firestore schema

## Out of Scope

- iOS / Firefox BLE support — Web Bluetooth API limitation, not fixable in app code
- EUC-specific BLE protocol — different characteristic set, separate milestone
- Test suite / CI pipeline — no build toolchain; manual testing only

## Traceability

| REQ-ID | Phase | Notes |
|--------|-------|-------|
| BLE-01 | Phase 1 | Core regression fix |
| BLE-02 | Phase 1 | Unblocked by BLE-01 |
| BLE-03 | Phase 1 | Unblocked by BLE-01 |
| BLE-04 | Phase 1 | Unblocked by BLE-01 |
| BLE-05 | Phase 1 | Diagnostic improvement alongside fix |
| ENC-01 | Phase 2 | Encoding sweep |
| ENC-02 | Phase 2 | Encoding sweep |
| ENC-03 | Phase 2 | Encoding sweep |
| DEPLOY-01 | Phase 2 | Always last step |
