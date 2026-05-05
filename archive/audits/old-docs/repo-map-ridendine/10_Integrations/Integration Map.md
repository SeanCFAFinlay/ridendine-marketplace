# Integration Map

> All external services and where they touch the repository.

## Integration Summary

| Service | Status | Apps | Files | Env Vars |
|---------|--------|------|-------|----------|
| **Supabase** | Fully integrated | All 4 | All client/repo files | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` |
| **Stripe Payments** | Fully integrated | web | checkout API, webhook API, checkout page | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` |
| **Stripe Connect** | Fully integrated | chef-admin | payouts/setup API, payouts/request API | `STRIPE_SECRET_KEY` (shared) |
| **Leaflet/OpenStreetMap** | Fully integrated | web, driver-app | tracking map, route map | None (free, no API key) |
| **Web Push** | Partially integrated | web | subscribe API, push_subscriptions table | None |
| **Email/SMS** | Not integrated | — | Notification templates exist only | — |
| **File Storage** | Not integrated | — | Image URL fields exist, no upload mechanism | — |
| **Analytics** | Not integrated | — | No analytics SDK | — |
| **Google Maps** | Navigation only | driver-app | DeliveryDetail opens Google Maps URL | None |

---

## Supabase (Primary Platform)

### Services Used

| Service | Usage | Status |
|---------|-------|--------|
| **Auth** | Email/password signup, session management, JWT | Fully active |
| **Database** | PostgreSQL with 36+ tables, RLS, RPC functions | Fully active |
| **Realtime** | postgres_changes subscriptions, event broadcasts | Active (web, chef-admin) |
| **Storage** | Referenced in URL fields but no upload API calls | **Not actively used** |

### Client Types

| Client | File | RLS | Usage |
|--------|------|-----|-------|
| Server | `packages/db/src/client/server.ts` | Enforced | Server components, API routes |
| Browser | `packages/db/src/client/browser.ts` | Enforced | Real-time subscriptions, client reads |
| Admin | `packages/db/src/client/admin.ts` | Bypassed | Engine operations, elevated mutations |

### Env Vars
```
NEXT_PUBLIC_SUPABASE_URL         → Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY    → Anonymous JWT (limited by RLS)
SUPABASE_SERVICE_ROLE_KEY        → Full access (server-only)
DATABASE_URL                     → Direct PostgreSQL connection
```

### Realtime Channels

| Channel | Table | Events | App | Component |
|---------|-------|--------|-----|-----------|
| orders | orders | INSERT, UPDATE | chef-admin | OrdersList |
| orders | orders | UPDATE (by id) | web | Order confirmation page |
| notifications | notifications | INSERT | web | NotificationBell |
| domain_events | — | Broadcast | Engine | DomainEventEmitter (server-side) |

---

## Stripe (Payments)

### Payment Flow (web)

**Files involved**:
- `apps/web/src/app/checkout/page.tsx` — Stripe Elements, loadStripe()
- `apps/web/src/app/api/checkout/route.ts` — PaymentIntent creation
- `apps/web/src/app/api/webhooks/stripe/route.ts` — Webhook handler

**API version**: `2026-02-25.clover`

**Payment flow**:
1. `stripe.paymentIntents.create({amount_cents, currency: 'cad', automatic_payment_methods: {enabled: true}, metadata: {order_id, order_number, customer_id, storefront_id}})`
2. Client receives `clientSecret`, renders Stripe PaymentElement
3. `stripe.confirmPayment({elements, confirmParams: {return_url: order-confirmation}})`
4. Webhook receives `payment_intent.succeeded` → submits order to kitchen

**Webhook events handled**:
| Event | Action |
|-------|--------|
| `payment_intent.succeeded` | `engine.orders.submitToKitchen()` + audit log |
| `payment_intent.payment_failed` | `engine.platform.handlePaymentFailure()` |
| `charge.refunded` | `engine.platform.handleExternalRefund()` |

### Stripe Connect (chef-admin)

**Files involved**:
- `apps/chef-admin/src/app/api/payouts/setup/route.ts` — Account creation + onboarding link
- `apps/chef-admin/src/app/api/payouts/request/route.ts` — Transfer execution

**Connect flow**:
1. Chef initiates setup → `stripe.accounts.create({type: 'express', country: 'CA', business_type: 'individual', capabilities: {card_payments, transfers}})`
2. Creates account link → `stripe.accountLinks.create({account, type: 'account_onboarding'})`
3. Chef completes Stripe onboarding externally
4. Chef requests payout → `stripe.transfers.create({amount, currency: 'cad', destination: stripe_account_id})`
5. Creates `chef_payouts` record with `stripe_transfer_id`

**Platform fee**: 15% (from engine constants)
**Stripe processing fee**: 2.9% + $0.30 (displayed to chef, not calculated in code)

### Refunds (ops-admin)

**File**: `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts`
- Uses `stripe.refunds.create({payment_intent, amount})` for partial/full refunds
- Updates order `payment_status` to 'refunded'
- Creates notification for customer

---

## Leaflet / OpenStreetMap (Maps)

### Customer Order Tracking (web)

**File**: `apps/web/src/components/tracking/order-tracking-map.tsx`
- Library: `leaflet` (dynamic import, SSR disabled)
- Tile layer: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`
- Default center: Hamilton, ON (43.2557, -79.8711)
- Driver marker: Custom 40×40 div icon (orange bg, car emoji)
- Updates: `panTo()` on driver location change
- **Trigger**: Displayed when delivery status includes 'picked_up' or driver is assigned

### Driver Route Map (driver-app)

**File**: `apps/driver-app/src/components/map/route-map.tsx`
- Library: `leaflet` + `react-leaflet` (MapContainer, TileLayer, Marker, Popup, Polyline)
- Marker icons: Leaflet color markers from CDN (green=pickup, red=dropoff, blue=driver)
- Route line: Dashed orange polyline connecting points
- **No routing API**: Straight lines between points, not actual road routes

### Google Maps (driver-app navigation)

**File**: `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx`
- Opens Google Maps for turn-by-turn navigation
- Fallback chain: `comgooglemaps://` → `maps://` → `maps.google.com`
- Not an API integration — just opens external app/URL

---

## Web Push Notifications

### Current State: **Partially integrated**

**Subscribe endpoint exists**:
- `apps/web/src/app/api/notifications/subscribe/route.ts`
- Stores `push_subscriptions` (endpoint, p256dh, auth) in DB

**Display exists**:
- `apps/web/src/components/notifications/notification-bell.tsx`
- Shows browser Notification API when permission granted
- Fetches from `notifications` table via Supabase Realtime

**Missing**:
- No server-side push notification dispatch
- No VAPID keys in env
- No service worker to receive push events
- Notifications are inserted into DB but never sent via Web Push API

---

## Email / SMS

### Current State: **Not integrated**

**Templates exist**:
- `packages/notifications/src/templates.ts` — 13+ notification templates
- `packages/notifications/src/types.ts` — `EmailNotification`, `SMSNotification`, `PushNotification` types

**Not connected to any delivery mechanism**:
- No email service (SendGrid, Resend, etc.)
- No SMS service (Twilio, etc.)
- No env vars for email/SMS services
- Templates are defined but never called from any API route or engine

---

## File Storage / Image Upload

### Current State: **Not integrated**

**Image URL fields exist in DB**:
- `chef_profiles.profile_image_url`
- `chef_storefronts.cover_image_url`, `logo_url`
- `menu_items.image_url`
- `customers.profile_image_url`
- `deliveries.pickup_photo_url`, `dropoff_photo_url`, `customer_signature_url`

**UI references**:
- Chef profile form: "Upload Photo" button (stub)
- Storefront form: Logo + cover image upload (stub)
- Driver delivery completion: Photo capture + signature canvas

**Missing**:
- No Supabase Storage bucket configuration
- No upload API routes
- No image processing/resizing
- `StorageService` exists in engine services but appears minimal

---

## Integration → Files → Env Vars → Workflows Matrix

| Integration | Files | Env Vars | Workflows |
|------------|-------|----------|-----------|
| Supabase Auth | All middleware.ts, auth-provider.tsx, use-auth.ts | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Login, signup, session management, protected routes |
| Supabase DB | All repositories, engine orchestrators | Same as auth | All CRUD operations |
| Supabase Realtime | notification-bell.tsx, orders-list.tsx, order-confirmation page, event-emitter.ts | Same as auth | Live notifications, order updates, event broadcasting |
| Stripe Payments | checkout page, checkout API, webhook API | `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Checkout, payment confirmation, refunds |
| Stripe Connect | payouts setup API, payouts request API | `STRIPE_SECRET_KEY` | Chef onboarding, payout transfers |
| Leaflet/OSM | order-tracking-map.tsx, route-map.tsx | None | Customer delivery tracking, driver route display |
| Google Maps | DeliveryDetail.tsx | None | Driver navigation (external link) |
| Web Push | subscribe API, notification-bell.tsx | None configured | Subscription storage only |
| Email/SMS | templates.ts, types.ts | None configured | Templates only, no delivery |
| File Storage | Image URL fields in DB | None configured | No upload mechanism |
