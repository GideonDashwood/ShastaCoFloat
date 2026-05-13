# RideLogger — Bug Fix Milestone

## Phases

- [ ] **Phase 1: Pint BLE Telemetry Fix** — Guard GT-only auth from Pint connects; surface poller errors in the BLE diagnostic panel
- [ ] **Phase 2: Encoding Fix & Deploy** — Replace all garbled non-ASCII characters with correct entities/escapes and ship a bumped service worker

---

## Phase Details

### Phase 1: Pint BLE Telemetry Fix
**Goal**: Pint board connects cleanly without auth interference and streams accurate battery, duty cycle, and temperature to the live ride screen within 5 seconds.
**Mode**: mvp
**Depends on**: Nothing (first phase)
**Requirements**: BLE-01, BLE-02, BLE-03, BLE-04, BLE-05
**Plans**: 1 plan
**Success Criteria** (what must be TRUE):
  1. Connecting a Pint board does not trigger the f3fe/f3ff auth handshake — the BLE diagnostic panel shows no "challenge" log line.
  2. Battery percentage shows a realistic non-zero value on the live ride screen within 5 seconds of connecting the Pint.
  3. Duty cycle and temperature both display realistic values on the live ride screen (duty cycle non-zero while riding; temperature in a plausible range).
  4. When a poller read fails, the error message appears in the BLE diagnostic panel instead of disappearing silently.

Plans:
- [ ] 01-ble-auth-guard-PLAN.md — Guard tryGTUnlock to GT/GTS/GTS-XL models, surface poller errors, bump SW version, commit + push

### Phase 2: Encoding Fix & Deploy
**Goal**: All garbled characters are replaced with correct glyphs throughout the app and the fix is delivered to users via a bumped service worker cache.
**Mode**: mvp
**Depends on**: Phase 1
**Requirements**: ENC-01, ENC-02, ENC-03, DEPLOY-01
**Plans**: TBD
**Success Criteria** (what must be TRUE):
  1. The live ride screen shows correct special characters (→, °, —) with no garbled sequences like `â†'` or `Â°`.
  2. The ride detail view shows correct special characters with no garbled sequences.
  3. A PowerShell scan (`Select-String -Path index.html -Pattern '[^\x00-\x7F]'`) returns zero matches, confirming no non-ASCII bytes remain in the source.
  4. A returning user on Chrome receives the fixed build automatically on their next visit (service worker cache version is bumped).

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Pint BLE Telemetry Fix | 0/1 | Not started | - |
| 2. Encoding Fix & Deploy | 0/1 | Not started | - |
