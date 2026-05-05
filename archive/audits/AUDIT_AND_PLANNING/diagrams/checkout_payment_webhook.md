# Checkout and Stripe webhook

Files: [apps/web/src/app/checkout/page.tsx](file:///c:/Users/sean/RIDENDINEV1/apps/web/src/app/checkout/page.tsx), [apps/web/src/app/api/checkout/route.ts](file:///c:/Users/sean/RIDENDINEV1/apps/web/src/app/api/checkout/route.ts), [apps/web/src/app/api/webhooks/stripe/route.ts](file:///c:/Users/sean/RIDENDINEV1/apps/web/src/app/api/webhooks/stripe/route.ts).

```mermaid
sequenceDiagram
  participant UI as checkout_page
  participant API as api_checkout
  participant DB as Supabase_admin
  participant ST as Stripe
  participant WH as webhooks_stripe
  participant EN as CentralEngine
  UI->>API: POST_JSON
  API->>DB: cart_and_order_writes
  API->>ST: PaymentIntent
  ST-->>API: client_secret
  API-->>UI: clientSecret
  UI->>ST: confirm_payment
  ST->>WH: payment_intent_succeeded
  WH->>WH: signature_verify
  WH->>EN: submitToKitchen
  WH->>EN: emit_and_audit
```
