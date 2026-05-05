# Data Flow Master Map

> End-to-end data flows for all core workflows in the platform.

## 1. Authentication Flow

### Customer Sign-Up
```
User fills form → POST /api/auth/signup
  → signupSchema.parse(body)
  → supabase.auth.signUp({email, password})
  → createCustomer(supabase, {user_id, first_name, last_name, email, phone})
  → Response: {user, customer}
  → Redirect to /chefs
```

### Customer Login
```
User fills form → POST /api/auth/login
  → loginSchema.parse(body)
  → supabase.auth.signInWithPassword({email, password})
  → getCustomerByUserId(supabase, user.id)
  → Response: {user, customer, session}
  → Redirect to /chefs (or ?redirect= param)
```

### Chef Sign-Up
```
User fills form → POST /api/auth/signup (chef-admin)
  → signupSchema.parse(body)
  → supabase.auth.signUp({email, password})
  → createChefProfile(adminClient, {user_id, first_name, last_name, phone, status: 'pending'})
  → Response: {user, requiresEmailConfirmation}
  → Chef must be approved by ops before storefront is visible
```

### Driver Login
```
User fills form → POST /api/auth/login (driver-app)
  → supabase.auth.signInWithPassword({email, password})
  → getDriverByUserId(supabase, user.id)
  → CHECK: driver.status === 'approved'
  → If not approved: signOut() + 403 error
  → If approved: Response: {user, driver}
```

### Session Management
```
All apps: Middleware checks Supabase SSR session on every request
  → Protected routes: redirect to /auth/login if no session
  → Auth routes: redirect to dashboard if already logged in
  → Dev bypass: BYPASS_AUTH=true skips auth checks
```

---

## 2. Browse & Discovery Flow

```
Customer visits /chefs
  → Server: getActiveStorefronts(supabase, {limit: 20})
    → SELECT chef_storefronts WHERE is_active=true + chef_profiles
  → Renders ChefsList grid (3-col)
  → ChefsFilters sidebar (NON-FUNCTIONAL - filters don't connect to query)

Customer clicks chef card → /chefs/[slug]
  → Server: getStorefrontBySlug(supabase, slug)
    → SELECT chef_storefronts WHERE slug=? + chef_profiles
  → Server: getMenuItemsByStorefront(supabase, storefrontId)
    → SELECT menu_items WHERE storefront_id=? AND is_available=true + menu_categories
  → Renders StorefrontHeader + StorefrontMenu
```

**Data source of truth**: `chef_storefronts.is_active` controls visibility.
**Gap**: Chef filters (cuisine, rating) render but don't actually filter results.

---

## 3. Cart Flow

```
Customer clicks "Add" on menu item
  → useCart().addToCart(storefrontId, menuItemId, quantity)
    → POST /api/cart {storefrontId, menuItemId, quantity, specialInstructions}
      → addToCartSchema.parse(body)
      → getCurrentCustomer(supabase)
      → getCartByCustomer() → createCart() if missing
      → Fetch menu_items for price validation
      → addCartItem(supabase, {cart_id, menu_item_id, quantity, unit_price})
    → Cart context refetches: GET /api/cart?storefrontId=
      → getCartWithItems(supabase, customerId, storefrontId)
    → UI updates: item count badge, cart sidebar

Customer modifies quantity
  → useCart().updateQuantity(itemId, newQty)
    → PATCH /api/cart?itemId= {quantity}
    → updateCartItem(supabase, itemId, {quantity})
    → Refetch

Customer removes item
  → useCart().removeItem(itemId)
    → DELETE /api/cart?itemId=
    → deleteCartItem(supabase, itemId)
    → Refetch
```

**State**: `CartContext` holds cart in React state, synced with DB via API.
**Constraint**: One cart per customer per storefront (DB UNIQUE constraint).

---

## 4. Checkout & Payment Flow

```
Step 1: Customer on /checkout
  → GET /api/cart?storefrontId= (load cart)
  → GET /api/addresses (load saved addresses)
  → Customer selects: address, tip (0/10/15/20% or custom), promo code

Step 2: Submit order details
  → POST /api/checkout
    → getCustomerActorContext() → actor context
    → Validate required fields
    → Promo code validation:
      → SELECT promo_codes WHERE code=? AND is_active=true
      → Check: valid_from, valid_until, max_uses
      → Calculate discount (percentage or fixed)
      → increment_promo_usage RPC
    → Transform cart items → engine format
    → engine.orders.createOrder({customerId, storefrontId, deliveryAddressId, items, tip, promoCode}, actor)
      → Creates order record (status: pending)
      → Creates order_items
      → Starts SLA timer
      → Emits order.created event
    → Stripe: stripe.paymentIntents.create({amount_cents, currency: 'cad', metadata: {order_id, order_number}})
    → engine.orders.authorizePayment(order.id, paymentIntent.id, actor)
    → clearCart(adminClient, cart.id)
    → Response: {clientSecret, orderId, orderNumber, breakdown}

Step 3: Stripe payment
  → Client: stripe.confirmPayment({elements, confirmParams})
  → Stripe processes payment
  → Webhook: POST /api/webhooks/stripe
    → payment_intent.succeeded:
      → engine.orders.submitToKitchen(orderId, systemActor)
        → Updates order status: pending → accepted (auto)
        → Emits payment.confirmed event
    → payment_intent.payment_failed:
      → engine.platform.handlePaymentFailure(...)
    → charge.refunded:
      → engine.platform.handleExternalRefund(...)

Step 4: Redirect to /order-confirmation/[orderId]
```

**Pricing calculations** (all in dollars, Stripe in cents):
- Delivery fee: $5.00 flat
- Service fee: 8% of subtotal
- Tax (HST): 13% of (subtotal + service fee)
- Total = subtotal + delivery + service + tax + tip - discount

---

## 5. Order Lifecycle (Chef Side)

```
New order arrives (via payment webhook → submitToKitchen)
  → chef-admin OrdersList: Supabase realtime subscription on 'orders' table
  → Audio alert: /sounds/new-order.mp3
  → Countdown timer: 8-minute accept window

Chef accepts order:
  → PATCH /api/orders/[id] {action: 'accept', estimatedPrepMinutes}
  → engine.orders.acceptOrder(orderId, estimatedPrepMinutes, actor)
    → Updates order: status=accepted, estimated_prep_minutes
    → Creates kitchen_queue_entries
    → Emits order.accepted event

Chef starts preparing:
  → PATCH /api/orders/[id] {action: 'start_preparing'}
  → engine.orders.startPreparing(orderId, actor)
    → Updates order: status=preparing, prep_started_at=now

Chef marks ready:
  → PATCH /api/orders/[id] {action: 'mark_ready'}
  → engine.platform.markOrderReady(orderId, actor)
    → Updates order: status=ready_for_pickup, ready_at=now
    → AUTO-TRIGGERS: engine.dispatch.requestDispatch(orderId)
      → Creates delivery record
      → Begins driver matching
      → Emits delivery.requested event

Chef rejects order:
  → PATCH /api/orders/[id] {action: 'reject', reason, notes}
  → engine.orders.rejectOrder(orderId, reason, notes, actor)
    → Updates order: status=rejected, rejection_reason, rejection_notes
```

---

## 6. Dispatch & Delivery Flow

```
Delivery created (auto from markOrderReady):
  → engine.dispatch.requestDispatch(orderId)
    → Creates delivery record with pickup/dropoff from order + storefront
    → Calls autoAssignDriver(deliveryId)
      → get_available_drivers_near(lat, lng, radius) RPC
      → calculateDriverAssignmentScore(driver) for each
      → offerDelivery(deliveryId, bestDriverId, expirySeconds)
        → Creates assignment_attempt (response: 'pending')
        → Emits delivery.offered event

Driver receives offer:
  → GET /api/offers → lists pending assignment_attempts
  → POST /api/offers {action: 'accept', attemptId}
    → engine.dispatch.acceptOffer(attemptId, actor)
      → Updates delivery: driver_id, status=assigned
      → Updates assignment_attempt: response=accepted
      → Emits delivery.accepted event

Driver status progression:
  → PATCH /api/deliveries/[id] {action: 'update_status', status: 'en_route_to_pickup'}
    → engine.dispatch.updateDeliveryStatus(deliveryId, status, actor)
  → en_route_to_pickup → arrived_at_pickup → picked_up → en_route_to_dropoff → arrived_at_dropoff

Driver completes delivery:
  → PATCH /api/deliveries/[id] {action: 'update_status', status: 'delivered', proofUrl, notes}
    → engine.platform.completeDeliveredOrder(deliveryId, actor, {proofUrl, notes})
      → Updates delivery: status=delivered
      → Updates order: status=completed
      → Creates ledger_entries (platform fee, chef payout, driver payout)
      → Emits delivery.completed + order.completed events

Location tracking (parallel):
  → useLocationTracker hook: navigator.geolocation.watchPosition()
  → Every 15s: POST /api/location {lat, lng, accuracy, heading, speed, deliveryId}
    → Rate limited to 5s minimum
    → Upserts driver_presence
    → Inserts driver_locations
    → If deliveryId: inserts delivery_tracking_events
    → Emits driver_location_updated event
```

---

## 7. Ops Intervention Flows

### Manual Delivery Assignment
```
Ops views dispatch command center → /dashboard/deliveries
  → Server: engine.ops.getDispatchCommandCenter()
  → Sees pending/stale deliveries
  → Clicks delivery → /dashboard/deliveries/[id]
    → engine.ops.getDeliveryInterventionDetail(id)
  → DeliveryActions modal: select driver
    → POST /api/engine/dispatch {action: 'manual_assign', deliveryId, driverId}
      → engine.dispatch.manualAssign(deliveryId, driverId, actor)
```

### Chef/Driver Governance
```
Ops views /dashboard/chefs/[id]
  → ChefGovernanceActions: approve/reject/suspend/unsuspend
    → PATCH /api/chefs/[id] {action}
      → engine.platform.updateChefGovernance(id, status, actor, reason)

Ops publishes/unpublishes storefront
  → StorefrontGovernanceActions: publish/unpublish
    → PATCH /api/engine/storefronts/[id] {action: 'publish'}
      → updateStorefront(client, id, {is_active: true/false})
```

### Refund Processing
```
Ops views /dashboard/finance
  → engine.ops.getFinanceOperations(actor, dateRange)
  → FinanceActions: approve/deny refund
    → POST /api/engine/finance {action: 'approve_refund', caseId}
      → engine.commerce.approveRefund(caseId, actor)
    → POST /api/engine/finance {action: 'process_refund', caseId}
      → Stripe refund + ledger entries + payout adjustments
```

---

## 8. Real-Time Data Flows

| Source | Mechanism | Consumer | Purpose |
|--------|-----------|----------|---------|
| Order status changes | Supabase Realtime (postgres_changes on orders) | chef-admin OrdersList, web order-confirmation | Live order updates |
| Notifications | Supabase Realtime (postgres_changes on notifications INSERT) | web NotificationBell | Real-time notification delivery |
| Driver location | `engine.events.emit()` → Supabase Realtime broadcast | web OrderTrackingMap (via driver_presence polling every 15s) | Live delivery tracking |
| Domain events | `DomainEventEmitter.flush()` → domain_events table + Supabase broadcast | Engine consumers | Event sourcing |

**Note**: Real-time for order tracking on the customer side uses **polling** (15s interval on driver_presence), not true push via Supabase Realtime channels. The engine emits events but the web app polls rather than subscribing.

---

## Flow → Table Matrix

| Flow | Tables Written | Tables Read |
|------|---------------|-------------|
| Customer signup | auth.users, customers | — |
| Chef signup | auth.users, chef_profiles | — |
| Browse chefs | — | chef_storefronts, chef_profiles |
| Add to cart | carts, cart_items | menu_items |
| Checkout | orders, order_items, promo_codes | carts, cart_items, customer_addresses, menu_items |
| Stripe webhook | orders (status) | orders |
| Chef accepts | orders, kitchen_queue_entries, order_status_history | orders |
| Mark ready | orders, deliveries | orders, chef_storefronts, chef_kitchens |
| Driver dispatch | deliveries, assignment_attempts | drivers, driver_presence |
| Driver location | driver_presence, driver_locations, delivery_tracking_events | deliveries |
| Complete delivery | deliveries, orders, ledger_entries | deliveries, orders |
| Refund | refund_cases, ledger_entries, payout_adjustments | orders, refund_cases |
| Ops dashboard | — | orders, deliveries, drivers, order_exceptions, sla_timers, system_alerts |
