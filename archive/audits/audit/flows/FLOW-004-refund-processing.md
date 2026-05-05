---
id: FLOW-004
name: Refund Processing
entry_point: apps/ops-admin/src/app/api/engine/refunds/route.ts
actors: Ops Admin, OpsAdmin App, CommerceLedgerEngine, Stripe, Supabase
---

# [[FLOW-004]] Refund Processing

## Summary
Ops admin requests a refund, it goes through approval, then Stripe processes the refund with corresponding ledger entries and payout adjustments.

## Steps
1. Ops requests refund → `POST /api/engine/refunds` with action=request
2. [[CMP-009]] CommerceLedgerEngine.requestRefund() validates amount
3. Checks existing refunds don't exceed order total
4. refund_cases record created with status='pending'
5. Order status updated to 'refund_pending'
6. Domain event 'refund.requested' emitted
7. Finance admin approves → CommerceLedgerEngine.approveRefund()
8. refund_cases updated with approved_amount_cents
9. System processes → CommerceLedgerEngine.processRefund()
10. Stripe refund created via stripe.refunds.create()
11. Ledger entry created: customer_refund (negative amount)
12. Order payment_status updated to 'refunded' or remains 'completed' for partial
13. Payout adjustments created for chef and driver (proportional clawback)
14. Domain event 'refund.processed' emitted

## Sequence Diagram
See [[diagrams/flows/FLOW-004.mmd]]

## Key Components
- [[CMP-009]] CommerceLedgerEngine
- [[CMP-003]] AuditLogger

## Error Paths
- Amount exceeds order total → INVALID_AMOUNT
- Total refunded exceeds remaining → EXCEEDS_REMAINING
- Not authorized → FORBIDDEN
