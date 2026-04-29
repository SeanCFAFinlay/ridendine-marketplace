---
id: CMP-028
name: DriverRepository
layer: Repository
subsystem: Driver
path: packages/db/src/repositories/driver.repository.ts
language: TypeScript
loc: 256
---

# [[CMP-028]] DriverRepository

## Responsibility
Provides database read/write operations for driver profiles, ratings, and status.

## Public API
- `getDriverById(id) -> Promise<Driver>` — fetches driver profile
- `getDriverByUserId(userId) -> Promise<Driver>` — fetches driver by auth user
- `updateDriverStatus(id, status) -> Promise<Driver>` — updates driver availability
- `getAvailableDrivers(location) -> Promise<Driver[]>` — finds nearby available drivers
- `updateDriverRating(driverId, rating) -> Promise<void>` — updates driver rating

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-008]] DispatchEngine — driver lookup and scoring
- [[CMP-011]] PlatformWorkflowEngine — driver approval

## Reads config
- None

## Side effects
- DB writes: driver_profiles

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/repositories/driver.repository.ts` (lines 1–256)
