# Project Structure

## File Tree
```
ShastaCoFloat/
├── index.html        — entire application (HTML + CSS + JS, ~1716 lines, single ES module)
├── sw.js             — service worker: cache-first PWA, 33 lines, cache name ridelogger-v{N}
├── manifest.json     — PWA manifest (name, icons, display, theme_color)
├── icon-192.png      — PWA home screen icon (192×192)
├── icon-512.png      — PWA home screen icon (512×512)
└── .claude/
    └── settings.local.json  — Claude Code project permissions
```

No build step. No package.json. No node_modules. Deployed as static files.

## Key Sections in index.html

| Line | Section | Purpose |
|------|---------|---------|
| 1–37 | HTML head | CDN imports: Leaflet CSS/JS, Google Fonts, Firebase SDK (ESM from gstatic CDN) |
| 20–23 | SAVE_MODE | URL param `?save=1` strips Leaflet (dead/unused code path) |
| 25–36 | Firebase config | Hardcoded API key + project config, app + auth + db initialization |
| 38–87 | STATE | All module-level variables: user, BLE state, ride state, GPS state, elevation |
| 69–86 | BLE UUIDs | Onewheel service and characteristic UUID constants + wheel circumference map |
| 88–129 | THEME | Dark/light toggle, localStorage persistence, map tile swap |
| 130–202 | AUTH | Firebase email/password sign in/up/out, onAuthStateChanged handler |
| 203–214 | INIT | App initialization after DOM ready |
| 215–233 | NAVIGATION | `showPage()` — show/hide page sections |
| 234–284 | RIDES | `loadRides()`, ride list rendering, Firestore query |
| 285–359 | RIDE DETAIL | Ride modal, embedded Leaflet map, ride delete |
| 360–639 | BLE | connectBLE, tryGTUnlock auth, subscribeChar, telemetry callbacks, polling |
| 640–812 | RECORD | Board selection, startRecording, GPS watch, live map, stopRecording, saveRide |
| 813–855 | LOG RIDE | Manual ride entry form + Firestore write |
| 856–878 | PROFILE | User stats display, display name update |
| 879+ | HELPERS | toast(), formatDuration(), formatDate(), theme utilities |
| ~900+ | HTML body | All page section markup: login, home, live, log, profile, modals |

## External Dependencies (CDN, no local install)
- **Leaflet 1.9.4** — map rendering (jsdelivr CDN)
- **Firebase 11.0.0** — Auth + Firestore (gstatic ESM CDN)
- **Google Fonts** — Space Mono, DM Sans
