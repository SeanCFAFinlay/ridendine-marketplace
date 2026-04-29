---
id: CMP-067
name: EngineDriverClient
layer: Adapter
subsystem: DriverApp
path: apps/driver-app/src/lib/engine.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-067]] EngineDriverClient

## Responsibility
Singleton HTTP client wrapper for the driver app to call engine server endpoints with typed request/response.

## Public API
- `engine.dispatch.acceptOffer(deliveryId) -> Promise<Delivery>` — driver accepts delivery offer
- `engine.dispatch.declineOffer(deliveryId) -> Promise<void>` — driver declines offer
- `engine.dispatch.updateDeliveryStatus(deliveryId, status) -> Promise<Delivery>` — updates delivery status
- Various typed method wrappers for driver-relevant engine actions

## Depends on (outbound)
- [[CMP-001]] EngineFactory — connects to engine server instance
- [[CMP-047]] ApiHelpers — HTTP request utilities

## Depended on by (inbound)
- Driver app API routes and client components
- [[CMP-057]] DriverLocationTracker

## Reads config
- `ENGINE_URL` or internal URL

## Side effects
- HTTP calls to engine server

## Tests
- ❓ UNKNOWN

## Smells / notes
- ⚠️ INFERRED: similar structure to CMP-064; duplication confirmed — see [[FND-016]]

## Source
`apps/driver-app/src/lib/engine.ts`
