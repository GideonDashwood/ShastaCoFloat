# RideLogger — Project Guide

## What This Is

Single-file PWA for tracking Onewheel and EUC rides. BLE telemetry (speed, battery, duty cycle, temperature), GPS route recording, Firebase Firestore backend, Leaflet maps. No build step — all code lives in `index.html` and `sw.js`.

## Current Focus

**Bug Fix Milestone — 2 phases**

- Phase 1: Fix Pint BLE telemetry (battery/duty/temp stuck at 0 — auth regression)
- Phase 2: Fix garbled encoding characters throughout UI

See `.planning/ROADMAP.md` for phase details and success criteria.

## GSD Workflow

This project uses the Get Shit Done workflow. Planning artifacts live in `.planning/`.

**Active phase:** Phase 1 — Pint BLE Telemetry Fix
**Mode:** YOLO (auto-approve, execute without confirmation)
**Granularity:** Coarse

### Phase commands
- `/gsd-plan-phase 1` — plan Phase 1 in detail
- `/gsd-execute-phase 1` — execute Phase 1 plans
- `/gsd-verify-work` — verify phase goal achieved
- `/gsd-progress` — check current status

## Key Technical Context

### The BLE regression (Phase 1)
`tryGTUnlock()` in `index.html` (~line 393) runs for ALL board models, but Pint doesn't support the f3fe/f3ff auth challenge. This blocks the GATT queue and starves telemetry reads.

Fix: `if (OW_GT_MODELS.has(selectedBoard.model)) await tryGTUnlock(bleService);`

`OW_GT_MODELS = new Set(['GT', 'GTS', 'GTS-XL'])` is already defined at line 79.

### The encoding bug (Phase 2)
Non-ASCII bytes baked into `index.html` at lines 81, 438, 477, 525, 587, 588, 1390, 1398+.
- `â†'` → `&rarr;` or `→`
- `â€"` → `&mdash;` or `—`
- `Â°` → `&deg;` or `°`

Detect: `Select-String -Path index.html -Pattern '[^\x00-\x7F]'`

### Always bump SW version
After any change to `index.html`, increment the cache version in `sw.js`:
`const CACHE = 'ridelogger-v20';` → `ridelogger-v21` etc.

### Commit and push after every change
Per project convention: bump SW version → commit → push after each change.

## Architecture

- `index.html` — entire app (~1716 lines): Firebase init, BLE, GPS, Leaflet, all UI
- `sw.js` — 33-line service worker, cache-first, version `ridelogger-v20`
- `manifest.json` — PWA manifest
- No npm, no build, no node_modules

## Constraints

- No build toolchain — edit files directly
- Physical Pint board required to test BLE changes
- Firestore security rules must be locked (API key is client-side)
