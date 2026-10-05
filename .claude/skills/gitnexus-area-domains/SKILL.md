---
name: gitnexus-area-domains
description: "Skill for the Domains area of ridendine-marketplace. 28 symbols across 8 files."
---

# Domains

28 symbols | 8 files | Cohesion: 94%

## When to Use

- Working with code in `packages/`
- Understanding how summarizeDriverComplianceDocuments, ChefStorefront, ChefStorefrontWithDetails work
- Modifying domains-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/types/src/domains/chef.ts` | ChefStorefront, ChefStorefrontWithDetails, MenuCategory, MenuCategoryWithItems, MenuItem (+3) |
| `packages/types/src/domains/driver.ts` | isDocumentExpired, normalizeDocumentValue, summarizeDriverComplianceDocuments, Driver, DriverWithDetails (+2) |
| `packages/types/src/domains/customer.ts` | Cart, CartWithItems, CartItem, CartItemWithDetails |
| `packages/types/src/domains/order.ts` | Order, OrderWithDetails, OrderItem, OrderItemWithModifiers |
| `packages/types/src/domains/delivery.ts` | Delivery, DeliveryWithDetails |
| `apps/ops-admin/src/app/api/ops/live-board/route.ts` | countComplianceOpenItems |
| `apps/ops-admin/src/lib/driver-operations.ts` | summarizeCompliance |
| `packages/engine/src/orchestrators/driver-matching.service.ts` | buildDriverComplianceMap |

## Entry Points

Start here when exploring this area:

- **`summarizeDriverComplianceDocuments`** (Function) — `packages/types/src/domains/driver.ts:49`
- **`ChefStorefront`** (Interface) — `packages/types/src/domains/chef.ts:35`
- **`ChefStorefrontWithDetails`** (Interface) — `packages/types/src/domains/chef.ts:200`
- **`MenuCategory`** (Interface) — `packages/types/src/domains/chef.ts:138`
- **`MenuCategoryWithItems`** (Interface) — `packages/types/src/domains/chef.ts:206`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `summarizeDriverComplianceDocuments` | Function | `packages/types/src/domains/driver.ts` | 49 |
| `ChefStorefront` | Interface | `packages/types/src/domains/chef.ts` | 35 |
| `ChefStorefrontWithDetails` | Interface | `packages/types/src/domains/chef.ts` | 200 |
| `MenuCategory` | Interface | `packages/types/src/domains/chef.ts` | 138 |
| `MenuCategoryWithItems` | Interface | `packages/types/src/domains/chef.ts` | 206 |
| `MenuItem` | Interface | `packages/types/src/domains/chef.ts` | 149 |
| `MenuItemWithOptions` | Interface | `packages/types/src/domains/chef.ts` | 210 |
| `MenuItemOption` | Interface | `packages/types/src/domains/chef.ts` | 166 |
| `MenuItemOptionWithValues` | Interface | `packages/types/src/domains/chef.ts` | 214 |
| `Cart` | Interface | `packages/types/src/domains/customer.ts` | 34 |
| `CartWithItems` | Interface | `packages/types/src/domains/customer.ts` | 70 |
| `CartItem` | Interface | `packages/types/src/domains/customer.ts` | 42 |
| `CartItemWithDetails` | Interface | `packages/types/src/domains/customer.ts` | 77 |
| `Delivery` | Interface | `packages/types/src/domains/delivery.ts` | 6 |
| `DeliveryWithDetails` | Interface | `packages/types/src/domains/delivery.ts` | 65 |
| `Driver` | Interface | `packages/types/src/domains/driver.ts` | 100 |
| `DriverWithDetails` | Interface | `packages/types/src/domains/driver.ts` | 211 |
| `DriverShift` | Interface | `packages/types/src/domains/driver.ts` | 141 |
| `DriverShiftSummary` | Interface | `packages/types/src/domains/driver.ts` | 217 |
| `Order` | Interface | `packages/types/src/domains/order.ts` | 7 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GET → IsDocumentExpired` | cross_community | 3 |
| `GET → NormalizeDocumentValue` | cross_community | 3 |

## How to Explore

1. `context({name: "summarizeDriverComplianceDocuments"})` — see callers and callees
2. `query({search_query: "domains"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
