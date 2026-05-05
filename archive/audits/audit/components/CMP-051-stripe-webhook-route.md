---
id: CMP-051
name: StripeWebhookRoute
layer: Controller
subsystem: WebApp
path: apps/web/src/app/api/webhooks/stripe/route.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-051]] StripeWebhookRoute

## Responsibility
Receives and verifies Stripe webhook events (payment_intent.succeeded, payment_intent.payment_failed) and triggers engine actions accordingly.

## Public API
- `POST /api/webhooks/stripe` — Stripe webhook receiver

## Depends on (outbound)
- [[CMP-006]] OrderOrchestrator — calls authorizePayment on success
- [[CMP-009]] CommerceLedgerEngine — records payment capture
- Stripe SDK — webhook signature verification

## Depended on by (inbound)
- Stripe (external webhook source)

## Reads config
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Side effects
- Triggers order and ledger state transitions on payment events

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`apps/web/src/app/api/webhooks/stripe/route.ts`
