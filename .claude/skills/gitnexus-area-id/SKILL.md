---
name: gitnexus-area-id
description: "Skill for the [id] area of ridendine-marketplace. 223 symbols across 144 files."
---

# [id]

223 symbols | 144 files | Cohesion: 47%

## When to Use

- Working with code in `apps/`
- Understanding how POST, POST, GET work
- Modifying [id]-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/engine/src/orchestrators/inventory.engine.ts` | applyMovementToQuantity, computeInventoryAlerts, computeOnHand, computeReorderSuggestion, computeStockStatus (+1) |
| `apps/ops-admin/src/app/dashboard/orders/[id]/finance-trace-model.ts` | buildFinanceTraceSummary, sumByType, formatFinanceCents, formatLedgerEntryType, getLedgerEntryTone (+1) |
| `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx` | OrderDetailPage, formatAddress, formatLedgerEntity, formatMoney, formatTimestamp (+1) |
| `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx` | DriverDetailPage, formatMoney, formatTimestamp, getDriverComplianceSubject, getDriverOperationsData (+1) |
| `packages/utils/src/rate-limiter.ts` | checkRateLimit, ensureCleanup, getClientIp, getStore, rateLimitResponse |
| `apps/driver-app/src/app/api/driver/notification-preferences/route.ts` | GET, PATCH, buildDefaultPreferences, isMissingPreferenceTableError |
| `apps/ops-admin/src/app/api/team/route.ts` | GET, PATCH, POST, checkRateLimit |
| `packages/utils/src/rate-limit/index.ts` | buildFailClosedDecision, buildIdentifier, evaluateRateLimit, rateLimitPolicyResponse |
| `apps/chef-admin/src/app/api/menu/[id]/route.ts` | DELETE, GET, PATCH, verifyMenuItemOwnership |
| `apps/chef-admin/src/app/dashboard/orders/[id]/page.tsx` | ChefOrderDetailPage, formatStatus, formatTime, money |

## Entry Points

Start here when exploring this area:

- **`POST`** (Function) — `apps/chef-admin/src/app/api/auth/signup/route.ts:79`
- **`POST`** (Function) — `apps/chef-admin/src/app/api/inventory/[id]/movement/route.ts:22`
- **`GET`** (Function) — `apps/chef-admin/src/app/api/inventory/[id]/route.ts:25`
- **`PATCH`** (Function) — `apps/chef-admin/src/app/api/inventory/[id]/route.ts:71`
- **`GET`** (Function) — `apps/chef-admin/src/app/api/inventory/alerts/route.ts:15`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `POST` | Function | `apps/chef-admin/src/app/api/auth/signup/route.ts` | 79 |
| `POST` | Function | `apps/chef-admin/src/app/api/inventory/[id]/movement/route.ts` | 22 |
| `GET` | Function | `apps/chef-admin/src/app/api/inventory/[id]/route.ts` | 25 |
| `PATCH` | Function | `apps/chef-admin/src/app/api/inventory/[id]/route.ts` | 71 |
| `GET` | Function | `apps/chef-admin/src/app/api/inventory/alerts/route.ts` | 15 |
| `POST` | Function | `apps/chef-admin/src/app/api/inventory/counts/route.ts` | 22 |
| `POST` | Function | `apps/chef-admin/src/app/api/inventory/reorder/route.ts` | 32 |
| `POST` | Function | `apps/chef-admin/src/app/api/inventory/route.ts` | 59 |
| `POST` | Function | `apps/chef-admin/src/app/api/inventory/waste/route.ts` | 22 |
| `POST` | Function | `apps/chef-admin/src/app/api/kitchen/brands/clone/route.ts` | 30 |
| `POST` | Function | `apps/chef-admin/src/app/api/kitchen/close-day/route.ts` | 37 |
| `sameDay` | Function | `apps/chef-admin/src/app/api/kitchen/close-day/route.ts` | 106 |
| `POST` | Function | `apps/chef-admin/src/app/api/kitchen/service-mode/route.ts` | 28 |
| `POST` | Function | `apps/chef-admin/src/app/api/labor/clock-in/route.ts` | 17 |
| `POST` | Function | `apps/chef-admin/src/app/api/labor/clock-out/route.ts` | 18 |
| `POST` | Function | `apps/chef-admin/src/app/api/labor/pay-periods/[id]/lock/route.ts` | 16 |
| `POST` | Function | `apps/chef-admin/src/app/api/labor/pay-periods/route.ts` | 37 |
| `POST` | Function | `apps/chef-admin/src/app/api/labor/shifts/route.ts` | 41 |
| `POST` | Function | `apps/chef-admin/src/app/api/labor/staff/route.ts` | 41 |
| `POST` | Function | `apps/chef-admin/src/app/api/menu/categories/route.ts` | 28 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DeliveryDetail → NumOrNull` | cross_community | 5 |
| `SettingsClient → NumOrNull` | cross_community | 5 |
| `DriverDetailPage → FormatComplianceDocumentType` | cross_community | 5 |
| `DriverDetailPage → GetExpiryState` | cross_community | 5 |
| `POST → Upstash` | cross_community | 4 |
| `POST → GetStore` | cross_community | 4 |
| `POST → Upstash` | intra_community | 4 |
| `POST → GetStore` | intra_community | 4 |
| `POST → Upstash` | intra_community | 4 |
| `HandleComplete → NumOrNull` | cross_community | 4 |

## How to Explore

1. `context({name: "POST"})` — see callers and callees
2. `query({search_query: "[id]"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
