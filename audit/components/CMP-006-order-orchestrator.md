---
id: CMP-006
name: OrderOrchestrator
layer: Service
subsystem: Order
path: packages/engine/src/orchestrators/order.orchestrator.ts
language: TypeScript
loc: 1348
---

# [[CMP-006]] OrderOrchestrator

## Responsibility
Manages the complete order lifecycle from creation through completion, coordinating payments, kitchen submission, and delivery handoff.

## Public API
- `createOrder(params) -> Promise<Order>` — creates order with items and fee calculation
- `authorizePayment(orderId, paymentIntentId) -> Promise<Order>` — records payment authorization
- `submitToKitchen(orderId) -> Promise<Order>` — enqueues order in kitchen queue
- `acceptOrder(orderId, chefId) -> Promise<Order>` — chef accepts the order
- `rejectOrder(orderId, chefId, reason) -> Promise<Order>` — chef rejects order
- `startPreparing(orderId, chefId) -> Promise<Order>` — marks order as in preparation
- `markReady(orderId, chefId) -> Promise<Order>` — marks order ready for pickup
- `cancelOrder(orderId, actorId, reason) -> Promise<Order>` — cancels an order
- `completeOrder(orderId) -> Promise<Order>` — marks order as delivered/complete
- `opsOverride(orderId, newStatus, actorId) -> Promise<Order>` — ops admin force-transitions status

## Depends on (outbound)
- [[CMP-002]] DomainEventEmitter — emits order domain events
- [[CMP-003]] AuditLogger — logs all state transitions
- [[CMP-004]] SLAManager — creates acceptance and prep SLA timers
- [[CMP-005]] NotificationSender — sends customer/chef notifications
- @ridendine/types — shared type definitions

## Depended on by (inbound)
- [[CMP-001]] EngineFactory — registered as order domain handler
- All app API routes — via engine client wrappers

## Reads config
- `PLATFORM_FEE_PERCENT`
- `SERVICE_FEE_PERCENT`
- `HST_RATE`
- `BASE_DELIVERY_FEE`
- `DRIVER_PAYOUT_PERCENT`

## Side effects
- DB writes: orders, order_items, order_status_history, kitchen_queue_entries, ledger_entries, notifications, order_exceptions
- Emits domain events via CMP-002
- 🔴 rejectOrder and cancelOrder do NOT call Stripe to void PaymentIntent — see [[FND-017]]
- 🔴 submitToKitchen may insert null user_id into notifications — see [[FND-018]]

## Tests
- `packages/engine/src/orchestrators/order.orchestrator.test.ts`

## Smells / notes
- 🟡 SMELL: 1348 LOC — god class handling entire order lifecycle; should split into OrderCreation, OrderStatusMachine, OrderCompletion — see [[FND-008]]

## Source
`packages/engine/src/orchestrators/order.orchestrator.ts` (lines 1–1348)
