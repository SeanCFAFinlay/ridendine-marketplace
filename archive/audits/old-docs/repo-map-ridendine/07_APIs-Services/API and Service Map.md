# API and Service Map

> Every API route, engine orchestrator, and service function mapped with inputs, outputs, callers, and data touched.

## Engine Orchestrators

### `CentralEngine` (Factory: `packages/engine/src/core/engine.factory.ts`)

Singleton created via `createCentralEngine(adminClient)`. Exposes:

| Property | Type | Responsibility |
|----------|------|---------------|
| `engine.orders` | OrderOrchestrator | Order lifecycle state machine |
| `engine.kitchen` | KitchenEngine | Kitchen queue, prep times, storefront pause/resume |
| `engine.dispatch` | DispatchEngine | Delivery creation, driver matching, offer management |
| `engine.commerce` | CommerceLedgerEngine | Refunds, ledger, payout adjustments |
| `engine.support` | SupportExceptionEngine | Exception tracking, escalation, SLA |
| `engine.platform` | PlatformWorkflowEngine | Cross-engine workflows (ready→dispatch, delivery→complete) |
| `engine.ops` | OpsControlEngine | Dashboard read models, platform rules, manual interventions |
| `engine.events` | DomainEventEmitter | Event sourcing + Supabase Realtime broadcast |
| `engine.audit` | AuditLogger | All-operation audit logging |
| `engine.sla` | SLAManager | Timer tracking, breach detection |

### OrderOrchestrator (`packages/engine/src/orchestrators/order.orchestrator.ts`)

| Method | Input | Output | State Change | Called By |
|--------|-------|--------|-------------|----------|
| `createOrder(input, actor)` | customerId, storefrontId, items, tip, etc. | `OperationResult<OrderData>` | → pending | web checkout API |
| `authorizePayment(orderId, paymentIntentId, actor)` | orderId, paymentIntentId | `OperationResult` | payment_status → processing | web checkout API |
| `submitToKitchen(orderId, actor)` | orderId | `OperationResult` | → accepted (auto) | Stripe webhook |
| `acceptOrder(orderId, estimatedPrepMinutes, actor)` | orderId, minutes | `OperationResult` | → accepted | chef-admin orders API |
| `rejectOrder(orderId, reason, notes, actor)` | orderId, reason enum, notes | `OperationResult` | → rejected | chef-admin orders API |
| `startPreparing(orderId, actor)` | orderId | `OperationResult` | → preparing | chef-admin orders API |
| `cancelOrder(orderId, reason, notes, actor)` | orderId, reason, notes | `OperationResult` | → cancelled | web orders API, ops orders API |
| `completeOrder(orderId, actor)` | orderId | `OperationResult` | → completed | platform engine |
| `getAllowedActions(orderId, role)` | orderId, role string | string[] | — (read) | All apps order detail APIs |

### DispatchEngine (`packages/engine/src/orchestrators/dispatch.engine.ts`)

| Method | Input | Output | Called By |
|--------|-------|--------|----------|
| `requestDispatch(orderId, actor)` | orderId | `OperationResult` | PlatformWorkflowEngine.markOrderReady |
| `autoAssignDriver(deliveryId)` | deliveryId | `OperationResult` | requestDispatch (internal) |
| `manualAssign(deliveryId, driverId, actor)` | deliveryId, driverId | `OperationResult` | ops dispatch API |
| `offerDelivery(deliveryId, driverId, expirySeconds)` | deliveryId, driverId, seconds | `OperationResult` | autoAssignDriver (internal) |
| `acceptOffer(attemptId, actor)` | attemptId | `OperationResult` | driver offers/deliveries API |
| `declineOffer(attemptId, reason, actor)` | attemptId, reason | `OperationResult` | driver offers/deliveries API |
| `updateDeliveryStatus(deliveryId, status, actor, metadata)` | deliveryId, status, proof | `OperationResult` | driver deliveries API |
| `calculateDriverAssignmentScore(driver)` | driver object | number | autoAssignDriver (internal) |

### KitchenEngine (`packages/engine/src/orchestrators/kitchen.engine.ts`)

| Method | Input | Called By |
|--------|-------|----------|
| `getKitchenQueue(storefrontId)` | storefrontId | ops storefront detail API |
| `estimatePrepTime(items)` | items array | Internal |
| `pauseStorefront(storefrontId, reason, actor)` | storefrontId, reason | ops storefront API |
| `resumeStorefront(storefrontId, actor)` | storefrontId | ops storefront API |
| `markItemUnavailable(menuItemId, actor)` | menuItemId | Not currently called from API |
| `updatePrepTime(orderId, minutes, actor)` | orderId, minutes | chef orders API |

### CommerceLedgerEngine (`packages/engine/src/orchestrators/commerce.engine.ts`)

| Method | Input | Called By |
|--------|-------|----------|
| `createRefundCase(orderId, reason, amount, actor)` | orderId, reason, cents | ops refunds API |
| `approveRefund(caseId, actor)` | caseId | ops finance API |
| `processRefund(caseId, actor)` | caseId | ops finance API |
| `denyRefund(caseId, actor)` | caseId | ops finance API |
| `getPendingRefunds()` | — | ops refunds API |
| `getOrderFinancials(orderId)` | orderId | ops order detail API |
| `getFinancialSummary(dateRange)` | start, end dates | ops dashboard API |
| `createPayoutAdjustment(payeeType, payeeId, amount, reason)` | type, id, amount, reason | Internal |

### PlatformWorkflowEngine (`packages/engine/src/orchestrators/platform.engine.ts`)

| Method | Orchestrates | Called By |
|--------|-------------|----------|
| `markOrderReady(orderId, actor)` | OrderOrchestrator → DispatchEngine | chef orders API |
| `completeDeliveredOrder(deliveryId, actor, metadata)` | DispatchEngine → OrderOrchestrator → CommerceLedgerEngine | driver deliveries API |
| `handlePaymentFailure(input, actor)` | OrderOrchestrator + SupportEngine | Stripe webhook |
| `handleExternalRefund(input, actor)` | CommerceLedgerEngine | Stripe webhook |
| `updateChefGovernance(chefId, status, actor, reason)` | Chef profile + storefront updates | ops chefs API |
| `updateDriverGovernance(driverId, status, actor, reason)` | Driver profile updates | ops drivers API |

### OpsControlEngine (`packages/engine/src/orchestrators/ops.engine.ts`)

| Method | Returns | Called By |
|--------|---------|----------|
| `getDashboard()` | OpsDashboardReadModel | ops dashboard API |
| `getPlatformRules()` | PlatformRuleSet | ops settings API |
| `updatePlatformRules(input, actor)` | OperationResult<PlatformRuleSet> | ops settings API |
| `getDispatchCommandCenter()` | DispatchCommandCenterReadModel | ops deliveries page |
| `getDeliveryInterventionDetail(deliveryId)` | DeliveryInterventionDetail | ops delivery detail |
| `getFinanceOperations(actor, dateRange)` | FinanceOperationsReadModel | ops finance page |

### SupportExceptionEngine (`packages/engine/src/orchestrators/support.engine.ts`)

| Method | Called By |
|--------|----------|
| `createException(input, actor)` | ops exceptions API, driver presence API (auto) |
| `acknowledgeException(exceptionId, actor)` | ops exceptions API |
| `resolveException(exceptionId, resolution, actor)` | ops exceptions API |
| `escalateException(exceptionId, actor)` | ops exceptions API, ops dispatch API |
| `addExceptionNote(exceptionId, content, actor)` | ops exceptions API |
| `getExceptionQueue()` | ops exceptions API |
| `getExceptionCounts()` | ops dashboard API |
| `getSLAStatus()` | ops exceptions API |

---

## Actor Context Pattern

Every engine call requires an `ActorContext`:

```typescript
interface ActorContext {
  userId: string;
  role: ActorRole;     // customer | chef_user | driver | ops_agent | ops_manager | finance_admin | super_admin | system
  entityId?: string;   // customerId | chefId | driverId
}
```

Each app creates its own actor context in `lib/engine.ts`:
- **web**: `getCustomerActorContext()` → `{userId, role: 'customer', entityId: customerId}`
- **chef-admin**: `getChefActorContext()` → `{userId, role: 'chef_user', entityId: chefId}`
- **driver-app**: `getDriverActorContext()` → `{userId, role: 'driver', entityId: driverId}`
- **ops-admin**: `getOpsActorContext()` → `{userId, role: <from platform_users table>}`

---

## Repository Layer Summary

| Repository | Methods | Primary Tables |
|-----------|---------|---------------|
| `address.repository` | 6 | customer_addresses |
| `cart.repository` | 8 | carts, cart_items |
| `chef.repository` | 10 | chef_profiles, chef_storefronts |
| `customer.repository` | 7 | customers |
| `delivery.repository` | 11 | deliveries, delivery_tracking_events |
| `driver.repository` | 10 | drivers |
| `driver-presence.repository` | 3 | driver_presence |
| `finance.repository` | 5 | refund_cases, payout_adjustments, ledger_entries |
| `menu.repository` | 9 | menu_items, menu_categories |
| `ops.repository` | 4 | Complex join queries across all tables |
| `order.repository` | 11 | orders, order_items |
| `platform.repository` | 3 | platform_settings |
| `promo.repository` | 4 | promo_codes |
| `storefront.repository` | 7 | chef_storefronts |
| `support.repository` | 6 | support_tickets |

---

## API → Engine → DB Call Chain

| API Endpoint | Engine Method | Repository/Table |
|-------------|-------------|-----------------|
| `web POST /api/checkout` | `orders.createOrder` → `orders.authorizePayment` | orders, order_items, carts |
| `web POST /api/webhooks/stripe` | `orders.submitToKitchen` | orders |
| `chef PATCH /api/orders/[id]` (accept) | `orders.acceptOrder` | orders, kitchen_queue_entries |
| `chef PATCH /api/orders/[id]` (ready) | `platform.markOrderReady` → `dispatch.requestDispatch` | orders, deliveries, assignment_attempts |
| `driver POST /api/offers` (accept) | `dispatch.acceptOffer` | deliveries, assignment_attempts |
| `driver PATCH /api/deliveries/[id]` (delivered) | `platform.completeDeliveredOrder` | deliveries, orders, ledger_entries |
| `ops POST /api/engine/dispatch` (manual_assign) | `dispatch.manualAssign` | deliveries |
| `ops POST /api/engine/finance` (approve_refund) | `commerce.approveRefund` | refund_cases |
| `ops POST /api/engine/settings` | `ops.updatePlatformRules` | platform_settings |
| `ops PATCH /api/chefs/[id]` | `platform.updateChefGovernance` | chef_profiles, chef_storefronts |
