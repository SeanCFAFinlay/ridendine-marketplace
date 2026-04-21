# Payments Domain

> Stripe integration for customer payments, chef payouts, and financial operations.

## Architecture

```
Customer pays → Stripe PaymentIntent → Webhook → Engine → Ledger
Chef payout → Stripe Connect Express → Transfer
Refund → Ops approval → Stripe Refund → Ledger reversal
```

## Customer Payment (Stripe PaymentIntents)

**Files**: `web/checkout/page.tsx`, `web/api/checkout/route.ts`, `web/api/webhooks/stripe/route.ts`

1. POST `/api/checkout` creates PaymentIntent with `amount_cents`, `currency: 'cad'`
2. Client renders Stripe PaymentElement via `loadStripe()` + `<Elements>`
3. `stripe.confirmPayment()` processes card
4. Webhook `payment_intent.succeeded` → `engine.orders.submitToKitchen()`

**Env vars**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
**API version**: `2026-02-25.clover`

## Chef Payouts (Stripe Connect Express)

**Files**: `chef-admin/api/payouts/setup/route.ts`, `chef-admin/api/payouts/request/route.ts`

1. Chef initiates → `stripe.accounts.create({type: 'express', country: 'CA'})`
2. Onboarding link → chef completes KYC on Stripe
3. Account stored in `chef_payout_accounts` (stripe_account_id, status)
4. Chef requests payout (min $10) → `stripe.transfers.create()`
5. Transfer recorded in `chef_payouts` with `stripe_transfer_id`

**Fees displayed to chef**: 15% platform + 2.9% + $0.30 Stripe

## Refunds (Ops-Initiated)

**Files**: `ops-admin/api/orders/[id]/refund/route.ts`, `ops-admin/api/engine/finance/route.ts`

Two refund paths:
1. **Direct Stripe refund** via `/api/orders/[id]/refund` → `stripe.refunds.create()`
2. **Engine refund workflow** via `/api/engine/finance` → `commerce.approveRefund()` + `commerce.processRefund()`

## Financial Tracking

**Ledger entries** (`ledger_entries` table):
- Created on order completion by `PlatformWorkflowEngine.completeDeliveredOrder()`
- Types: platform_fee, chef_payout, driver_payout, tax_collected
- All amounts in cents (CAD)

**Refund cases** (`refund_cases` table):
- Lifecycle: pending → approved/denied → processing → completed/failed
- Links to order and optional exception

**Payout adjustments** (`payout_adjustments` table):
- Modifications to chef/driver payouts (e.g., after refund)
- Types: hold, reversal, adjustment

## Fee Structure

| Fee | Rate | Source |
|-----|------|--------|
| Delivery fee | $5.00 flat | Engine constant (but constant says $3.99 — inconsistency) |
| Service fee | 8% of subtotal | Engine constant |
| HST | 13% of (subtotal + service_fee) | Engine constant |
| Platform fee | 15% of order total | Engine constant |
| Driver payout | 80% of delivery fee | Engine constant |
| Stripe processing | 2.9% + $0.30 | Displayed to chef, not calculated |

## Known Issues

1. **Fee constant inconsistency**: `BASE_DELIVERY_FEE=399` (cents = $3.99) in engine, but $5.00 displayed and used in checkout
2. **Platform settings vs engine constants**: `platform_settings` table has fee fields but checkout uses hardcoded constants
3. **No automated payout schedule**: Chef must manually request payouts
4. **No batch payout runs**: `payout_runs` table exists but batch system not implemented
