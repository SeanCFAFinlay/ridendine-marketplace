# Order status flow (documentation vs engine)

Align with [docs/ORDER_FLOW.md](file:///c:/Users/sean/RIDENDINEV1/docs/ORDER_FLOW.md) and DB enums in [docs/DATABASE_SCHEMA.md](file:///c:/Users/sean/RIDENDINEV1/docs/DATABASE_SCHEMA.md). **PARTIAL:** narrative mixes order and delivery labels; verify against [packages/engine/src/orchestrators/order-state-machine.ts](file:///c:/Users/sean/RIDENDINEV1/packages/engine/src/orchestrators/order-state-machine.ts) during implementation.

```mermaid
flowchart TD
  subgraph customer [Customer_web]
    browse[Browse_storefronts]
    cart[Cart_checkout]
  end
  subgraph pay [Payment]
    pi[Stripe_PaymentIntent]
    wh[Webhook_payment_intent_succeeded]
  end
  subgraph kitchen [Chef_kitchen]
    pending[pending]
    accepted[accepted]
    preparing[preparing]
    ready[ready]
  end
  subgraph delivery [Driver_delivery]
    assigned[driver_assigned_flow]
    pickup[picked_up]
    drop[delivered]
    completed[completed]
  end
  browse --> cart
  cart --> pi
  pi --> wh
  wh --> pending
  pending --> accepted
  accepted --> preparing
  preparing --> ready
  ready --> assigned
  assigned --> pickup
  pickup --> drop
  drop --> completed
```
