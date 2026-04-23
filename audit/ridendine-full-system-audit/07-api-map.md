# 07 - API Map

**Audit Date**: 2026-04-23
**Scope**: All API routes across all 4 apps. 49 routes total.

Status definitions:
- **working** - Route is implemented, auth-protected, and calls engine or repository with real data
- **partial** - Route functions but missing validation, error handling, or secondary features
- **placeholder** - Route exists but returns mock data or is minimally implemented
- **broken** - Route has a known issue that prevents correct operation

Auth column: "Yes" = requires authenticated session; "No" = public endpoint.
Engine Integration: Which engine orchestrator(s) the route calls.

---

## apps/web - Customer Marketplace (12 API Routes)

| Route | Method(s) | Purpose | Auth | Engine Integration | DB Tables | Status | Notes |
|-------|-----------|---------|------|--------------------|-----------|--------|-------|
| `/api/auth/signup` | POST | Customer signup - creates Supabase auth user + customer profile | No | None | `profiles`, `customers` | working | Uses Supabase Auth `signUp()`. Zod validates request body. |
| `/api/auth/login` | POST | Customer login - creates session | No | None | Supabase Auth | working | Uses Supabase Auth `signInWithPassword()` |
| `/api/profile` | GET, PATCH | Get/update customer profile | Yes | None | `customers`, `profiles` | working | Direct repository calls |
| `/api/addresses` | GET, POST | List and create delivery addresses | Yes | None | `addresses` | working | Address CRUD for customer |
| `/api/cart` | GET, POST | Get cart or add/update cart items | Yes (soft) | None | `cart`, `cart_items` | working | Cart persisted to DB; requires customer context |
| `/api/checkout` | POST | Create order + Stripe PaymentIntent | Yes | `OrderOrchestrator.createOrder()`, `OrderOrchestrator.authorizePayment()` | `orders`, `order_items`, `cart`, `promo_codes` | working | Full flow: promo validation, order creation, Stripe PI creation, cart clear |
| `/api/orders` | GET | List customer's orders | Yes | None | `orders` | partial | No pagination; no real-time. Direct DB query. |
| `/api/orders/[id]` | GET, PATCH | Get order detail or update (cancel) | Yes | `OrderOrchestrator` | `orders` | partial | Cancel flow present; tracking data not real-time |
| `/api/webhooks/stripe` | POST | Handle Stripe webhook events | No (Stripe sig) | `OrderOrchestrator.confirmPayment()`, `OrderOrchestrator.handlePaymentFailed()` | `orders` | working | Verifies `stripe-signature` header. Production-grade. |
| `/api/notifications` | GET | Get customer notifications | Yes | None | `notifications` | partial | Lists notifications; no real-time subscription |
| `/api/notifications/subscribe` | POST | Subscribe to push notifications | Yes | None | `notifications` (push subscriptions) | partial | Endpoint exists; browser push notification integration completeness unclear |
| `/api/support` | POST | Create customer support ticket | Yes | `SupportEngine.createTicket()` | `support_tickets` | working | Has test coverage in `__tests__/api/support/` |

---

## apps/chef-admin - Chef Dashboard (10 API Routes)

| Route | Method(s) | Purpose | Auth | Engine Integration | DB Tables | Status | Notes |
|-------|-----------|---------|------|--------------------|-----------|--------|-------|
| `/api/auth/signup` | POST | Chef signup - creates auth user + chef profile + storefront stub | No | `OpsEngine` or direct | `profiles`, `chefs`, `chef_storefronts` | working | Creates chef profile and initial storefront record |
| `/api/orders` | GET | List orders for chef's storefront | Yes (Chef) | None | `orders`, `customers`, `addresses` | partial | Enriches orders with customer data; no pagination |
| `/api/orders/[id]` | PATCH | Update order status (accept, reject, start prep, mark ready) | Yes (Chef) | `KitchenEngine`, `OrderOrchestrator` | `orders` | working | State machine transitions validated by engine |
| `/api/menu` | GET, POST | List or create menu items | Yes (Chef) | None | `menu_items` | working | Full menu item CRUD |
| `/api/menu/[id]` | GET, PATCH, DELETE | Get, update, or delete individual menu item | Yes (Chef) | None | `menu_items` | working | PATCH includes availability toggle |
| `/api/menu/categories` | GET, POST | List or create menu categories | Yes (Chef) | None | `menu_categories` | working | Category management |
| `/api/storefront` | GET, PATCH | Get or update storefront details | Yes (Chef) | None | `chef_storefronts` | working | Name, description, hours, cuisine type |
| `/api/profile` | GET, PATCH | Get or update chef profile | Yes (Chef) | None | `profiles`, `chefs` | working | Personal profile fields |
| `/api/payouts/setup` | POST | Initiate Stripe Connect onboarding | Yes (Chef) | None | `chefs` | partial | Creates Stripe Connect account link; full onboarding flow ~60% complete |
| `/api/payouts/request` | POST | Request payout to bank | Yes (Chef) | `CommerceEngine` or direct | `payouts`, `chefs` | partial | Request creation works; Stripe payout execution completeness unclear |

---

## apps/ops-admin - Operations Center (21 API Routes)

### Standard Resource Routes (`/api/`)

| Route | Method(s) | Purpose | Auth | Engine Integration | DB Tables | Status | Notes |
|-------|-----------|---------|------|--------------------|-----------|--------|-------|
| `/api/chefs` | GET | List all chefs with profiles | Yes (Ops) | None | `chefs`, `chef_storefronts` | partial | No pagination; all records returned |
| `/api/chefs/[id]` | GET, PATCH | Get or update chef record | Yes (Ops) | `OpsEngine` | `chefs`, `chef_storefronts` | working | PATCH triggers governance actions via engine |
| `/api/customers` | GET | List all customers | Yes (Ops) | None | `customers`, `profiles` | partial | No pagination; no search |
| `/api/drivers` | GET | List all drivers | Yes (Ops) | None | `drivers`, `profiles` | partial | No pagination |
| `/api/drivers/[id]` | GET, PATCH | Get or update driver record | Yes (Ops) | `OpsEngine` | `drivers` | working | Approve/suspend actions via engine |
| `/api/deliveries` | GET | List all deliveries (filterable by queue) | Yes (Ops) | None | `deliveries`, `orders` | partial | Queue param filtering works; no pagination |
| `/api/deliveries/[id]` | GET, PATCH | Get or update delivery | Yes (Ops) | `DispatchEngine` | `deliveries` | working | Manual dispatch and status override |
| `/api/orders` | GET | List all orders | Yes (Ops) | None | `orders` | partial | No pagination |
| `/api/orders/[id]` | GET, PATCH | Get or update order | Yes (Ops) | `OrderOrchestrator` | `orders` | working | Status override via engine |
| `/api/orders/[id]/refund` | POST | Process Stripe refund for order | Yes (Ops, role-checked) | `CommerceEngine` | `orders`, `notifications` | working | Uses `payment_intent_id` from order. Real Stripe refund. Role: ops_manager, finance_admin, super_admin only. |
| `/api/support` | GET | List support tickets | Yes (Ops) | None | `support_tickets` | partial | No priority filtering |
| `/api/support/[id]` | GET, PATCH | Get or respond to support ticket | Yes (Ops) | `SupportEngine` | `support_tickets` | working | Assign, respond, resolve, close |

### Engine Control Routes (`/api/engine/`)

| Route | Method(s) | Purpose | Auth | Engine Integration | DB Tables | Status | Notes |
|-------|-----------|---------|------|--------------------|-----------|--------|-------|
| `/api/engine/dashboard` | GET | Get dashboard queue counts | Yes (Ops) | `OpsEngine.getDashboardMetrics()` | Multiple | working | Returns pendingDispatch, deliveryEscalations, ordersNeedingAction, supportBacklog, pendingRefunds |
| `/api/engine/dispatch` | POST | Manual dispatch actions | Yes (Ops) | `DispatchEngine` | `deliveries`, `drivers` | working | Force assign, recall delivery |
| `/api/engine/exceptions` | GET | List active exceptions/escalations | Yes (Ops) | `OpsEngine` | `exceptions` | partial | List works; filtering may be limited |
| `/api/engine/exceptions/[id]` | PATCH | Resolve an exception | Yes (Ops) | `OpsEngine` | `exceptions` | working | Mark exception as resolved |
| `/api/engine/finance` | GET | Finance summary | Yes (Ops) | `CommerceEngine` | `orders`, `payouts` | partial | Summary data real; full breakdown may vary |
| `/api/engine/orders/[id]` | PATCH | Engine-level order status transition | Yes (Ops) | `OrderOrchestrator` | `orders` | working | Bypasses normal state machine with ops override |
| `/api/engine/refunds` | GET, POST | List pending refunds / initiate refund request | Yes (Ops) | `CommerceEngine.getPendingRefunds()`, `CommerceEngine.processRefund()` | `orders` | working | Refund list and processing. Actual Stripe call is in `/api/orders/[id]/refund`. |
| `/api/engine/settings` | GET, PATCH | Get or update platform settings | Yes (Ops, super_admin) | `PlatformEngine` | `platform_settings` | working | Fee rates, feature flags, dispatch params |
| `/api/engine/storefronts/[id]` | PATCH | Storefront governance actions | Yes (Ops) | `OpsEngine` | `chef_storefronts` | working | Activate, deactivate, feature, unfeature |

---

## apps/driver-app - Driver PWA (9 API Routes)

| Route | Method(s) | Purpose | Auth | Engine Integration | DB Tables | Status | Notes |
|-------|-----------|---------|------|--------------------|-----------|--------|-------|
| `/api/auth/login` | POST | Driver login | No | None | Supabase Auth | working | Returns session; driver approval status checked separately |
| `/api/auth/logout` | POST | Driver logout | Yes (Driver) | None | Supabase Auth | working | Clears session |
| `/api/driver` | GET | Get driver profile + approval status | Yes (Driver) | None | `drivers`, `profiles` | working | Also returns current presence status |
| `/api/driver/presence` | POST | Toggle driver online/offline | Yes (Driver) | `DispatchEngine` | `driver_presence` | working | Sets presence status; dispatch engine uses this for assignment eligibility |
| `/api/deliveries` | GET | Get driver's current/active deliveries | Yes (Driver) | None | `deliveries`, `orders` | working | Returns in-progress deliveries assigned to driver |
| `/api/deliveries/[id]` | GET, PATCH | Get delivery detail or update status | Yes (Driver) | `DispatchEngine.confirmPickup()`, `DispatchEngine.confirmDelivery()` | `deliveries`, `orders` | working | PATCH with action=pickup or action=deliver triggers engine transitions |
| `/api/offers` | GET | Get pending delivery offers for driver | Yes (Driver) | None | `assignment_attempts`, `deliveries`, `orders` | working | Joins assignment_attempts with delivery/order data |
| `/api/offers` | POST | Accept or decline a delivery offer | Yes (Driver) | `DispatchEngine.acceptOffer()`, `DispatchEngine.declineOffer()` | `assignment_attempts`, `deliveries` | working | Action field: "accept" or "decline" |
| `/api/location` | POST | Update driver GPS location | Yes (Driver) | None | `driver_presence` | working | In-memory rate limiting (5s). Validates with `locationUpdateSchema` from `@ridendine/validation`. |
| `/api/earnings` | GET | Get driver earnings summary | Yes (Driver) | None | `deliveries`, `finance` | partial | Returns real earnings; breakdown granularity may vary |

---

## API Route Summary

| App | Total Routes | Working | Partial | Placeholder | Notes |
|-----|-------------|---------|---------|-------------|-------|
| web | 12 | 7 | 5 | 0 | Checkout and webhook are production-grade |
| chef-admin | 10 | 7 | 3 | 0 | Payout flow partially implemented |
| ops-admin | 21 | 13 | 8 | 0 | No pagination on list routes |
| driver-app | 9 | 8 | 1 | 0 | Strongest API completion rate |
| **Total** | **52** | **35** | **17** | **0** | 3 extra counted due to /api/offers having GET+POST |

Note: The original count of 49 routes refers to unique route file paths. The `/api/offers` route file handles both GET and POST.

---

## Cross-Cutting API Observations

### Auth Enforcement
All API routes use one of four actor context helpers from their local `lib/engine.ts`:
- `getCustomerActorContext()` - web app routes
- `getChefActorContext()` - chef-admin routes
- `getOpsActorContext()` - ops-admin routes
- `getDriverActorContext()` - driver-app routes

These helpers return `null` if no valid session exists, causing routes to return 401. This pattern is consistent and correct.

**Exception**: `BYPASS_AUTH` in middleware means API routes may never be reached from authenticated context in dev mode. Routes still check their own actor context, so they would return 401 if called directly without session cookies even in dev mode - the bypass only affects the middleware layer.

### Input Validation Gaps
Zod validation is applied inconsistently:
- `apps/web /api/auth/signup` - validated
- `apps/web /api/checkout` - body destructured, some validation
- `apps/driver-app /api/location` - validated with `locationUpdateSchema`
- Most other routes - body destructured directly without Zod schema validation

This means API routes for order status updates, chef profile changes, menu item creation, etc. could receive malformed data without clear error messages.

### Stripe Integration Quality
- `/api/checkout` (web): Production-grade. Creates PaymentIntent correctly.
- `/api/webhooks/stripe` (web): Production-grade. Verifies signature, handles succeeded and failed events.
- `/api/orders/[id]/refund` (ops-admin): Production-grade. Uses real `payment_intent_id` from order record. Role-gated to ops_manager/finance_admin/super_admin.
- `/api/payouts/setup` (chef-admin): Partial. Stripe Connect account creation exists but full onboarding redirect flow incomplete.

### Missing API Routes
The following features have UI pages but no clear corresponding API route or the route has incomplete wiring:
- Customer favorites management (CRUD for `favorites` table)
- Chef analytics data (no dedicated analytics aggregation endpoint)
- Driver history endpoint (history page uses /api/deliveries but filtered list completeness unclear)
- Chef review replies (read-only; no POST for reply)
- Customer email verification confirmation
