---
id: FND-017
category: BrokenWire
severity: Medium
effort: M
---

# [[FND-017]] Stripe payments not voided on rejection/cancellation

## Summary
OrderOrchestrator.rejectOrder() and cancelOrder() write ledger entries for payment voids but never actually call stripe.paymentIntents.cancel(). The authorized amount remains held on the customer's card.

## Affected components
- [[CMP-006]] OrderOrchestrator

## Evidence
- `packages/engine/src/orchestrators/order.orchestrator.ts` lines 657-667 (rejectOrder)
- `packages/engine/src/orchestrators/order.orchestrator.ts` lines 983-992 (cancelOrder)

## Why this matters
Customers see holds on their cards that never release. Stripe authorizations expire after 7 days, but the customer experience is poor and could trigger chargebacks.

## Proposed fix
Add stripe.paymentIntents.cancel() calls or wire through CommerceLedgerEngine for actual Stripe API calls.
