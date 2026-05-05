# 22 - Payment, Order, and Dispatch Lifecycle

**Audit Date**: 2026-04-23
**Scope**: Complete order lifecycle from cart to delivery, including payment and refund flows
**Status Legend**: WORKING / PARTIAL / UNWIRED / BROKEN

---

## Overview

The Ridendine order lifecycle spans 4 apps, multiple engine orchestrators, Stripe, and Supabase. This document maps every step, identifies what code handles it, and notes its current implementation status.

---

## Step 1 - Customer Browses and Builds Cart

**App**: `apps/web`
**Status**: WORKING

| Sub-step | Implementation | Status |
|----------|---------------|--------|
| Browse storefront list | `GET /api/storefronts` → repository query | WORKING |
| View chef profile/menu | `GET /api/storefronts/[id]` → repository query | WORKING |
| Add item to cart | `CartContext` (React context, localStorage) | WORKING |
| Update cart quantities | `CartContext` dispatch actions | WORKING |
| Remove from cart | `CartContext` dispatch actions | WORKING |
| View cart drawer/page | `CartDrawer` component | WORKING |

**Notes**: Cart state is client-side only (React Context + localStorage). There is no server-side cart persistence - items are lost if customer clears browser storage.

---

## Step 2 - Checkout and Payment Intent Creation

**App**: `apps/web`
**Engine**: `commerce.orchestrator.ts`
**Status**: WORKING

| Sub-step | Code | Status |
|----------|------|--------|
| Navigate to checkout page | `apps/web/src/app/checkout/page.tsx` | WORKING |
| Customer enters delivery address | Form component with address fields | PARTIAL - no geocoding validation |
| Apply promo code | `POST /api/promo/validate` | PARTIAL - code validation exists, DB lookup may be incomplete |
| Calculate order totals | `engine.commerce.calculateTotals()` | WORKING |
| Create Stripe PaymentIntent | `stripe.paymentIntents.create()` | WORKING |
| Return clientSecret to frontend | API response | WORKING |

**Fee Calculation** (hardcoded constants in engine):
```
Subtotal = sum(item.price * quantity)
Service fee = subtotal * 0.08        (8%)
Tax (HST) = (subtotal + service_fee) * 0.13   (13%)
Delivery fee = $5.00 base
Promo discount = promo_code.discount_amount (if valid)
Total = subtotal + service_fee + tax + delivery_fee - promo_discount
```

**Risk**: Fee percentages are hardcoded. See Risk R13.

---

## Step 3 - Frontend Payment Confirmation

**App**: `apps/web`
**Status**: WORKING

| Sub-step | Code | Status |
|----------|------|--------|
| Render Stripe Elements | `@stripe/react-stripe-js` | WORKING |
| Customer enters card details | Stripe-hosted iframe | WORKING |
| Call `stripe.confirmPayment()` | Frontend Stripe.js call | WORKING |
| Stripe redirects on success | `return_url` parameter | WORKING |
| Clear cart on success | `CartContext.clearCart()` | WORKING |

**Notes**: Payment confirmation is handled entirely by Stripe.js on the frontend. No sensitive card data touches Ridendine servers.

---

## Step 4 - Stripe Webhook Processing

**App**: `apps/web`
**Engine**: `orders.orchestrator.ts`, `commerce.orchestrator.ts`
**Status**: PARTIAL

| Sub-step | Code | Status |
|----------|------|--------|
| Receive `payment_intent.succeeded` event | `POST /api/webhooks/stripe` | WORKING |
| Validate webhook signature | `stripe.webhooks.constructEvent()` | WORKING |
| Look up order by PaymentIntent ID | Repository query | WORKING |
| Call `engine.orders.submitToKitchen()` | Orchestrator call | WORKING |
| Emit `payment.confirmed` domain event | Engine event bus | PARTIAL - event emitted but no consumers confirmed |
| Idempotency check | Check if event already processed | MISSING |

**Risk**: No idempotency guard. Stripe retries webhooks on timeout. A second `payment_intent.succeeded` event could create a duplicate order submission.

**Action**: Add idempotency key check:
```typescript
const alreadyProcessed = await db.webhookEvents.findByStripeEventId(event.id)
if (alreadyProcessed) return new Response('OK', { status: 200 }) // Ignore duplicate
await db.webhookEvents.create({ stripeEventId: event.id, processedAt: new Date() })
```

---

## Step 5 - Chef Receives and Processes Order

**App**: `apps/chef-admin`
**Engine**: `orders.orchestrator.ts`
**Status**: PARTIAL

| Sub-step | Code | Status |
|----------|------|--------|
| Order appears in chef dashboard | `GET /api/orders?status=pending` | WORKING |
| Real-time notification of new order | Supabase subscription on `orders` | PARTIAL - subscription may not be wired |
| Chef accepts order | `POST /api/orders/[id]/accept` → `engine.orders.acceptOrder()` | WORKING |
| Auto-reject timeout (8 minutes) | Background job / edge function | UNWIRED - timeout logic exists in engine but no scheduler |
| Chef rejects order | `POST /api/orders/[id]/reject` → `engine.orders.rejectOrder()` | WORKING |
| Chef starts preparing | `POST /api/orders/[id]/start-preparing` → `engine.orders.startPreparing()` | WORKING |
| Chef marks order ready | `POST /api/orders/[id]/ready` → `engine.orders.markOrderReady()` | WORKING |

**For each status change, the engine**:
1. Updates `orders.status` and `orders.engine_status`
2. Inserts row into `order_status_history`
3. Emits domain event (e.g., `order.accepted`, `order.ready`)

**Notification gap**: When order status changes, customer should receive email/push notification. Currently UNWIRED - see R10.

**Auto-reject gap**: If chef does not respond within 8 minutes, order should auto-reject. There is no cron job, Supabase edge function, or background worker implementing this timeout.

---

## Step 6 - Order Status History

**Engine**: All orchestrators
**Status**: WORKING (for implemented steps)

Every order status transition inserts a row:
```sql
INSERT INTO order_status_history (order_id, status, engine_status, notes, created_by, created_at)
VALUES ($1, $2, $3, $4, $5, NOW())
```

This provides a complete audit trail of order lifecycle events.

---

## Step 7 - Dispatch Engine Finds Driver

**Engine**: `dispatch.orchestrator.ts`
**Status**: PARTIAL

| Sub-step | Code | Status |
|----------|------|--------|
| Triggered when order marked ready | `engine.dispatch.initiateDispatch(orderId)` | WORKING |
| Query available drivers near pickup | `findNearbyDrivers(lat, lng, radiusKm)` | PARTIAL - location query exists but uses hardcoded coordinates in driver-app |
| Rank drivers by distance/rating | Scoring algorithm in dispatch engine | WORKING |
| Create `assignment_attempts` record | Repository insert | WORKING |
| Send offer to top driver | Notification to driver | UNWIRED - notification sending not implemented |
| 30-second acceptance timeout | Timer logic | UNWIRED - no timer/scheduler |
| Try next driver if declined/timeout | Retry logic in dispatch engine | PARTIAL - logic exists but relies on timer |

**Location gap**: Driver-app has a hardcoded location for testing. Real GPS coordinates from driver's device are not being sent to the server. This means `findNearbyDrivers()` may always return the same drivers regardless of actual proximity.

---

## Step 8 - Driver Accepts and Completes Delivery

**App**: `apps/driver-app`
**Engine**: `dispatch.orchestrator.ts`, `driver.orchestrator.ts`
**Status**: PARTIAL

| Sub-step | Code | Status |
|----------|------|--------|
| Driver receives delivery offer | Push notification | UNWIRED |
| Driver sees offer in app | Offer screen in driver-app | WORKING |
| Driver accepts offer | `POST /api/deliveries/[id]/accept` | WORKING |
| Driver status: `assigned` | Status update | WORKING |
| Driver navigates to pickup | Map/navigation (Google Maps) | PARTIAL - map displayed but navigation integration incomplete |
| Driver status: `en_route_to_pickup` | `POST /api/deliveries/[id]/en-route-pickup` | WORKING |
| Driver arrives at pickup | `POST /api/deliveries/[id]/arrived-pickup` | WORKING |
| Driver picks up order | `POST /api/deliveries/[id]/picked-up` | WORKING |
| Driver status: `picked_up` | Status update | WORKING |
| Driver navigates to customer | Map/navigation | PARTIAL |
| Driver status: `en_route_to_dropoff` | `POST /api/deliveries/[id]/en-route-dropoff` | WORKING |
| Driver arrives at customer | `POST /api/deliveries/[id]/arrived-dropoff` | WORKING |
| Driver marks delivered | `POST /api/deliveries/[id]/delivered` | WORKING |
| Driver status: `delivered` | Status update → triggers platform completion | WORKING |

---

## Step 9 - Order Completion and Ledger Entries

**Engine**: `platform.orchestrator.ts`
**Status**: PARTIAL

| Sub-step | Code | Status |
|----------|------|--------|
| `delivery.delivered` event triggers completion | Event handler | PARTIAL |
| `engine.platform.completeDeliveredOrder()` | Orchestrator call | WORKING |
| Order status → `completed` | DB update | WORKING |
| Create ledger entries | `ledger_entries` table insert | WORKING |
| Ledger: chef earnings | `chef_payout = subtotal * (1 - platform_fee)` | WORKING |
| Ledger: driver earnings | `driver_payout = delivery_fee + tip` | WORKING |
| Ledger: platform revenue | `platform_revenue = service_fee` | WORKING |
| Mark chef payout as pending | `chef_payouts` record | PARTIAL |
| Notify customer order delivered | Email/push notification | UNWIRED |
| Prompt customer for review | Email with review link | UNWIRED |

---

## Step 10 - Customer Review

**App**: `apps/web`
**Status**: PARTIAL

| Sub-step | Code | Status |
|----------|------|--------|
| Customer receives review prompt | Email notification | UNWIRED |
| Customer navigates to review form | `apps/web/src/app/orders/[id]/review` | PARTIAL |
| Customer submits star rating + comment | `POST /api/reviews` | PARTIAL |
| Review saved to `reviews` table | Repository | WORKING |
| Chef rating recalculated | Aggregate query or trigger | PARTIAL |
| `NEXT_PUBLIC_ENABLE_REVIEWS` feature flag | Controls UI visibility | WORKING |

---

## Refund Flow

**App**: `apps/ops-admin`
**Engine**: `commerce.orchestrator.ts`
**Status**: BROKEN (mock IDs)

| Sub-step | Code | Status |
|----------|------|--------|
| Customer contacts support | Support ticket form | WORKING |
| Ops agent creates refund case | `POST /api/refunds` | WORKING |
| Ops agent reviews case details | Refund review page | WORKING |
| Ops agent approves refund | `POST /api/refunds/[id]/approve` | WORKING |
| Ops agent processes refund | `POST /api/refunds/[id]/process` | BROKEN |
| Stripe `refunds.create()` called | Real API call | MISSING |
| Mock refund ID stored in DB | `"mock_refund_id_..."` stored | BROKEN |
| Customer notified of refund | Email | UNWIRED |
| Ledger entry for refund | Reversal ledger entry | PARTIAL |

**Critical**: Real money is NOT being refunded. The ops-admin marks refunds as processed with a mock Stripe ID. See Risk R3.

---

## Lifecycle Summary Table

| Step | Working | Partial | Unwired/Broken |
|------|---------|---------|---------------|
| 1. Cart management | Yes | No GPS | - |
| 2. Checkout + totals | Yes | No geocoding | - |
| 3. Stripe payment confirm | Yes | - | - |
| 4. Webhook processing | Yes | - | No idempotency |
| 5. Chef order processing | Yes | - | No auto-reject timeout, no real-time notification |
| 6. Order history | Yes | - | - |
| 7. Dispatch - find driver | Scoring | - | No real GPS, no notification, no timeout |
| 8. Driver delivery flow | Status updates | Navigation | No push notifications |
| 9. Order completion + ledger | Yes | - | No customer notification |
| 10. Customer review | - | Form | No review prompt |
| 11. Refund flow | Ops UI | - | BROKEN - mock Stripe IDs |

**Overall lifecycle completeness**: ~60% of the critical path is working. The happy path (browse → pay → chef accepts → mark ready → driver delivers → ledger) works end-to-end. Notifications, driver GPS, auto-timeouts, and refunds are the main gaps.

---

## Related Files

- `18-risk-register.md` - R3 (mock refunds), R10 (no notifications)
- `19-priority-fix-roadmap.md` - Items 3, 6, 8, 9 address lifecycle gaps
- `23-user-role-journey-map.md` - Role-by-role journey view of same lifecycle
