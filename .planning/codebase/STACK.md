# Technology Stack

**Analysis Date:** 2026-05-12

## Frontend

**Language:** Vanilla JavaScript (ES2022+) — no transpilation, no framework
- Uses ES modules (`type="module"`) directly in `<script>` in `index.html`
- `async/await`, optional chaining, nullish coalescing, template literals throughout

**Framework:** None — vanilla DOM manipulation via `document.getElementById`, `querySelector`, `innerHTML` assignment

**CSS:** Vanilla CSS with custom properties (CSS variables)
- Dual theme system via `[data-theme="dark"]` / `[data-theme="light"]` attribute selectors on `<body>`
- CSS variables defined in `:root` and overridden per theme
- Theme persisted in `localStorage` under key `rl-theme`
- All styles inlined in `<style>` block inside `index.html`

**Build:** None — zero build step, no bundler, no transpiler
- Single-file app: all HTML, CSS, and JavaScript in `index.html`
- No `package.json`, no `node_modules`, no npm/yarn/pnpm

## Runtime / Browser APIs

- **Web Bluetooth API** (`navigator.bluetooth`) — connects to Onewheel boards over BLE GATT
- **Geolocation API** (`navigator.geolocation.watchPosition`) — real-time GPS tracking with high accuracy
- **Service Worker API** (`navigator.serviceWorker`) — offline caching via `sw.js`, cache version `ridelogger-v20`
- **Cache API** (`caches`) — used in `sw.js` for static asset and network-first fetch caching
- **Web Share API** (`navigator.share`) — share ride links on supported mobile browsers
- **Clipboard API** (`navigator.clipboard.writeText`) — fallback link copy when Share API unavailable
- **SessionStorage** — used to pass pending ride data between recording and save flow
- **localStorage** — persists theme preference (`rl-theme`)

## Data / Storage

- **Firebase Firestore** — primary cloud database; stores ride documents in `rides` collection
- **Firebase Auth** — user identity (email/password)
- **No local database** — no IndexedDB, no SQLite; all persistence is Firestore or browser storage primitives

## Fonts & Maps (CDN)

**Google Fonts (CDN):**
- `Space Mono` (400, 700) — monospace, used for headings, numeric stats
- `DM Sans` (300, 400, 500, 600) — sans-serif body font
- Loaded via `https://fonts.googleapis.com/css2?...`

**Leaflet (CDN):**
- Version: `1.9.4`
- CSS: `https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css`
- JS: `https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js`
- Loaded as a classic (non-module) script; accessed via global `L`

## Dev Tooling

- **No build tools** — edit `index.html` directly, deploy as static files
- **No linter or formatter configuration** detected
- **No test framework** detected
- **Service worker versioning** used as deployment signal: bump `CACHE` constant in `sw.js` to invalidate caches and trigger `SW_UPDATED` postMessage to all clients

## Versions & Constraints

| Item | Version / Detail |
|---|---|
| Firebase JS SDK | 11.0.0 (loaded from `gstatic.com` CDN, ES module) |
| Leaflet | 1.9.4 (jsDelivr CDN, classic script) |
| Service Worker cache | `ridelogger-v20` |
| Browser requirements | Chrome/Edge (Web Bluetooth); Safari excluded (no BLE support) |
| PWA manifest | `manifest.json` — standalone display, portrait orientation |
| Icons | `icon-192.png`, `icon-512.png` |

## Platform Requirements

**Development:**
- Any static file server or direct file open in browser
- Web Bluetooth requires Chrome or Chromium-based browser
- HTTPS required in production for ServiceWorker and Web Bluetooth API

**Production:**
- Static hosting (no server-side runtime required)
- Firebase project: `shastacofloat` (Firebase Hosting assumed)
- Cached assets: `/`, `/index.html`, `/manifest.json`

---

*Stack analysis: 2026-05-12*
