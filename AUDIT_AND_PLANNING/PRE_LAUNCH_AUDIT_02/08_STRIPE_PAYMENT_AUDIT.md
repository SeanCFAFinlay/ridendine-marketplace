# Phase 7 — Stripe, checkout, webhooks, payouts

## Environment separation

| Variable | Role | Notes |
|----------|------|--------|
| `STRIPE_SECRET_KEY` | Server-only | Used via `getStripeClient()` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client publishable | Expected |
| `STRIPE_WEBHOOK_SECRET` | Server webhook HMAC | Required — throws if missing in webhook route |

**Live vs test:** Separation is **standard Stripe env discipline** — **no live keys in repo**. Production safety depends on **deployment env** never pointing staging/dev URLs at live keys — **process / Infra verified outside repo**.

## Webhook

| Control | Status | Evidence |
|---------|--------|----------|
| Signature verification | **VERIFIED** | `stripe.webhooks.constructEvent` in `apps/web/src/app/api/webhooks/stripe/route.ts` before admin client use |
| Idempotency | **VERIFIED** | `claimStripeWebhookEventForProcessing` + finalize; engine tests `stripe-webhook-idempotency.test.ts` (7 tests) |
| Logging | **VERIFIED** | `redactSensitiveForLog` on errors |
| Replay safe response | **VERIFIED** | Engine design returns idempotent replay path (per tests/docs) |

## Checkout

| Control | Status | Evidence |
|---------|--------|----------|
| Auth required | **VERIFIED** | `getCustomerActorContext` 401 |
| Rate limit | **VERIFIED** | `checkRateLimit` + `RATE_LIMITS.checkout` |
| Kitchen readiness | **VERIFIED** | `validateCustomerCheckoutReadiness` |
| Admin cart scope | **VERIFIED** | `getCartWithItems(..., customerContext.customerId, ...)` |

## RiskEngine (payments / fraud)

**NOT WIRED** — `evaluateCheckoutRisk` not imported in checkout route (grep). **High** product risk vs doc claims.

## Payouts

- Chef Connect: `getStripeClient()` on `apps/chef-admin/.../payouts/setup` and request routes — **VERIFIED** pattern (IRR-018).

## Client-trusted totals

Checkout UI: tracker + code indicate server owns PI + order creation; UI shows breakdown after POST — **PARTIAL** display subtotals remain — acceptable if labeled (verify UX copy in `checkout/page.tsx` during hardening).

## Ops reconciliation

- Export `stripe_events` for finance role — **PARTIAL** depth vs full CFO matrix (IRR-028).
