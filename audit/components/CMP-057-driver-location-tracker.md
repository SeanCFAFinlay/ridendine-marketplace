---
id: CMP-057
name: DriverLocationTracker
layer: Util
subsystem: DriverApp
path: apps/driver-app/src/hooks/use-location-tracker.ts
language: TypeScript
loc: 133
---

# [[CMP-057]] DriverLocationTracker

## Responsibility
React hook that polls or streams the device's GPS position and pushes updates to the driver presence table.

## Public API
- `useLocationTracker(options?) -> LocationTrackerState` — starts location tracking and returns current position and status

## Depends on (outbound)
- [[CMP-037]] DriverPresenceRepository — upserts driver location
- Browser Geolocation API

## Depended on by (inbound)
- Driver app active delivery screen

## Reads config
- None

## Side effects
- DB writes to driver_presence via CMP-037
- Geolocation API watch

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`apps/driver-app/src/hooks/use-location-tracker.ts` (lines 1–133)
