# Phase 6 — Cross-app business flow audit

## Customer flow

| Step | Implemented? | Key files |
|------|----------------|-----------|
| Browse marketplace | Yes | `apps/web` storefront pages |
| Chef / menu | Yes | Chef slug routes + API-backed menu |
| Cart | Yes | `apps/web/src/app/api/cart/route.ts`, cart context |
| Checkout + Stripe | Yes | `api/checkout`, `checkout/page.tsx`, `stripe-payment-form.tsx` |
| Order confirmation | Yes | `/orders/[id]/confirmation` + legacy redirect |
| Tracking / notifications | Partial | `live-order-tracker.tsx`, notification bell — realtime wired per Phase 11 notes; edge cases deferred |

**Missing links / placeholders:** RiskEngine not in checkout path (**IRR-022**). No Playwright proof of full browser flow.

## Chef flow

| Step | Implemented? | Key files |
|------|----------------|-----------|
| Auth | Yes | chef-admin auth routes |
| Menu / storefront | Yes | `api/menu/*`, `api/storefront` |
| Availability | Yes | `api/storefront/availability`, dashboard hours |
| Orders lifecycle | Yes | `api/orders`, dashboard orders |
| Payouts | Yes | Stripe Connect setup/request |

**Gap:** `menu_item_availability` time overrides — documented PARTIAL in tracker.

## Ops flow

| Step | Implemented? | Key files |
|------|----------------|-----------|
| Dashboard / orders | Yes | `api/orders`, dashboard pages |
| Engine control | Yes | `api/engine/*` |
| Support queue | Yes | `api/support`, web customer tickets |
| Finance / export | Partial | `dashboard/finance`, `api/export` — depth IRR-021/028 |
| Audit timeline | Yes | `api/audit/recent` |

## Driver flow

| Step | Implemented? | Key files |
|------|----------------|-----------|
| Auth | Yes | driver-app auth API |
| Offers / deliveries | Yes | `api/offers`, `api/deliveries` |
| Location | Yes | `api/location` + rate limit |
| Earnings | Yes | `api/earnings` |

**Gap:** Client-side realtime for driver-app explicitly deferred in tracker Phase 11.

## Cross-app wiring

- Chef signup from web: **VERIFIED** — `chef-signup` uses public chef-admin URLs (`apps/web/src/app/chef-signup/page.tsx`).
- Deep links env-driven — aligns with `CROSS_APP_CONTRACTS.md`.

## “Fake local state” risk

Checkout page may still hold **display** state before POST returns — authoritative totals from API per IRR-020 partial; **no** evidence of fake **payment** success without Stripe.
