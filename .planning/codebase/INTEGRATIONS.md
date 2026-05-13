# External Integrations

**Analysis Date:** 2026-05-12

---

## Firebase Authentication

- **Purpose:** User sign-up, sign-in, sign-out, and session management
- **SDK/Version:** Firebase JS SDK 11.0.0 (ES module, loaded from `https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js`)
- **Auth method:** Email/password (`createUserWithEmailAndPassword`, `signInWithEmailAndPassword`)
- **Key config:** `firebaseConfig` object inline in `index.html` (lines 25-32)
  - `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`
  - Firebase project ID: `shastacofloat`
  - Auth domain: `shastacofloat.firebaseapp.com`
- **Usage notes:**
  - `onAuthStateChanged` drives the entire app auth gate — toggles `#auth-screen` / `#app-screen`
  - `updateProfile` sets `displayName` on sign-up
  - User initials derived from `currentUser.displayName` and shown in avatar

---

## Firebase Firestore

- **Purpose:** Cloud persistence for all ride records
- **SDK/Version:** Firebase JS SDK 11.0.0 (`https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js`)
- **Auth method:** Authenticated via Firebase Auth UID; Firestore rules expected to filter by `userId`
- **Key config:** Same `firebaseConfig` as Auth; `db = getFirestore(app)`
- **Collection:** `rides` — each document contains:
  - `userId` (string, Auth UID)
  - `title`, `notes` (string)
  - `boardType` (`"onewheel"` | `"euc"`), `boardModel` (string|null)
  - `route` (array of `{lat, lng, ts}`)
  - `distanceKm`, `durationSeconds`, `topSpeedKmh`, `avgSpeedKmh` (number)
  - `elevGainFt`, `elevLossFt` (number)
  - `avgBattery`, `maxDutyCycle` (number|null, Onewheel-only)
  - `startedAt`, `createdAt` (ISO 8601 string)
- **Usage notes:**
  - `addDoc` — save new ride
  - `getDocs` + `query`/`where`/`orderBy` — load user's rides
  - `deleteDoc` — delete a ride
  - Client-side sort by `startedAt` descending after fetch (no server `orderBy` on load)
  - Board filter applied client-side after full fetch

---

## Web Bluetooth API (BLE — Onewheel)

- **Purpose:** Real-time telemetry from Onewheel boards (speed, battery, temperature, duty cycle)
- **SDK/Version:** Browser-native `navigator.bluetooth` (Web Bluetooth API) — no external SDK
- **Auth method:** GATT auth handshake over BLE characteristics `f3fe` (challenge) / `f3ff` (response)
- **Key config (UUIDs defined in `index.html` lines 70-78):**

  | Constant | UUID | Purpose |
  |---|---|---|
  | `OW_SERVICE` | `e659f300-ea98-11e3-ac10-0800200c9a66` | Primary GATT service |
  | `OW_CHAR_RPM` | `e659f302-...` | Motor RPM → speed |
  | `OW_CHAR_BATT` | `e659f303-...` | Battery percent |
  | `OW_CHAR_DUTY` | `e659f30d-...` | Duty cycle |
  | `OW_CHAR_TEMP` | `e659f310-...` | Controller temperature |
  | `OW_CHAR_AUTH_IN` | `e659f3fe-...` | Auth challenge (notify) |
  | `OW_CHAR_AUTH_OUT` | `e659f3ff-...` | Auth response (write) |
  | `OW_CHAR_SERIAL` | `e659f318-...` | Board serial identifier |

- **Supported board models:** GTS-XL, GTS, GT, XR-C, XR, Pint S, Pint X, Pint
- **Usage notes:**
  - Auth: subscribes to `f3fe` notification; board sends challenge bytes; app tries 5 response candidates (XOR variants + CRX literal)
  - Notifications subscribed on connect; 5-second polling fallback for battery/duty/temp on boards that only notify on change (Pint/XR)
  - Speed calculated from RPM × tire circumference (inches/rev, model-specific) in `OW_WHEEL_CIRC`
  - Diagnostic panel (`#ble-diag`) logs all BLE events to UI for debugging
  - EUC boards: BLE not used (GPS-only)
  - Requires Chrome/Chromium; Safari not supported

---

## Geolocation API (GPS)

- **Purpose:** Real-time route tracking and speed measurement during rides
- **SDK/Version:** Browser-native `navigator.geolocation` — no external SDK
- **Auth method:** Browser permission prompt on first use
- **Key config:** `watchPosition` options: `enableHighAccuracy: true`, `maximumAge: 2000ms`, `timeout: 10000ms`
- **Usage notes:**
  - Route points stored as `{lat, lng, ts}` array in memory during recording
  - Speed: prefers BLE board speed when connected; falls back to GPS `speed` field; then estimates via haversine between last two points
  - Altitude tracked for elevation gain/loss; ignored if `altitudeAccuracy >= 30m`
  - Distance computed via Haversine formula (returns miles, stored as km in Firestore)

---

## Leaflet (Map Library)

- **Purpose:** Interactive map display during live recording and in ride detail modal
- **SDK/Version:** Leaflet 1.9.4 (loaded from jsDelivr CDN as classic script; global `L`)
  - CSS: `https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css`
  - JS: `https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js`
- **Auth method:** None
- **Tile providers:**
  - Dark theme: CartoDB Dark Matter — `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
  - Light theme: OpenStreetMap — `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
  - Both: `maxZoom: 19`
- **Usage notes:**
  - Multiple map instances tracked in `mapInstances[]` array; cleaned up on navigation to prevent memory leaks
  - `recordMap` — live recording map (`#record-map`); route drawn as orange polyline
  - `modalMapInstance` — ride detail modal map (`#modal-map`); route in green with start/end circle markers
  - Leaflet stripped from DOM in `SAVE_MODE` (`?save=1` query param) to reduce load

---

## Google Fonts

- **Purpose:** Typography — `Space Mono` (monospace stats/headings) and `DM Sans` (body)
- **SDK/Version:** Google Fonts CSS API v2
  - `https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:wght@300;400;500;600&display=swap`
- **Auth method:** None
- **Usage notes:** Loaded via `<link>` with `preconnect` hints to `fonts.googleapis.com` and `fonts.gstatic.com`; served by gstatic CDN; bypassed by service worker (network-first with cache fallback)

---

## Web Share / Clipboard API

- **Purpose:** Share individual ride links
- **SDK/Version:** Browser-native
- **Auth method:** None
- **Usage notes:**
  - Share URL format: `{origin}{pathname}?ride={rideId}`
  - `navigator.share` used on mobile; falls back to `navigator.clipboard.writeText` on desktop

---

## Service Worker (Offline Caching)

- **Purpose:** PWA offline support; cache-first for app shell, network-first for Firebase/Google CDN resources
- **File:** `sw.js`
- **Cache key:** `ridelogger-v20` (version bump = deployment signal; triggers `SW_UPDATED` postMessage to all open tabs)
- **Cached assets:** `/`, `/index.html`, `/manifest.json`
- **Strategy:**
  - Firebase/googleapis/gstatic URLs: network-first, cache fallback
  - All other requests: cache-first, falling through to network + cache-put

---

*Integration audit: 2026-05-12*
