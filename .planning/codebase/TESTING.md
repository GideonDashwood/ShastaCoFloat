# Testing

## Coverage
- Unit tests: none
- Integration tests: none
- E2E tests: none

## Test Framework
- None — no test runner, no assertion library, no test files

## CI/CD
- No CI pipeline (.github/workflows/, .travis.yml, etc. absent)
- No linting config (.eslintrc, .prettierrc absent)
- No package.json / build tooling — pure static files, no npm scripts

## Manual Testing Approach
- Browser DevTools console for JS errors and BLE event inspection
- Built-in BLE diagnostic panel in the app for characteristic discovery and raw value inspection
- Physical Onewheel/EUC device required for full BLE flow testing
- GPS testing requires location permissions and outdoor use

## Gaps & Risks
- No automated regression coverage — any change can silently break existing behavior
- BLE auth sequence is device-specific and hard to test without hardware
- Firebase Firestore writes untested in isolation — errors surface only at runtime
- Service worker cache invalidation is manual (bump version number) — easy to forget
- No browser compatibility testing infrastructure; Web Bluetooth support varies by browser/OS
