# RideLogger

## What This Is

RideLogger is a personal PWA for tracking Onewheel and EUC rides. It connects to the board over BLE to stream real-time telemetry (speed, battery, temperature, duty cycle), records GPS routes, saves rides to Firebase Firestore, and displays ride history with embedded maps. It lives entirely in a single `index.html` with no build step.

## Core Value

A connected ride with accurate, readable telemetry — battery, duty cycle, temp, and speed updating live while GPS traces the route.

## Requirements

### Validated

- ✓ Firebase email/password authentication — existing
- ✓ BLE connection to Onewheel boards (GT/GTS/XR/Pint family) — existing
- ✓ GPS route recording with live Leaflet map — existing
- ✓ Real-time speed display (RPM × wheel circumference) — existing
- ✓ Ride save to Firestore with route data — existing
- ✓ Ride history list with per-ride map view — existing
- ✓ Manual ride logging (no GPS/BLE) — existing
- ✓ User profile with aggregate stats — existing
- ✓ Dark/light theme toggle — existing
- ✓ PWA with service worker offline caching — existing

### Active

- [ ] Battery percentage displays and updates correctly on Pint during live rides (requires physical Pint test)
- [ ] Duty cycle displays and updates correctly on Pint during live rides (requires physical Pint test)
- [ ] Temperature displays the correct value on Pint during live rides (requires physical Pint test)

### Validated

- ✓ No garbled/strange characters anywhere in the app -- all non-ASCII bytes replaced with HTML entities and JS Unicode escapes (Validated in Phase 2: Encoding Fix & Deploy)
- ✓ BLE auth handled correctly per board model (Pint skips auth; GT/GTS use f3fe/f3ff handshake) (Validated in Phase 1: Pint BLE Telemetry Fix)

### Out of Scope

- iOS / Firefox BLE support — Web Bluetooth API is Chrome/Edge-only; not fixable in app code
- EUC-specific BLE protocol — different characteristic set, not in scope for this milestone
- Simultaneous multi-board connection — single board per session only

## Context

- **Stack**: Vanilla JS ES module, Firebase 11, Leaflet 1.9.4, all loaded via CDN — no npm, no build
- **Pint regression**: Commit `d631607` ("Use f3fe/f3ff for BLE auth on all boards") reversed the Pint-specific fix from `3ca1474` ("Fix Pint BLE: skip auth"). Pint does not support the auth challenge, so forcing auth blocks telemetry subscription.
- **Encoding bug**: Recent edits introduced garbled UTF-8 characters (e.g., `â†'` instead of `→`, `â€"` instead of `—`) on the live ride screen and ride detail view. Likely a copy-paste or editor encoding mismatch in `index.html`.
- **Pint polling**: Pint boards don't push BLE notifications on value change for slow characteristics — they require the app to poll. `startTelemetryPolling()` was added for this but may not be correctly reading battery/duty/temp values.
- **Known naming bug**: `topSpeedKmh` / `avgSpeedKmh` Firestore fields store mph values — not blocking but a latent confusion risk.

## Constraints

- **Tech stack**: No build toolchain — all changes go directly in `index.html` and `sw.js`
- **BLE**: Physical Pint board required for full end-to-end testing; no emulator available
- **Deployment**: Static hosting (Firebase Hosting or equivalent); `sw.js` cache version must be bumped on every deploy

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single-file architecture (no build) | Simplicity — zero setup, instant deploy | ✓ Good |
| Board-specific BLE auth (Pint skips, GT/GTS use f3fe/f3ff) | Pint firmware doesn't implement the auth challenge | — Pending (regression to fix) |
| Poll slow telemetry every 5s on Pint | Pint only notifies on change; polling ensures fresh values | — Pending (may not be working correctly) |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-12 after Phase 2 (Encoding Fix & Deploy) completion -- Bug Fix milestone complete*
