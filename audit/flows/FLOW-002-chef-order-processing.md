---
id: FLOW-002
name: Chef Order Processing
entry_point: apps/chef-admin/src/app/api/orders/[id]/route.ts
actors: Chef, ChefAdmin App, OrderOrchestrator, KitchenEngine, Supabase
---

# [[FLOW-002]] Chef Order Processing

## Summary
Chef receives notification of new order, accepts with estimated prep time, starts preparation, and marks order as ready which triggers dispatch.

## Steps
1. Chef views pending orders in dashboard → `GET /api/orders`
2. Chef accepts order → `PATCH /api/orders/[id]` with action=accept
3. [[CMP-006]] OrderOrchestrator.acceptOrder() validates state transition
4. Order updated to 'accepted', estimated_prep_minutes set
5. Chef response SLA completed
6. Customer notified via [[CMP-005]] NotificationSender
7. [[CMP-007]] KitchenEngine adds order to kitchen_queue_entries
8. Storefront queue size incremented via RPC
9. Chef starts preparing → OrderOrchestrator.startPreparing()
10. Kitchen queue entry updated to 'in_progress'
11. Prep time SLA started
12. Chef marks ready → OrderOrchestrator.markReady()
13. Actual prep time calculated, kitchen queue entry completed
14. Storefront queue size decremented
15. Domain event 'order.ready' triggers dispatch flow ([[FLOW-003]])

## Sequence Diagram
See [[diagrams/flows/FLOW-002.mmd]]

## Key Components
- [[CMP-006]] OrderOrchestrator
- [[CMP-007]] KitchenEngine
- [[CMP-004]] SLAManager
- [[CMP-053]] ChefOrdersList (UI)

## Error Paths
- Chef rejects order → OrderOrchestrator.rejectOrder() creates exception, voids payment ledger entry
- Invalid state transition → returns INVALID_TRANSITION
- Chef not owner of storefront → returns FORBIDDEN
