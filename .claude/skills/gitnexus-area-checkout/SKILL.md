---
name: gitnexus-area-checkout
description: "Skill for the Checkout area of ridendine-marketplace. 29 symbols across 6 files."
---

# Checkout

29 symbols | 6 files | Cohesion: 84%

## When to Use

- Working with code in `apps/`
- Understanding how runCheckout, getStripePublishableKey, CheckoutPage work
- Modifying checkout-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/web/src/app/checkout/page.tsx` | CheckoutContent, loadData, handlePromoChange, validatePromo, CheckoutPage (+5) |
| `apps/web/src/components/checkout/delivery-time-picker.tsx` | DateTabs, DeliveryTimePicker, TimeSlotGrid, formatDayLabel, formatTimeSlot (+1) |
| `apps/web/src/lib/checkout/run-checkout.ts` | CheckoutFailure, deriveIdempotencyKey, hashPayload, isStaleProcessingRow, runCheckout |
| `apps/web/src/components/checkout/saved-card-selector.tsx` | SavedCardSelector, handleSaveCard, handleSelect, brandLabel, formatExpiry |
| `apps/web/src/lib/checkout/quote.ts` | CheckoutQuoteResult, QuoteComputation |
| `packages/engine/src/services/stripe.service.ts` | getStripePublishableKey |

## Entry Points

Start here when exploring this area:

- **`runCheckout`** (Function) — `apps/web/src/lib/checkout/run-checkout.ts:248`
- **`getStripePublishableKey`** (Function) — `packages/engine/src/services/stripe.service.ts:132`
- **`CheckoutPage`** (Function) — `apps/web/src/app/checkout/page.tsx:871`
- **`DeliveryTimePicker`** (Function) — `apps/web/src/components/checkout/delivery-time-picker.tsx:109`
- **`SavedCardSelector`** (Function) — `apps/web/src/components/checkout/saved-card-selector.tsx:32`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `runCheckout` | Function | `apps/web/src/lib/checkout/run-checkout.ts` | 248 |
| `getStripePublishableKey` | Function | `packages/engine/src/services/stripe.service.ts` | 132 |
| `CheckoutPage` | Function | `apps/web/src/app/checkout/page.tsx` | 871 |
| `DeliveryTimePicker` | Function | `apps/web/src/components/checkout/delivery-time-picker.tsx` | 109 |
| `SavedCardSelector` | Function | `apps/web/src/components/checkout/saved-card-selector.tsx` | 32 |
| `handleSaveCard` | Function | `apps/web/src/components/checkout/saved-card-selector.tsx` | 110 |
| `handleSelect` | Function | `apps/web/src/components/checkout/saved-card-selector.tsx` | 101 |
| `CheckoutQuoteResult` | Interface | `apps/web/src/lib/checkout/quote.ts` | 61 |
| `QuoteComputation` | Interface | `apps/web/src/lib/checkout/quote.ts` | 47 |
| `CheckoutFailure` | Class | `apps/web/src/lib/checkout/run-checkout.ts` | 222 |
| `deriveIdempotencyKey` | Function | `apps/web/src/lib/checkout/run-checkout.ts` | 73 |
| `hashPayload` | Function | `apps/web/src/lib/checkout/run-checkout.ts` | 69 |
| `isStaleProcessingRow` | Function | `apps/web/src/lib/checkout/run-checkout.ts` | 117 |
| `CheckoutContent` | Function | `apps/web/src/app/checkout/page.tsx` | 132 |
| `loadData` | Function | `apps/web/src/app/checkout/page.tsx` | 176 |
| `handlePromoChange` | Function | `apps/web/src/app/checkout/page.tsx` | 286 |
| `validatePromo` | Function | `apps/web/src/app/checkout/page.tsx` | 252 |
| `LoadingFallback` | Function | `apps/web/src/app/checkout/page.tsx` | 867 |
| `DateTabs` | Function | `apps/web/src/components/checkout/delivery-time-picker.tsx` | 36 |
| `TimeSlotGrid` | Function | `apps/web/src/components/checkout/delivery-time-picker.tsx` | 68 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `RunCheckout → Update` | cross_community | 4 |
| `RunCheckout → FinalizeResult` | cross_community | 4 |
| `RunCheckout → IsAllowedCurrency` | cross_community | 4 |
| `RunCheckout → NormalizeCurrency` | cross_community | 4 |

## How to Explore

1. `context({name: "runCheckout"})` — see callers and callees
2. `query({search_query: "checkout"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
