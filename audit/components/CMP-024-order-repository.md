---
id: CMP-024
name: OrderRepository
layer: Repository
subsystem: Order
path: packages/db/src/repositories/order.repository.ts
language: TypeScript
loc: 309
---

# [[CMP-024]] OrderRepository

## Responsibility
Provides all database read/write operations for orders, order items, and order status history.

## Public API
- `createOrder(data) -> Promise<Order>` — inserts new order
- `getOrderById(id) -> Promise<Order>` — fetches order with items
- `updateOrderStatus(id, status, actorId) -> Promise<Order>` — transitions status with history
- `getOrdersByCustomer(customerId, filters) -> Promise<Order[]>` — customer order history
- `getOrdersByStorefront(storefrontId, filters) -> Promise<Order[]>` — chef order list
- `addStatusHistory(orderId, status, actorId) -> Promise<void>` — appends status history entry

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-006]] OrderOrchestrator — all order DB operations
- [[CMP-013]] OrdersService — legacy service

## Reads config
- None

## Side effects
- DB writes: orders, order_items, order_status_history

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/repositories/order.repository.ts` (lines 1–309)
