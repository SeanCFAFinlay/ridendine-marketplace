---
name: gitnexus-area-kitchen
description: "Skill for the Kitchen area of ridendine-marketplace. 34 symbols across 7 files."
---

# Kitchen

34 symbols | 7 files | Cohesion: 88%

## When to Use

- Working with code in `apps/`
- Understanding how KitchenOrderQueue, handleAction, LiveIndicator work
- Modifying kitchen-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx` | KitchenOrderQueue, handleAction, isTerminalStatus, mergeHydrated, rank (+9) |
| `apps/chef-admin/src/app/dashboard/kitchen/page.tsx` | KitchenPage, fetchData, togglePause, togglePrepped, PageSkeleton (+3) |
| `apps/chef-admin/src/components/kitchen/prep-countdown.tsx` | PrepCountdown, formatMs, target, resolveTarget |
| `apps/chef-admin/src/components/kitchen/service-controls.tsx` | ServiceControls, setServiceMode, Stat, money |
| `apps/chef-admin/src/hooks/use-storefront-orders-realtime.ts` | useStorefrontOrdersRealtime, hydrateOrder |
| `packages/ui/src/components/live-indicator.tsx` | LiveIndicator |
| `packages/db/src/realtime/channels.ts` | chefStorefrontOrdersChannel |

## Entry Points

Start here when exploring this area:

- **`KitchenOrderQueue`** (Function) — `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx:323`
- **`handleAction`** (Function) — `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx:430`
- **`LiveIndicator`** (Function) — `packages/ui/src/components/live-indicator.tsx:23`
- **`KitchenPage`** (Function) — `apps/chef-admin/src/app/dashboard/kitchen/page.tsx:202`
- **`fetchData`** (Function) — `apps/chef-admin/src/app/dashboard/kitchen/page.tsx:209`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `KitchenOrderQueue` | Function | `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx` | 323 |
| `handleAction` | Function | `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx` | 430 |
| `LiveIndicator` | Function | `packages/ui/src/components/live-indicator.tsx` | 23 |
| `KitchenPage` | Function | `apps/chef-admin/src/app/dashboard/kitchen/page.tsx` | 202 |
| `fetchData` | Function | `apps/chef-admin/src/app/dashboard/kitchen/page.tsx` | 209 |
| `togglePause` | Function | `apps/chef-admin/src/app/dashboard/kitchen/page.tsx` | 229 |
| `togglePrepped` | Function | `apps/chef-admin/src/app/dashboard/kitchen/page.tsx` | 244 |
| `handleInsert` | Function | `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx` | 402 |
| `handleUpdate` | Function | `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx` | 416 |
| `hydrateAndUpsert` | Function | `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx` | 351 |
| `useStorefrontOrdersRealtime` | Function | `apps/chef-admin/src/hooks/use-storefront-orders-realtime.ts` | 30 |
| `hydrateOrder` | Function | `apps/chef-admin/src/hooks/use-storefront-orders-realtime.ts` | 44 |
| `chefStorefrontOrdersChannel` | Function | `packages/db/src/realtime/channels.ts` | 11 |
| `PrepCountdown` | Function | `apps/chef-admin/src/components/kitchen/prep-countdown.tsx` | 65 |
| `ServiceControls` | Function | `apps/chef-admin/src/components/kitchen/service-controls.tsx` | 30 |
| `setServiceMode` | Function | `apps/chef-admin/src/components/kitchen/service-controls.tsx` | 36 |
| `target` | Function | `apps/chef-admin/src/components/kitchen/prep-countdown.tsx` | 77 |
| `isTerminalStatus` | Function | `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx` | 63 |
| `mergeHydrated` | Function | `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx` | 72 |
| `rank` | Function | `apps/chef-admin/src/components/kitchen/kitchen-order-queue.tsx` | 59 |

## How to Explore

1. `context({name: "KitchenOrderQueue"})` — see callers and callees
2. `query({search_query: "kitchen"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
