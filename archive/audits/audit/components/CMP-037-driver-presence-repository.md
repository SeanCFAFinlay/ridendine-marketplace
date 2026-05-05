---
id: CMP-037
name: DriverPresenceRepository
layer: Repository
subsystem: Driver
path: packages/db/src/repositories/driver-presence.repository.ts
language: TypeScript
loc: 102
---

# [[CMP-037]] DriverPresenceRepository

## Responsibility
Tracks real-time driver location and online/offline presence for dispatch matching.

## Public API
- `upsertPresence(driverId, location, status) -> Promise<DriverPresence>` — updates driver location/status
- `getPresence(driverId) -> Promise<DriverPresence>` — retrieves driver presence record
- `getOnlineDrivers(bounds) -> Promise<DriverPresence[]>` — lists online drivers in area
- `markOffline(driverId) -> Promise<void>` — sets driver as offline

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-008]] DispatchEngine — driver availability for matching
- [[CMP-057]] DriverLocationTracker — pushes location updates

## Reads config
- None

## Side effects
- DB writes: driver_presence (schema drift aliases present — see note)

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🟡 Schema drift aliases: driver_presence table column names differ between migrations; repository uses alias mapping — see [[FND-002]]

## Source
`packages/db/src/repositories/driver-presence.repository.ts` (lines 1–102)
