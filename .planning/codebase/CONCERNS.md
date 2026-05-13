# Technical Concerns

## Critical (fix before shipping)
- **Exposed Firebase API key**: Firebase config (apiKey, projectId, etc.) is embedded in client-side index.html — standard for Firebase web apps but requires Firestore security rules to be properly locked down
- **Missing/unverified Firestore security rules**: If rules are open (allow read, write: if true), any user can read/write all ride data

## High (address soon)
- **Brute-force BLE auth**: Authentication sequence tries multiple response lengths/patterns to find the correct unlock — fragile, device-firmware-dependent, breaks silently on firmware updates
- **Route data bloating Firestore documents**: Full GPS route arrays stored inside ride documents; Firestore has a 1MB document size limit — long rides with dense GPS sampling could hit this
- **Global state pollution**: Heavy use of `window.*` and module-level globals makes state management opaque and error-prone
- **Dead `SAVE_MODE` code**: Unreachable/unused code path still present, adds confusion

## Medium (tech debt)
- **Misleading field name**: `topSpeedKmh` stores mph values — unit mismatch in the data model
- **Raw Firebase error exposure**: Firebase errors may surface directly in UI without sanitization
- **setTimeout polling instead of event-driven updates**: Some telemetry updates use polling loops rather than BLE notification events
- **`window._battSamples` closure bridge**: Hacky cross-closure state sharing for battery chart data

## Low (nice to fix)
- **Monolithic single-file architecture**: All JS, HTML, CSS in one file — hard to navigate, no code splitting, no tree shaking
- **No linting or formatting**: Code style enforced only by convention, not tooling
- **Section banner comments as only structure**: Large file relies on `// ===== SECTION =====` comments rather than modules

## Security
- Firebase API key in client bundle (expected for Firebase, but Firestore rules must compensate)
- No input sanitization audit (innerHTML usage with user-controlled data could be XSS vector)
- BLE device auth by characteristic write — no server-side validation

## Browser Compatibility
- **Web Bluetooth API**: Not supported on iOS (any browser), Firefox, or Safari — app is effectively Chrome/Edge on Android/desktop only
- **Geolocation API**: Broadly supported but requires HTTPS and user permission
- No polyfills or graceful degradation for unsupported browsers

## Scalability
- Firestore document size limit (1MB) is a real risk for ride route data — needs subcollection or chunked storage strategy for long rides
- No pagination on ride history list — could slow down on accounts with many rides

## Known TODOs in Code
- Dead `SAVE_MODE` variable suggests a planned offline-save feature that was never completed or was removed
- BLE auth retry logic suggests known instability with current approach
