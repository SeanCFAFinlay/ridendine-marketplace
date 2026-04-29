---
id: CMP-027
name: DeliveryRepository
layer: Repository
subsystem: Delivery
path: packages/db/src/repositories/delivery.repository.ts
language: TypeScript
loc: 326
---

# [[CMP-027]] DeliveryRepository

## Responsibility
Provides database read/write operations for deliveries, assignment attempts, and delivery events.

## Public API
- `createDelivery(data) -> Promise<Delivery>` — inserts new delivery record
- `getDeliveryById(id) -> Promise<Delivery>` — fetches delivery with details
- `getDeliveryByOrderId(orderId) -> Promise<Delivery>` — fetches delivery for order
- `updateDeliveryStatus(id, status) -> Promise<Delivery>` — transitions delivery status
- `recordAssignmentAttempt(data) -> Promise<void>` — logs driver assignment attempt
- `insertDeliveryEvent(data) -> Promise<void>` — logs delivery event

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-008]] DispatchEngine — all delivery DB operations
- [[CMP-018]] DispatchService — legacy service

## Reads config
- None

## Side effects
- DB writes: deliveries, assignment_attempts, delivery_events

## Tests
- ❓ UNKNOWN

## Smells / notes
- delivery_events column 'data' vs 'event_data' mismatch in engine layer — see [[FND-004]]

## Source
`packages/db/src/repositories/delivery.repository.ts` (lines 1–326)
