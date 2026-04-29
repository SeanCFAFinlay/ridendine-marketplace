# Engine Rewrite Audit Report

**Date**: 2026-04-29
**Scope**: Full audit of order/delivery/payment lifecycle control layer
**Goal**: Identify all direct status mutations, fragmented engine logic, unsafe transitions, and files requiring changes

---

## 1. Current Engine Architecture

### Core Infrastructure
| File | Responsibility |
|------|---------------|
| `packages/engine/src/core/audit-logger.ts` | Logs to `audit_logs` and `ops_override_logs` tables |
| `packages/engine/src/core/event-emitter.ts` | Queues domain events, persists to `domain_events`, broadcasts via Supabase Realtime |
| `packages/engine/src/core/engine.factory.ts` | Creates `CentralEngine` singleton wiring all orchestrators |
| `packages/engine/src/core/sla-manager.ts` | SLA timer management in `sla_timers` table |

### Domain Orchestrators
| File | Responsibility | Direct Mutations? |
|------|---------------|-------------------|
| `order.orchestrator.ts` (1470 lines) | Full order lifecycle: create, accept, reject, prepare, ready, cancel, complete, opsOverride | YES - updates `orders`, `kitchen_queue_entries` |
| `dispatch.engine.ts` (1313 lines) | Driver assignment, delivery status, manual assign, reassign | YES - updates `deliveries`, `driver_presence`, `assignment_attempts` |
| `kitchen.engine.ts` (666 lines) | Kitchen queue, storefront pause/unpause, item availability | YES - updates `chef_storefronts`, `menu_items` |
| `commerce.engine.ts` (935 lines) | Financial ledger, refund cases, payout holds | YES - updates `refund_cases`, `orders.payment_status` |
| `platform.engine.ts` (660 lines) | Cross-domain workflows: ready->dispatch, delivery->complete, payment failure, governance | Delegates to other engines |
| `ops.engine.ts` (369 lines) | Ops dashboard read models, platform rules, delivery ops | Mostly delegates |
| `support.engine.ts` | Exception management | YES - updates `order_exceptions` |

### Services (Legacy)
| File | Responsibility | Direct Mutations? |
|------|---------------|-------------------|
| `orders.service.ts` | Utility functions: `generateOrderNumber()`, `calculateOrderTotals()`, `canTransitionTo()` | NO - query only |
| `dispatch.service.ts` | Legacy dispatch: `dispatchOrder()` creates delivery record | YES - inserts `deliveries` |
| `permissions.service.ts` | Role checking: `getUserRoles()`, `hasRole()`, `hasPermission()` | NO - query only |
| `chefs.service.ts` | Chef management: `approveChef()` | YES - updates `chef_profiles` |

---

## 2. Direct Status Mutation Locations

### Order Status Mutations (in engine)
| File | Method | Status Set | Table |
|------|--------|-----------|-------|
| `order.orchestrator.ts:302` | `authorizePayment()` | `engine_status: 'payment_authorized'` | orders |
| `order.orchestrator.ts:386` | `submitToKitchen()` | `status: 'pending', engine_status: 'pending'` | orders |
| `order.orchestrator.ts:552` | `acceptOrder()` | `status: 'accepted', engine_status: 'accepted'` | orders |
| `order.orchestrator.ts:679` | `rejectOrder()` | `status: 'rejected', engine_status: 'rejected'` | orders |
| `order.orchestrator.ts:830` | `startPreparing()` | `status: 'preparing', engine_status: 'preparing'` | orders |
| `order.orchestrator.ts:931` | `markReady()` | `status: 'ready_for_pickup', engine_status: 'ready'` | orders |
| `order.orchestrator.ts:1035` | `cancelOrder()` | `status: 'cancelled', engine_status: 'cancelled'` | orders |
| `order.orchestrator.ts:1181` | `completeOrder()` | `status: 'completed', engine_status: 'completed'` | orders |
| `order.orchestrator.ts:1356` | `opsOverride()` | `status: <dynamic>, engine_status: <dynamic>` | orders |

### Delivery Status Mutations (in engine)
| File | Method | Status Set | Table |
|------|--------|-----------|-------|
| `dispatch.engine.ts:701` | `updateDeliveryStatus()` | Various: picked_up, delivered, en_route_* | deliveries |
| `dispatch.engine.ts:724` | `updateDeliveryStatus()` | Syncs order engine_status | orders |
| `dispatch.engine.ts:826` | `manualAssign()` | `status: 'assigned'` | deliveries |
| `dispatch.engine.ts:920` | `reassignDelivery()` | `status: 'pending'` | deliveries |

### Payment/Payout Status Mutations (in engine)
| File | Method | Status Set | Table |
|------|--------|-----------|-------|
| `platform.engine.ts:132` | `handlePaymentFailure()` | `payment_status: 'failed', status: 'cancelled'` | orders |
| `platform.engine.ts:231` | `handleExternalRefund()` | `payment_status: refunded/partial_refunded` | orders |

### Direct Mutations in APP ROUTES (bypassing engine)
| File | Method | Status Set | Table | UNSAFE? |
|------|--------|-----------|-------|---------|
| `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts:91` | POST refund | `payment_status: 'refunded'/'partial_refunded'` | orders | **YES** |
| `apps/chef-admin/src/app/api/payouts/request/route.ts:96` | POST payout | `status: 'completed'` | chef_payouts | **YES** |
| `apps/chef-admin/src/app/api/payouts/request/route.ts:109` | POST payout | `status: 'failed'` | chef_payouts | **YES** |

### E2E Test Direct Mutations (acceptable for tests)
| File | Count |
|------|-------|
| `packages/engine/src/e2e/order-lifecycle.e2e.ts` | ~12 direct status updates |
| `packages/engine/src/e2e/stripe-payment.e2e.ts` | ~8 direct status updates |

---

## 3. Duplicated Logic

### Dual Status Fields
- Orders maintain both `status` (legacy, DB CHECK constraint) and `engine_status` (new).
- Every mutation writes both fields with different value mappings (e.g., `engine_status: 'ready'` vs `status: 'ready_for_pickup'`).

### Transition Validation
- `packages/types/src/engine/transitions.ts` defines `ORDER_TRANSITIONS` with `isValidTransition()`.
- `packages/engine/src/services/orders.service.ts` has `canTransitionTo()` and `isTerminalStatus()`.
- `order.orchestrator.ts` uses `isValidTransition()` from types.
- `dispatch.engine.ts` has implicit state machine (checks current status inline).
- **No delivery state machine is formally defined.**

### Order Completion
- `order.orchestrator.ts:completeOrder()` creates ledger entries.
- `platform.engine.ts:completeDeliveredOrder()` calls orchestrator's `completeOrder()`.
- Both paths exist - potential for inconsistency.

### Payment Handling
- `order.orchestrator.ts` handles payment auth and void.
- `commerce.engine.ts` handles refund processing with Stripe.
- `platform.engine.ts` handles payment failure webhooks.
- `apps/ops-admin/.../refund/route.ts` does direct Stripe refund + DB update (bypasses engine).

---

## 4. Unsafe Transition Paths

1. **Refund route bypasses engine**: `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts` directly updates `orders.payment_status` after Stripe refund, without going through any engine validation or audit logging.

2. **Payout route bypasses engine**: `apps/chef-admin/src/app/api/payouts/request/route.ts` directly updates `chef_payouts.status` to completed/failed without engine validation.

3. **No delivery state machine**: Delivery transitions are not formally validated. `dispatch.engine.ts` checks status inline but has no hard state machine equivalent to the order transitions.

4. **dispatch.engine syncs order status directly**: When delivery status changes, `dispatch.engine.ts:724` directly updates the order's `engine_status` without going through the order orchestrator.

5. **E2E tests bypass engine entirely**: Tests directly mutate `orders` and `deliveries` tables via Supabase client.

---

## 5. Files That Will Be Changed

### New Files
- `packages/engine/src/orchestrators/master-order-engine.ts` - Single authority for order lifecycle
- `packages/engine/src/orchestrators/delivery-engine.ts` - Single authority for delivery lifecycle
- `packages/engine/src/orchestrators/order-state-machine.ts` - Hard state machine with transition validation
- `packages/engine/src/__tests__/master-order-engine.test.ts` - Engine tests
- `docs/audits/engine-rewrite-safety-scan-2026-04-29.md` - Post-change safety scan
- `docs/audits/engine-rewrite-final-2026-04-29.md` - Final report

### Modified Files (Types)
- `packages/types/src/enums.ts` - Add canonical OrderStatus, PaymentStatus, PayoutStatus values
- `packages/types/src/engine/index.ts` - Add canonical EngineOrderStatus values, ActorType
- `packages/types/src/engine/transitions.ts` - Add delivery transitions, export validation helpers

### Modified Files (Engine)
- `packages/engine/src/orchestrators/order.orchestrator.ts` - Delegate to MasterOrderEngine
- `packages/engine/src/orchestrators/dispatch.engine.ts` - Delegate to DeliveryEngine for status changes
- `packages/engine/src/orchestrators/commerce.engine.ts` - Delegate refund status to MasterOrderEngine
- `packages/engine/src/orchestrators/platform.engine.ts` - Delegate to MasterOrderEngine/DeliveryEngine
- `packages/engine/src/orchestrators/kitchen.engine.ts` - Facade only
- `packages/engine/src/orchestrators/ops.engine.ts` - Facade only
- `packages/engine/src/core/engine.factory.ts` - Wire new engines
- `packages/engine/src/index.ts` - Export new engines

### Modified Files (App Routes)
- `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts` - Route through engine
- `apps/chef-admin/src/app/api/payouts/request/route.ts` - Route through engine

---

## 6. Files That Will NOT Be Changed

- All UI components, pages, and layouts
- `apps/web/src/app/api/checkout/route.ts` - Already uses engine
- `apps/web/src/app/api/orders/[id]/route.ts` - Already uses engine
- `apps/chef-admin/src/app/api/orders/[id]/route.ts` - Already uses engine
- `apps/driver-app/src/app/api/deliveries/[id]/route.ts` - Already uses engine
- `apps/ops-admin/src/app/api/engine/orders/[id]/route.ts` - Already uses engine
- `packages/engine/src/services/permissions.service.ts` - Query only
- `packages/engine/src/services/orders.service.ts` - Utility only
- `packages/engine/src/core/audit-logger.ts` - Already correct
- `packages/engine/src/core/event-emitter.ts` - Already correct
- `packages/engine/src/core/sla-manager.ts` - Already correct
- All Supabase migrations (no schema changes needed - tables exist)
- All marketing/landing pages
- All configuration files

---

## 7. Summary of Required Work

1. **Canonical types**: Expand `EngineOrderStatus` to match requested statuses. Add `DeliveryStatus` engine enum. Add `PaymentStatus` and `PayoutStatus` canonical enums. Add `ActorType`.
2. **Hard state machine**: Formalize `ALLOWED_ORDER_TRANSITIONS` and `ALLOWED_DELIVERY_TRANSITIONS` as simple from->to maps with `assertValidOrderTransition()` / `assertValidDeliveryTransition()`.
3. **MasterOrderEngine**: Single class that validates, persists, audits, and emits for every order transition.
4. **DeliveryEngine**: Single class for delivery lifecycle with formal state machine.
5. **Facade refactor**: Existing engines become facades that delegate to MasterOrderEngine/DeliveryEngine.
6. **Route fixes**: 2 app routes that bypass engine must be rewired.
7. **Tests**: 10+ test cases covering lifecycle, invalid transitions, permissions, audit, events.
