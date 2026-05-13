# RideLogger

## Current Milestone: v1.1 VESC Support + UI Refresh

**Goal:** Add VESC-equipped Onewheel as a new board type with live telemetry dashboard and Firebase ride saving, and redesign the entire app UI to look dark, sporty, and professional.

**Target features:**
- VESC board option in the board selector alongside GT/Pint/XR
- Mock BLE connection streams realistic fake telemetry (battery %, duty cycle, motor temp, speed, voltage)
- Live ride screen shows all 5 VESC metrics
- Rides save to Firebase with `boardType: 'VESC'`
- Architecture stub ready for real VESC BLE protocol wiring
- Full app visual redesign: dark background, bold metric numbers, clean minimal lines

## What This Is

RideLogger is a personal PWA for tracking Onewheel (including VESC-equipped variants) and EUC rides. It connects to the board over BLE to stream real-time telemetry (speed, battery, temperature, duty cycle), records GPS routes, saves rides to Firebase Firestore, and displays ride history with embedded maps. It lives entirely in a single `index.html` with no build step.

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
- ✓ No garbled/strange characters anywhere in the app — all non-ASCII bytes replaced (Validated in Phase 2: Encoding Fix & Deploy)
- ✓ BLE auth handled correctly per board model — Pint skips auth, GT/GTS use f3fe/f3ff (Validated in Phase 1: Pint BLE Telemetry Fix)

### Active

- [ ] VESC-01: User can select VESC as a board type from the board selector
- [ ] VESC-02: App connects to a mock VESC BLE device and streams battery %, duty cycle, motor temp, speed, and voltage
- [ ] VESC-03: Live ride screen displays all 5 VESC telemetry values in real time
- [ ] VESC-04: Completed VESC ride saves to Firebase with boardType: 'VESC' and all telemetry fields
- [ ] VESC-05: Codebase has a clearly marked stub for replacing mock BLE with real VESC protocol
- [ ] UI-01: App-wide visual redesign applied — dark background, bold metric numbers, clean minimal layout
- [ ] UI-02: Live ride screen, ride history, and board selector all reflect new design

### Out of Scope

- iOS / Firefox BLE support — Web Bluetooth API is Chrome/Edge-only; not fixable in app code
- EUC-specific BLE protocol — different characteristic set, not in scope for this milestone
- Simultaneous multi-board connection — single board per session only
- Real VESC BLE protocol wiring — deferred to tonight when user has board; mock covers this milestone
- VESC-specific ride history filtering — all rides display together, boardType is stored for future use

## Context

- **Stack**: Vanilla JS ES module, Firebase 11, Leaflet 1.9.4, all loaded via CDN — no npm, no build
- **VESC mock**: Mock BLE will generate realistic sinusoidal/random values to simulate a ride in motion
- **Known naming bug**: `topSpeedKmh` / `avgSpeedKmh` Firestore fields store mph values — not blocking but a latent confusion risk

## Constraints

- **Tech stack**: No build toolchain — all changes go directly in `index.html` and `sw.js`
- **BLE**: Physical VESC board available tonight; mock covers development until then
- **Deployment**: Static hosting (Firebase Hosting); `sw.js` cache version must be bumped on every deploy

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Single-file architecture (no build) | Simplicity — zero setup, instant deploy | ✓ Good |
| Board-specific BLE auth (Pint skips, GT/GTS use f3fe/f3ff) | Pint firmware doesn't implement the auth challenge | ✓ Fixed in Phase 1 |
| Poll slow telemetry every 5s on Pint | Pint only notifies on change; polling ensures fresh values | ✓ Fixed in Phase 1 |
| Same Firebase rides collection for VESC | Simpler queries; boardType field distinguishes board types | — Decided v1.1 |
| Mock BLE for VESC development | No board available during development; real protocol wired tonight | — Decided v1.1 |
| Dark sporty minimal UI theme | User preference — professional and readable at a glance | — Decided v1.1 |

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
*Last updated: 2026-05-13 — Milestone v1.1 VESC Support + UI Refresh started*
