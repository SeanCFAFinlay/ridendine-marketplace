---
id: CMP-050
name: WebCheckoutRoute
layer: Controller
subsystem: WebApp
path: apps/web/src/app/api/checkout/route.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-050]] WebCheckoutRoute

## Responsibility
Handles checkout POST requests: validates cart, applies promos, creates Stripe PaymentIntent, and returns client secret.

## Public API
- `POST /api/checkout` — initiates checkout, returns Stripe client_secret

## Depends on (outbound)
- [[CMP-006]] OrderOrchestrator — creates order record
- [[CMP-035]] PromoRepository — validates promo code
- Stripe SDK — creates PaymentIntent

## Depended on by (inbound)
- Web frontend checkout page

## Reads config
- `STRIPE_SECRET_KEY`

## Side effects
- Stripe PaymentIntent creation (external call)
- Promo validation and reservation

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`apps/web/src/app/api/checkout/route.ts`
