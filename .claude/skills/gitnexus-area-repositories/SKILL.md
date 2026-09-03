---
name: gitnexus-area-repositories
description: "Skill for the Repositories area of ridendine-marketplace. 644 symbols across 179 files."
---

# Repositories

644 symbols | 179 files | Cohesion: 83%

## When to Use

- Working with code in `packages/`
- Understanding how GET, GET, GET work
- Modifying repositories-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/db/src/repositories/order.repository.ts` | InvalidOrderTransitionError, OrderTransitionConflictError, countUnassignedReadyOrders, createOrder, createOrderItem (+24) |
| `packages/db/src/repositories/finance.repository.ts` | getAdjustmentOrderNumber, getInstantPayoutRequestById, getPayoutRunById, getPendingPayoutAdjustmentSummaries, getPlatformAccount (+22) |
| `packages/db/src/repositories/driver.repository.ts` | countDriversByStatus, countDriversUpdatedBetween, createDriver, getApprovedDrivers, getDriverById (+18) |
| `packages/db/src/repositories/chef.repository.ts` | createChefProfile, getChefDisplayName, getChefGovernanceDetail, getChefWithStorefronts, getKitchenCoordinatesByStorefront (+16) |
| `packages/db/src/repositories/delivery.repository.ts` | DriverAssignmentConflictError, assignDriver, countActiveDeliveriesStartedBefore, countDeliveriesInStatuses, createDelivery (+14) |
| `packages/db/src/repositories/ops.repository.ts` | getDeliveryInterventionDetailReadModel, getDispatchCommandCenterReadModel, getOpsDashboardReadModel, insertSystemAlert, listActiveSystemAlertSummaries (+11) |
| `packages/engine/src/orchestrators/commerce.engine.ts` | approveRefund, createPayoutHold, createRefundAdjustments, createStripeRefund, denyRefund (+9) |
| `packages/engine/src/orchestrators/support.engine.ts` | acknowledgeException, addNote, assignException, createException, createFromSupportTicket (+9) |
| `packages/db/src/repositories/storefront.repository.ts` | countStorefronts, countStorefrontsUpdatedBetween, createStorefront, getStorefrontByChefId, getStorefrontBySlug (+7) |
| `packages/engine/src/core/business-rules-engine.ts` | allow, deny, _validateMenuItems, canChefAcceptOrder, canChefRejectOrder (+7) |

## Entry Points

Start here when exploring this area:

- **`GET`** (Function) — `apps/chef-admin/src/app/api/costs/overview/route.ts:21`
- **`GET`** (Function) — `apps/chef-admin/src/app/api/customers/route.ts:25`
- **`GET`** (Function) — `apps/chef-admin/src/app/api/inventory/route.ts:23`
- **`GET`** (Function) — `apps/chef-admin/src/app/api/kitchen/board/route.ts:22`
- **`GET`** (Function) — `apps/chef-admin/src/app/api/kitchen/daily-summary/route.ts:12`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `DriverAssignmentConflictError` | Class | `packages/db/src/repositories/delivery.repository.ts` | 130 |
| `InvalidOrderTransitionError` | Class | `packages/db/src/repositories/order.repository.ts` | 258 |
| `OrderTransitionConflictError` | Class | `packages/db/src/repositories/order.repository.ts` | 270 |
| `GET` | Function | `apps/chef-admin/src/app/api/costs/overview/route.ts` | 21 |
| `GET` | Function | `apps/chef-admin/src/app/api/customers/route.ts` | 25 |
| `GET` | Function | `apps/chef-admin/src/app/api/inventory/route.ts` | 23 |
| `GET` | Function | `apps/chef-admin/src/app/api/kitchen/board/route.ts` | 22 |
| `GET` | Function | `apps/chef-admin/src/app/api/kitchen/daily-summary/route.ts` | 12 |
| `GET` | Function | `apps/chef-admin/src/app/api/kitchen/overview/route.ts` | 26 |
| `GET` | Function | `apps/chef-admin/src/app/api/kitchen/tickets/[id]/route.ts` | 20 |
| `GET` | Function | `apps/chef-admin/src/app/api/labor/pay-periods/[id]/export/route.ts` | 22 |
| `GET` | Function | `apps/chef-admin/src/app/api/labor/pay-periods/route.ts` | 14 |
| `GET` | Function | `apps/chef-admin/src/app/api/labor/shifts/route.ts` | 17 |
| `GET` | Function | `apps/chef-admin/src/app/api/labor/staff/route.ts` | 17 |
| `GET` | Function | `apps/chef-admin/src/app/api/menu/[id]/cost/route.ts` | 19 |
| `DELETE` | Function | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/route.ts` | 52 |
| `PATCH` | Function | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/route.ts` | 23 |
| `DELETE` | Function | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/[valueId]/route.ts` | 56 |
| `PATCH` | Function | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/[valueId]/route.ts` | 27 |
| `POST` | Function | `apps/chef-admin/src/app/api/menu/[id]/options/[optionId]/values/route.ts` | 9 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GET → FromMock` | cross_community | 5 |
| `GET → From` | cross_community | 5 |
| `GET → From` | cross_community | 5 |
| `HandlePaymentFailure → FromMock` | intra_community | 5 |
| `HandlePaymentFailure → FromMock` | intra_community | 5 |
| `HandlePaymentFailure → From` | intra_community | 5 |
| `HandlePaymentFailure → From` | intra_community | 5 |
| `GET → HoursBetween` | cross_community | 4 |
| `GET → ComputeIngredientLineCost` | cross_community | 4 |
| `POST → AssertStripeEnvironmentSafety` | cross_community | 4 |

## How to Explore

1. `context({name: "GET"})` — see callers and callees
2. `query({search_query: "repositories"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
