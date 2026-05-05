---
id: CMP-008
name: DispatchEngine
layer: Service
subsystem: Dispatch
path: packages/engine/src/orchestrators/dispatch.engine.ts
language: TypeScript
loc: 1310
---

# [[CMP-008]] DispatchEngine

## Responsibility
Coordinates delivery dispatch, driver matching, offer lifecycle, and reassignment for all deliveries.

## Public API
- `requestDispatch(orderId) -> Promise<Delivery>` — creates a delivery record and begins driver search
- `findAndAssignDriver(deliveryId) -> Promise<AssignmentResult>` — runs driver scoring and sends offer
- `acceptOffer(deliveryId, driverId) -> Promise<Delivery>` — driver accepts delivery offer
- `declineOffer(deliveryId, driverId) -> Promise<void>` — driver declines offer
- `updateDeliveryStatus(deliveryId, status, actorId) -> Promise<Delivery>` — updates delivery status
- `manualAssign(deliveryId, driverId, actorId) -> Promise<Delivery>` — ops manually assigns driver
- `reassignDelivery(deliveryId, reason, actorId) -> Promise<Delivery>` — unassigns and re-dispatches
- `getDispatchBoard(filters) -> Promise<DispatchBoard>` — retrieves ops dispatch dashboard data
- `processExpiredOffers() -> Promise<void>` — expires stale offers and re-queues deliveries

## Depends on (outbound)
- [[CMP-002]] DomainEventEmitter — emits dispatch events
- [[CMP-003]] AuditLogger — logs dispatch decisions
- [[CMP-004]] SLAManager — creates offer expiry timers
- [[CMP-029]] PlatformRepository — reads platform settings for dispatch config

## Depended on by (inbound)
- [[CMP-001]] EngineFactory — registered as dispatch domain handler

## Reads config
- Platform settings via CMP-029 (offer timeout, max attempts, etc.)

## Side effects
- DB writes: deliveries, assignment_attempts, driver_presence, notifications, delivery_events, order_exceptions, system_alerts
- 🔴 processExpiredOffers not on a schedule — see [[FND-014]]
- 🔴 delivery_events insert uses wrong column name 'data' vs 'event_data' — see [[FND-004]]

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🟡 SMELL: 1310 LOC — complex driver matching algorithm embedded in orchestrator; should be extracted — see [[FND-009]]

## Source
`packages/engine/src/orchestrators/dispatch.engine.ts` (lines 1–1310)
