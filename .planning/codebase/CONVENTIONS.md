# Code Conventions

## Naming
- Variables/functions: camelCase (`updateLiveStats`, `connectBLE`, `saveRide`)
- Event handlers: `on*` prefix (`onConnectClick`, `onStartRide`)
- CSS classes: kebab-case (`live-stats`, `ride-card`, `map-container`)
- DOM IDs: `page-*` for page sections (`page-home`, `page-live`), `live-*` for live telemetry displays (`live-speed`, `live-battery`)
- Constants: often camelCase, not SCREAMING_SNAKE

## Code Style
- Async pattern: async/await throughout, no raw Promise chains
- Error handling: try/catch on all async operations
- Comments: section banner comments (e.g., `// ===== BLE =====`) to delimit logical blocks within the monolithic file
- DOM rendering: innerHTML + template literals (no virtual DOM, no framework)
- State: global variables at module scope; `window.*` used as escape hatch for cross-closure access

## HTML/DOM Patterns
- Single-page app with show/hide sections; no routing library
- Page sections toggled by `display` style or class
- UI updates done imperatively by selecting elements and setting textContent/innerHTML

## Service Worker
- Cache name versioned as `ridelogger-v{N}` — version must be bumped on every deploy to invalidate stale cache
- Cache-first strategy for static assets

## Notable Anti-patterns
- Monolithic single-file architecture (all JS, HTML, CSS in index.html)
- `window._battSamples` used as closure bridge between BLE callback scope and charting code
- `window.*` escape hatch pattern for sharing state across callbacks
- `setTimeout` polling loops instead of event-driven updates in some places
- Dead code: `SAVE_MODE` variable/logic still present but unused
