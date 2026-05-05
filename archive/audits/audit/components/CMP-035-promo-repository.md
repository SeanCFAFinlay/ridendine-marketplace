---
id: CMP-035
name: PromoRepository
layer: Repository
subsystem: Commerce
path: packages/db/src/repositories/promo.repository.ts
language: TypeScript
loc: 123
---

# [[CMP-035]] PromoRepository

## Responsibility
Provides database read/write operations for promo codes including validation and redemption tracking.

## Public API
- `getPromoByCode(code) -> Promise<PromoCode | null>` — fetches promo code record
- `validatePromo(code, customerId, orderTotal) -> Promise<ValidationResult>` — validates promo eligibility
- `recordRedemption(promoId, orderId, customerId) -> Promise<void>` — records promo usage

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-050]] WebCheckoutRoute — promo validation at checkout
- [[CMP-006]] OrderOrchestrator — discount application

## Reads config
- None

## Side effects
- DB writes: promo_redemptions
- DB reads: promo_codes (schema drift with migration — see [[FND-002]])

## Tests
- ❓ UNKNOWN

## Smells / notes
- promo_codes table has schema drift between migrations — see [[FND-002]]

## Source
`packages/db/src/repositories/promo.repository.ts` (lines 1–123)
