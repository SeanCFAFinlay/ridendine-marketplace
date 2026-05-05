# Ridendine Payment Workflow Schematic

This schematic reflects the current repo wiring only. It shows Ridendine as merchant of record: the customer pays Ridendine through Stripe, the order moves into kitchen/dispatch flow after Stripe confirmation, and finance records ledger, payout, refund, and reconciliation state through engine services.

## End-To-End Payment Flow

```mermaid
flowchart TD
  Customer["Customer checkout page"] --> CheckoutApi["POST /api/checkout<br/>apps/web/src/app/api/checkout/route.ts"]

  CheckoutApi --> Auth["Customer auth context<br/>getCustomerActorContext"]
  CheckoutApi --> Cart["Read cart + cart_items<br/>getCartWithItems"]
  CheckoutApi --> Menu["Validate menu_items<br/>price, storefront, availability"]
  CheckoutApi --> Quote["Server quote<br/>subtotal + delivery fee + service fee + HST + tip - promo"]
  CheckoutApi --> Risk["Checkout risk check<br/>evaluateCheckoutRisk"]
  CheckoutApi --> KitchenReady["Kitchen readiness check<br/>engine.kitchen.validateCustomerCheckoutReadiness"]
  CheckoutApi --> Idempotency["checkout_idempotency_keys<br/>request hash + processing/completed/failed"]

  Idempotency --> OrderCreate["engine.orderCreation.createOrder"]
  OrderCreate --> Orders["orders + order_items"]
  OrderCreate --> StripePI["Stripe PaymentIntent<br/>metadata: order_id, order_number, customer_id, storefront_id"]
  StripePI --> Authorize["engine.orderCreation.authorizePayment"]
  Authorize --> CartClear["clearCart"]
  CartClear --> ClientSecret["Return clientSecret + orderId + total breakdown"]

  StripePI -. async .-> StripeWebhook["POST /api/webhooks/stripe<br/>apps/web/src/app/api/webhooks/stripe/route.ts"]
  StripeWebhook --> Signature["Verify Stripe signature"]
  Signature --> WebhookIdem["stripe webhook idempotency<br/>claimStripeWebhookEventForProcessing"]

  WebhookIdem --> PaymentSucceeded{"payment_intent.succeeded?"}
  PaymentSucceeded -->|yes| KitchenSubmit["engine.orderCreation.submitToKitchen"]
  KitchenSubmit --> PaymentEvent["Emit payment.confirmed"]
  PaymentEvent --> AuditLog["engine.audit.log"]
  AuditLog --> FinanceWebhook["handleStripeFinanceWebhook"]

  WebhookIdem --> PaymentFailed{"payment_intent.payment_failed?"}
  PaymentFailed -->|yes| PaymentFailure["engine.platform.handlePaymentFailure"]
  PaymentFailure --> FinanceWebhook

  WebhookIdem --> RefundEvent{"charge.refunded?"}
  RefundEvent -->|yes| ExternalRefund["engine.platform.handleExternalRefund"]
  ExternalRefund --> FinanceWebhook

  FinanceWebhook --> Ledger["LedgerService<br/>ledger_entries"]
  Ledger --> Capture["customer_charge_capture + tax_collected"]
  Ledger --> Split["chef_payable + driver_payable + platform_fee + tip_payable"]
  Ledger --> RefundReverse["refund reversal entries"]

  Split --> PlatformAccounts["platform_accounts balances"]
  PlatformAccounts --> PayoutPreview["PayoutService preview<br/>chef/driver payables"]
  PayoutPreview --> PayoutRun["payout_runs"]
  PayoutRun --> PayoutRisk["payout-risk.service validation"]
  PayoutRisk --> PayoutLedger["recordPayout negative payable ledger entry"]
  PayoutLedger --> PayoutRows["chef_payouts / driver_payouts / instant_payout_requests"]

  FinanceWebhook --> Reconciliation["ReconciliationService / ops finance APIs"]
```

## Money Movement Schematic

```mermaid
flowchart LR
  CustomerMoney["Customer card payment"] --> Stripe["Stripe PaymentIntent"]
  Stripe --> Ridendine["Ridendine merchant balance"]

  Ridendine --> Capture["Ledger: customer_charge_capture"]
  Ridendine --> Tax["Ledger: tax_collected"]
  Ridendine --> PlatformFee["Ledger: platform_fee"]
  Ridendine --> ChefPayable["Ledger: chef_payable"]
  Ridendine --> DriverPayable["Ledger: driver_payable"]
  Ridendine --> TipPayable["Ledger: tip_payable"]

  ChefPayable --> ChefAccount["platform_accounts: chef_payable"]
  DriverPayable --> DriverAccount["platform_accounts: driver_payable"]
  TipPayable --> DriverAccount
  PlatformFee --> PlatformRevenue["platform revenue account"]

  ChefAccount --> ChefPayoutRun["chef payout run"]
  DriverAccount --> DriverPayoutRun["driver payout run / instant payout"]

  ChefPayoutRun --> ChefPayoutDebit["Ledger: negative chef_payable"]
  DriverPayoutRun --> DriverPayoutDebit["Ledger: negative driver_payable"]

  ChefPayoutDebit --> ChefBank["chef_payouts"]
  DriverPayoutDebit --> DriverBank["driver_payouts"]

  Stripe --> Refund["Stripe refund event"]
  Refund --> RefundLedger["Ledger: negative payable / platform reversals"]
  RefundLedger --> Reconciliation["reconciliation status"]
```

## Key Repo Evidence

| Area | Evidence |
| --- | --- |
| Checkout + PaymentIntent creation | `apps/web/src/app/api/checkout/route.ts` |
| Stripe webhook verification + processing | `apps/web/src/app/api/webhooks/stripe/route.ts` |
| Ledger entries and idempotency keys | `packages/engine/src/services/ledger.service.ts` |
| Payout preview/execution/instant payout | `packages/engine/src/services/payout.service.ts` |
| Engine exports for Stripe, ledger, payout, reconciliation | `packages/engine/src/index.ts` |

## Production Safety Notes

- The checkout route validates customer auth, request schema, menu item availability/pricing, risk, kitchen readiness, and checkout idempotency before creating the Stripe PaymentIntent.
- The Stripe webhook route verifies the Stripe signature, claims webhook events idempotently, then routes success/failure/refund/payout events into order, audit, and finance handlers.
- Ledger entries are designed to be idempotent through `idempotency_key` and should be the mandatory source for payables, payout debits, refund reversals, and reconciliation.
- Before production money movement, every payout/refund/reconciliation path still needs finance-grade negative tests, RBAC tests, and replay/idempotency tests.
