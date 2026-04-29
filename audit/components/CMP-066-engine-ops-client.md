---
id: CMP-066
name: EngineOpsClient
layer: Adapter
subsystem: OpsAdmin
path: apps/ops-admin/src/lib/engine.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-066]] EngineOpsClient

## Responsibility
Singleton HTTP client wrapper for the ops admin app to call engine server endpoints with typed request/response.

## Public API
- `engine.ops.processSLATimers() -> Promise<void>` — manually triggers SLA processing
- `engine.dispatch.manualAssign(deliveryId, driverId) -> Promise<Delivery>` — manual driver assignment
- `engine.dispatch.processExpiredOffers() -> Promise<void>` — manually triggers offer expiry
- Various typed method wrappers for ops-relevant engine actions

## Depends on (outbound)
- [[CMP-001]] EngineFactory — connects to engine server instance
- [[CMP-047]] ApiHelpers — HTTP request utilities

## Depended on by (inbound)
- Ops admin API routes and client components
- [[CMP-055]] OpsLiveMap
- [[CMP-056]] OpsAlertsPanel

## Reads config
- `ENGINE_URL` or internal URL

## Side effects
- HTTP calls to engine server

## Tests
- ❓ UNKNOWN

## Smells / notes
- ⚠️ INFERRED: similar structure to CMP-064; duplication confirmed — see [[FND-016]]

## Source
`apps/ops-admin/src/lib/engine.ts`
