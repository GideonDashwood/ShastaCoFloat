# Architecture

## System Overview
RideLogger is a client-only PWA with no backend server. All logic runs in the browser. Firebase (Auth + Firestore) provides identity and cloud storage. BLE (Web Bluetooth API) communicates with the Onewheel board in real time. GPS (Geolocation API) collects route points. Leaflet renders route maps. A service worker provides offline asset caching.

## Major Subsystems

### Auth (line 130)
- Firebase Email/Password authentication
- `onAuthStateChanged` drives app state transitions (show login vs. show app)
- `currentUser` module-level variable tracks signed-in user

### Navigation (line 215)
- Single-page app with manual show/hide of page sections (`page-home`, `page-live`, `page-log`, `page-profile`)
- No routing library — DOM `display` toggling only
- `showPage(id)` switches the active view

### Rides / History (lines 234–359)
- `loadRides()` queries Firestore `rides` collection filtered by `userId`, ordered by `date` desc
- Ride cards rendered via innerHTML template literals
- `allRides` module-level array caches fetched rides

### Ride Detail (lines 285–359)
- Modal-style detail view with embedded Leaflet map (`modalMapInstance`)
- Reads route GeoJSON from the Firestore ride document
- Allows ride deletion via `deleteDoc`

### BLE — Onewheel Communication (lines 360–639)
- Entry point: `connectBLE()` via Web Bluetooth `requestDevice` filtered to Onewheel service UUID
- Auth handshake: `tryGTUnlock()` — listens on `f3fe` (challenge notify), responds on `f3ff` (write) using XOR/echo with board serial (`f318`)
- Subscriptions: RPM (`f302`), Battery (`f303`), Duty Cycle (`f30d`), Temp (`f310`) via BLE notifications
- Polling fallback: `startTelemetryPolling()` polls slow characteristics every 5s (for Pint/XR boards that don't push notifications)
- Speed calculation: `onRpmData` converts RPM → mph using model-specific wheel circumference constant (`OW_WHEEL_CIRC`)
- Diagnostic panel: `bleDiag()` logs BLE events to `#ble-diag` textarea

### Recording (lines 640–812)
- `startRecording()` initializes state, starts GPS watch (`navigator.geolocation.watchPosition`)
- Live map: Leaflet polyline built incrementally as GPS points arrive
- BLE telemetry flows into module-level state (`boardSpeedMph`, `boardBattery`, `boardTempF`, `boardDutyCycle`)
- `window._battSamples` / `window._dutyMax` — closure bridge for battery samples between BLE callbacks and save flow
- `stopRecording()` / `saveRide()` — assembles ride document and writes to Firestore

### Manual Log (lines 813–855)
- Form-based manual ride entry (no GPS/BLE)
- Writes same Firestore document structure as recorded rides

### Profile (lines 856–878)
- Displays user email, total stats aggregated from `allRides`
- Firebase `updateProfile` for display name

### Helpers / Theme (lines 88–129, 879+)
- `toggleTheme()` — dark/light via `data-theme` attribute + localStorage
- `updateMapTiles()` — swaps Leaflet tile layer on theme change
- `toast(msg)` — ephemeral notification overlay
- `formatDuration()`, `formatDate()` — display utilities

## Data Flow

```
BLE Device
  → Web Bluetooth notifications
  → onRpmData / onBattData / onDutyData / onTempData
  → module-level state (boardSpeedMph, boardBattery, ...)
  → live UI update (innerHTML / textContent)
  → on stop: assembled into Firestore ride document

GPS (Geolocation API)
  → watchPosition callback
  → routePoints[] array
  → Leaflet polyline update
  → on stop: route embedded in Firestore document

Firestore
  → rides collection (per userId)
  → ride document: { date, distanceMi, durationMs, topSpeedKmh*, avgSpeedKmh*, route[], battery, temp, ... }
  (* field names say Kmh but store mph values — known naming bug)
```

## State Management
All state is module-level variables within the ES module script block in index.html. No reactive framework, no store pattern. State mutated directly by event handlers and BLE/GPS callbacks.

## Offline / PWA Strategy
- Service worker (`sw.js`, cache `ridelogger-v20`) — cache-first for static assets (/, /index.html, /manifest.json)
- Network-first fallback for Firebase/Google CDN requests
- SW posts `SW_UPDATED` message to all open windows on activation — app can prompt user to reload
- No offline write queue — Firestore writes fail silently if offline
