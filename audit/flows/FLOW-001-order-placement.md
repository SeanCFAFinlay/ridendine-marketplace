---
id: FLOW-001
name: Order Placement
entry_point: apps/web/src/app/api/checkout/route.ts
actors: Customer, Web App, OrderOrchestrator, CommerceLedgerEngine, Supabase, Stripe
---

# [[FLOW-001]] Order Placement

## Summary
Customer adds items to cart, proceeds to checkout, payment is authorized via Stripe, order is created and submitted to the chef's kitchen queue.

## Steps
1. Customer adds items to cart → `POST /api/cart` → [[CMP-031]] CartRepository
2. Customer initiates checkout → `POST /api/checkout` → [[CMP-050]] WebCheckoutRoute
3. Checkout route creates Stripe PaymentIntent via `stripe.paymentIntents.create()`
4. Checkout route calls [[CMP-006]] OrderOrchestrator.createOrder()
5. OrderOrchestrator validates menu items against storefront
6. OrderOrchestrator calculates subtotal, delivery fee ($5), service fee (8%), HST (13%), tip
7. OrderOrchestrator inserts `orders` and `order_items` records
8. OrderOrchestrator.authorizePayment() records payment intent
9. [[CMP-009]] CommerceLedgerEngine.recordPaymentAuth() creates `ledger_entries` record
10. OrderOrchestrator.submitToKitchen() updates order status to 'pending'
11. SLA timer started for chef response
12. Notification inserted for chef user
13. Order status history record created
14. Domain events emitted: order.created, order.payment_authorized, order.submitted

## Sequence Diagram
See [[diagrams/flows/FLOW-001.mmd]]

## Key Components
- [[CMP-050]] WebCheckoutRoute
- [[CMP-006]] OrderOrchestrator
- [[CMP-009]] CommerceLedgerEngine
- [[CMP-004]] SLAManager
- [[CMP-002]] DomainEventEmitter

## Error Paths
- Menu item unavailable → returns ITEM_UNAVAILABLE
- Item from wrong storefront → returns INVALID_STOREFRONT
- Order insert fails → returns CREATE_FAILED
- Order items insert fails → order is deleted (manual rollback)

## Related Findings
- [[FND-018]] Notification insert may fail with null user_id
