---
name: gitnexus-area-orders
description: "Skill for the Orders area of ridendine-marketplace. 45 symbols across 10 files."
---

# Orders

45 symbols | 10 files | Cohesion: 87%

## When to Use

- Working with code in `apps/`
- Understanding how OrdersLedger, filtered, OrderProgressStepper work
- Modifying orders-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/chef-admin/src/components/orders/orders-ledger.tsx` | OrdersLedger, filtered, customerName, formatDateTime, isException (+10) |
| `apps/web/src/components/orders/order-progress-stepper.tsx` | DriverInfo, EstimatedDelivery, OrderProgressStepper, StepCircle, StepRow (+2) |
| `apps/web/src/lib/orders/use-order-stream.ts` | applyBroadcastPayload, numOrNull, useOrderStream, clearPoll, ch (+1) |
| `apps/ops-admin/src/app/dashboard/orders/page.tsx` | OrdersPage, fetchOrders, handleWorkflowAction, formatStatus, getStatusVariant |
| `apps/web/src/app/account/orders/page.tsx` | OrdersPage, fetchOrders, formatDate, handleReorder |
| `apps/web/src/lib/orders/customer-order-workflow.ts` | buildCustomerOrderWorkflow, customerOrderSupportHref |
| `packages/utils/src/order-workflow.ts` | formatOrderStatusFallbackLabel, normalizeOrderStatus |
| `apps/web/src/components/orders/order-confirmation-hero.tsx` | OrderConfirmationHero, formatTotal |
| `packages/db/src/realtime/channels.ts` | orderChannel |
| `packages/ui/src/components/empty-state.tsx` | NoOrdersEmpty |

## Entry Points

Start here when exploring this area:

- **`OrdersLedger`** (Function) — `apps/chef-admin/src/components/orders/orders-ledger.tsx:132`
- **`filtered`** (Function) — `apps/chef-admin/src/components/orders/orders-ledger.tsx:154`
- **`OrderProgressStepper`** (Function) — `apps/web/src/components/orders/order-progress-stepper.tsx:273`
- **`useOrderStream`** (Function) — `apps/web/src/lib/orders/use-order-stream.ts:57`
- **`clearPoll`** (Function) — `apps/web/src/lib/orders/use-order-stream.ts:85`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `OrdersLedger` | Function | `apps/chef-admin/src/components/orders/orders-ledger.tsx` | 132 |
| `filtered` | Function | `apps/chef-admin/src/components/orders/orders-ledger.tsx` | 154 |
| `OrderProgressStepper` | Function | `apps/web/src/components/orders/order-progress-stepper.tsx` | 273 |
| `useOrderStream` | Function | `apps/web/src/lib/orders/use-order-stream.ts` | 57 |
| `clearPoll` | Function | `apps/web/src/lib/orders/use-order-stream.ts` | 85 |
| `ch` | Function | `apps/web/src/lib/orders/use-order-stream.ts` | 165 |
| `startPoll` | Function | `apps/web/src/lib/orders/use-order-stream.ts` | 142 |
| `orderChannel` | Function | `packages/db/src/realtime/channels.ts` | 6 |
| `OrdersPage` | Function | `apps/ops-admin/src/app/dashboard/orders/page.tsx` | 54 |
| `fetchOrders` | Function | `apps/ops-admin/src/app/dashboard/orders/page.tsx` | 63 |
| `handleWorkflowAction` | Function | `apps/ops-admin/src/app/dashboard/orders/page.tsx` | 83 |
| `OrdersPage` | Function | `apps/web/src/app/account/orders/page.tsx` | 30 |
| `fetchOrders` | Function | `apps/web/src/app/account/orders/page.tsx` | 40 |
| `formatDate` | Function | `apps/web/src/app/account/orders/page.tsx` | 105 |
| `handleReorder` | Function | `apps/web/src/app/account/orders/page.tsx` | 82 |
| `NoOrdersEmpty` | Function | `packages/ui/src/components/empty-state.tsx` | 38 |
| `deliveryOptions` | Function | `apps/chef-admin/src/components/orders/orders-ledger.tsx` | 150 |
| `paymentOptions` | Function | `apps/chef-admin/src/components/orders/orders-ledger.tsx` | 146 |
| `statusOptions` | Function | `apps/chef-admin/src/components/orders/orders-ledger.tsx` | 142 |
| `exportCsv` | Function | `apps/chef-admin/src/components/orders/orders-ledger.tsx` | 194 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DeliveryDetail → NumOrNull` | cross_community | 5 |
| `SettingsClient → NumOrNull` | cross_community | 5 |
| `HandleComplete → NumOrNull` | cross_community | 4 |
| `OrdersPage → Cn` | cross_community | 4 |

## How to Explore

1. `context({name: "OrdersLedger"})` — see callers and callees
2. `query({search_query: "orders"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
