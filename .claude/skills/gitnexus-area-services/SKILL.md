---
name: gitnexus-area-services
description: "Skill for the Services area of ridendine-marketplace. 113 symbols across 35 files."
---

# Services

113 symbols | 35 files | Cohesion: 73%

## When to Use

- Working with code in `packages/`
- Understanding how createLedgerService, makeLedgerIdempotencyKey, costing work
- Modifying services-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/engine/src/services/ledger.service.ts` | LedgerService, createLedgerService, makeLedgerIdempotencyKey, insertIdempotent, recordCustomerCapture (+6) |
| `packages/engine/src/services/costing.service.ts` | computeBatchIngredientCost, computeIngredientLineCost, computeMenuItemCosting, computePackagingCost, computePerPortionFoodCost (+4) |
| `packages/engine/src/services/storage.service.ts` | generateStoragePath, isValidFileSize, isValidImageType, uploadChefProfileImage, uploadMenuItemImage (+4) |
| `packages/engine/src/services/payout.service.ts` | executeInstantPayout, instantFeeCents, bankPayoutTable, markBankPayoutPaid, markBankPayoutSubmitted (+2) |
| `packages/engine/src/services/stripe.service.ts` | StripeTestModeUnavailableError, assertStripeConfigured, assertStripeEnvironmentSafety, assertTestSecretKey, getOrCreateStripeCustomer (+2) |
| `packages/engine/src/services/geocoding.service.ts` | haversineDistanceKm, isWithinDeliveryZone, toRad, buildAddressString, geocodeAddress |
| `packages/engine/src/services/permissions.service.ts` | canAccessAdminDashboard, canManageOrders, isAdmin, canManageChefs, canManageDrivers |
| `apps/web/src/lib/checkout/quote.ts` | computeQuoteFromItems, computeServerQuote, fail, buildPartnerQuote |
| `packages/engine/src/services/inventory-consumption.service.ts` | buildConsumeOrderMovements, computeOrderStockConsumption, perPortionIngredientUsage, round4 |
| `packages/engine/src/services/referral.service.ts` | generateCode, generateCode, generateCodeString, mapCodeRow |

## Entry Points

Start here when exploring this area:

- **`createLedgerService`** (Function) — `packages/engine/src/services/ledger.service.ts:331`
- **`makeLedgerIdempotencyKey`** (Function) — `packages/engine/src/services/ledger.service.ts:23`
- **`costing`** (Function) — `apps/chef-admin/src/components/recipes/recipe-builder-modal.tsx:63`
- **`submit`** (Function) — `apps/chef-admin/src/components/recipes/recipe-builder-modal.tsx:80`
- **`costing`** (Function) — `apps/chef-admin/src/components/recipes/recipe-version-modal.tsx:46`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `LedgerService` | Class | `packages/engine/src/services/ledger.service.ts` | 27 |
| `StripeTestModeUnavailableError` | Class | `packages/engine/src/services/stripe.service.ts` | 59 |
| `TaxConfigService` | Class | `packages/engine/src/services/tax-config.service.ts` | 28 |
| `createLedgerService` | Function | `packages/engine/src/services/ledger.service.ts` | 331 |
| `makeLedgerIdempotencyKey` | Function | `packages/engine/src/services/ledger.service.ts` | 23 |
| `costing` | Function | `apps/chef-admin/src/components/recipes/recipe-builder-modal.tsx` | 63 |
| `submit` | Function | `apps/chef-admin/src/components/recipes/recipe-builder-modal.tsx` | 80 |
| `costing` | Function | `apps/chef-admin/src/components/recipes/recipe-version-modal.tsx` | 46 |
| `submit` | Function | `apps/chef-admin/src/components/recipes/recipe-version-modal.tsx` | 59 |
| `menuItemFoodCostMap` | Function | `apps/chef-admin/src/lib/food-cost.ts` | 40 |
| `computeBatchIngredientCost` | Function | `packages/engine/src/services/costing.service.ts` | 133 |
| `computeIngredientLineCost` | Function | `packages/engine/src/services/costing.service.ts` | 127 |
| `computeMenuItemCosting` | Function | `packages/engine/src/services/costing.service.ts` | 151 |
| `computePackagingCost` | Function | `packages/engine/src/services/costing.service.ts` | 143 |
| `computePerPortionFoodCost` | Function | `packages/engine/src/services/costing.service.ts` | 138 |
| `DELETE` | Function | `apps/web/src/app/api/payment-methods/route.ts` | 41 |
| `GET` | Function | `apps/web/src/app/api/payment-methods/route.ts` | 12 |
| `getStripe` | Function | `packages/engine/src/core/engine.factory.ts` | 119 |
| `assertStripeConfigured` | Function | `packages/engine/src/services/stripe.service.ts` | 50 |
| `getOrCreateStripeCustomer` | Function | `packages/engine/src/services/stripe.service.ts` | 150 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GET → Pct` | intra_community | 4 |
| `GET → ComputeIngredientLineCost` | cross_community | 4 |
| `POST → AssertStripeEnvironmentSafety` | cross_community | 4 |
| `POST → StripeTestModeUnavailableError` | cross_community | 4 |
| `GET → PerPortionIngredientUsage` | cross_community | 4 |
| `GET → Round4` | cross_community | 4 |
| `POST → ComputeMultiplier` | cross_community | 4 |
| `GET → HoursBetween` | cross_community | 4 |
| `GET → ComputeIngredientLineCost` | cross_community | 4 |
| `GET → AssertStripeEnvironmentSafety` | cross_community | 4 |

## How to Explore

1. `context({name: "createLedgerService"})` — see callers and callees
2. `query({search_query: "services"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
