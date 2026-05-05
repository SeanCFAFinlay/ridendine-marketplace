# Route Inventory

> Every page, API route, and middleware across all 4 applications.

## Customer App (`apps/web` — port 3000)

### Pages

| Route | File | Type | Access | Renders | Data Source | Status |
|-------|------|------|--------|---------|-------------|--------|
| `/` | `app/page.tsx` | Server | Public | Header, Hero, FeaturedChefs, Chef Spotlight, Footer | `getActiveStorefronts(limit:6, featured:true)` | **Fully connected** |
| `/auth/login` | `app/auth/login/page.tsx` | Client | Guest only | AuthLayout, email/password form | POST `/api/auth/login` | **Fully connected** |
| `/auth/signup` | `app/auth/signup/page.tsx` | Client | Guest only | AuthLayout, registration form, PasswordStrength | `useAuth().signUp()` | **Fully connected** |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | Client | Guest only | Email form → success state | None (UI only, no API call) | **Placeholder** |
| `/chefs` | `app/chefs/page.tsx` | Server | Public | Header, ChefsFilters, ChefsList | `getActiveStorefronts(limit:20)` | **Partially connected** (filters non-functional) |
| `/chefs/[slug]` | `app/chefs/[slug]/page.tsx` | Server | Public | StorefrontHeader, StorefrontMenu | `getStorefrontBySlug()`, `getMenuItemsByStorefront()` | **Fully connected** |
| `/cart` | `app/cart/page.tsx` | Client | Auth | Cart items, quantity controls, order summary | `useCart()` context | **Fully connected** |
| `/checkout` | `app/checkout/page.tsx` | Client | Auth | 2-step: details → Stripe payment | POST `/api/checkout`, `/api/addresses`, Stripe Elements | **Fully connected** |
| `/order-confirmation/[orderId]` | `app/order-confirmation/[orderId]/page.tsx` | Client | Auth | Status timeline, OrderTrackingMap, driver info | Supabase direct + realtime subscription | **Fully connected** |
| `/account` | `app/account/page.tsx` | Client | Auth | Profile card, navigation menu | `useAuthContext()` | **Fully connected** |
| `/account/orders` | `app/account/orders/page.tsx` | Client | Auth | Order history cards | Supabase direct query (orders + storefronts) | **Fully connected** |
| `/account/addresses` | `app/account/addresses/page.tsx` | Client | Auth | Address CRUD | `/api/addresses` (all methods) | **Fully connected** |
| `/account/favorites` | `app/account/favorites/page.tsx` | Client | Auth | Empty state with tips | None | **Placeholder** |
| `/account/settings` | `app/account/settings/page.tsx` | Client | Auth | Profile form, notifications, danger zone | setTimeout mock submit | **Partially connected** (form not wired) |
| `/about` | `app/about/page.tsx` | Server | Public | Static content | None | **Static** |
| `/how-it-works` | `app/how-it-works/page.tsx` | Server | Public | 5-step guide | None | **Static** |
| `/contact` | `app/contact/page.tsx` | Client | Public | Support form | POST `/api/support` | **Fully connected** |
| `/privacy` | `app/privacy/page.tsx` | Server | Public | Static content | None | **Static** |
| `/terms` | `app/terms/page.tsx` | Server | Public | Static content | None | **Static** |
| `/chef-signup` | `app/chef-signup/page.tsx` | — | Public | Chef signup landing | Unknown | **Needs inspection** |
| `/chef-resources` | `app/chef-resources/page.tsx` | — | Public | Chef resources | Unknown | **Needs inspection** |

### API Routes

| Endpoint | Methods | Auth | Engine | DB Tables | Status |
|----------|---------|------|--------|-----------|--------|
| `/api/auth/login` | POST | None | No | auth.users, customers | **Fully connected** |
| `/api/auth/signup` | POST | None | No | auth.users, customers | **Fully connected** |
| `/api/cart` | GET/POST/PATCH/DELETE | Customer | No | carts, cart_items, menu_items | **Fully connected** |
| `/api/checkout` | POST | Customer | Yes (orders.createOrder, orders.authorizePayment) | orders, order_items, carts, promo_codes + Stripe | **Fully connected** |
| `/api/addresses` | GET/POST/PATCH/DELETE | Customer | No | customer_addresses | **Fully connected** |
| `/api/orders` | GET | Customer | No | orders, chef_storefronts | **Fully connected** |
| `/api/orders/[id]` | GET/PATCH | Customer | Yes (orders.getAllowedActions, orders.cancelOrder) | orders, order_items, deliveries, order_status_history, driver_presence | **Fully connected** |
| `/api/profile` | GET/PATCH | Customer | No | customers | **Fully connected** |
| `/api/notifications` | GET/POST/PATCH | Auth | No | notifications | **Fully connected** |
| `/api/notifications/subscribe` | POST/DELETE | Auth | No | push_subscriptions | **Connected** (subscribe only, no dispatch) |
| `/api/support` | POST | None | No | Logs only (no DB write) | **Partially connected** (no ticket creation) |
| `/api/webhooks/stripe` | POST | Stripe signature | Yes (orders.submitToKitchen, platform.handlePaymentFailure, platform.handleExternalRefund) | orders + Stripe events | **Fully connected** |

### Middleware

| File | Protected Routes | Behavior |
|------|-----------------|----------|
| `middleware.ts` | `/account/*` | Redirects to `/auth/login?redirect=` if no session. Auth routes redirect to `/chefs` if logged in. Bypass in dev. |

---

## Chef Admin (`apps/chef-admin` — port 3001)

### Pages

| Route | File | Type | Access | Renders | Data Source | Status |
|-------|------|------|--------|---------|-------------|--------|
| `/` | `app/page.tsx` | Server | — | Redirect to `/dashboard` | — | — |
| `/auth/login` | `app/auth/login/page.tsx` | Client | Guest | AuthLayout, login form | `useAuth().signIn()` | **Fully connected** |
| `/auth/signup` | `app/auth/signup/page.tsx` | Client | Guest | Multi-field chef signup | POST `/api/auth/signup` | **Fully connected** |
| `/dashboard` | `app/dashboard/page.tsx` | Server | Chef | 4 stat cards, quick actions, recent orders | `getChefStorefront()`, `getDashboardData()` | **Fully connected** |
| `/dashboard/menu` | `app/dashboard/menu/page.tsx` | Server | Chef | MenuList with CRUD modals | `getStorefrontMenu()` | **Fully connected** |
| `/dashboard/orders` | `app/dashboard/orders/page.tsx` | Server | Chef | OrdersList with real-time + countdown | `getOrdersByStorefront()` + engine actions | **Fully connected** |
| `/dashboard/storefront` | `app/dashboard/storefront/page.tsx` | Server | Chef | StorefrontForm or StorefrontSetupForm | `getChefStorefront()` | **Fully connected** |
| `/dashboard/payouts` | `app/dashboard/payouts/page.tsx` | Client | Chef | Balance cards, payout history, Stripe Connect | Supabase direct + `/api/payouts/*` | **Fully connected** |
| `/dashboard/analytics` | `app/dashboard/analytics/page.tsx` | Client | Chef | Revenue charts, top items, hourly distribution | Supabase direct queries | **Fully connected** |
| `/dashboard/reviews` | `app/dashboard/reviews/page.tsx` | Client | Chef | Review cards, rating distribution, respond | Supabase direct queries | **Fully connected** |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | Server | Chef | ProfileForm | `getChefProfile()` | **Fully connected** |

### API Routes

| Endpoint | Methods | Auth | Engine | DB Tables | Status |
|----------|---------|------|--------|-----------|--------|
| `/api/auth/signup` | POST | None | No | auth.users, chef_profiles | **Fully connected** |
| `/api/menu` | GET/POST | Chef | Yes (audit) | menu_items, menu_categories | **Fully connected** |
| `/api/menu/[id]` | GET/PATCH/DELETE | Chef | Yes (audit) | menu_items | **Fully connected** |
| `/api/menu/categories` | GET/POST | Chef | No | menu_categories | **Fully connected** |
| `/api/orders` | GET | Chef | Yes (getAllowedActions) | orders, customers, customer_addresses | **Fully connected** |
| `/api/orders/[id]` | GET/PATCH | Chef | Yes (accept, reject, startPreparing, markReady, updatePrepTime) | orders, order_items, deliveries | **Fully connected** |
| `/api/profile` | GET/PATCH | Chef | No | chef_profiles | **Fully connected** |
| `/api/storefront` | GET/POST/PATCH | Chef | Yes (audit) | chef_storefronts, chef_kitchens | **Fully connected** |
| `/api/payouts/setup` | POST | Chef | No | chef_payout_accounts + Stripe Connect | **Fully connected** |
| `/api/payouts/request` | POST | Chef | No | chef_payouts + Stripe Transfer | **Fully connected** |

---

## Ops Admin (`apps/ops-admin` — port 3002)

### Pages

| Route | File | Type | Access | Renders | Status |
|-------|------|------|--------|---------|--------|
| `/` | Redirect | — | — | → `/dashboard` | — |
| `/auth/login` | Client | Guest | Login form | **Fully connected** |
| `/dashboard` | Server | Ops | Command center: stats, queues, alerts | **Fully connected** |
| `/dashboard/analytics` | Server | Ops | Order/revenue/platform metrics | **Fully connected** |
| `/dashboard/chefs` | Client | Ops | Chef list + governance actions | **Fully connected** |
| `/dashboard/chefs/[id]` | Server | Ops | Chef detail + storefront governance | **Fully connected** |
| `/dashboard/chefs/approvals` | Client | Ops | Pending chef approvals | **Fully connected** |
| `/dashboard/customers` | Client | Ops | Customer list | **Fully connected** |
| `/dashboard/customers/[id]` | Server | Ops | Customer detail + orders | **Fully connected** |
| `/dashboard/deliveries` | Server | Ops | Dispatch command center + queues | **Fully connected** |
| `/dashboard/deliveries/[id]` | Server | Ops | Delivery intervention console | **Fully connected** |
| `/dashboard/drivers` | Client | Ops | Driver list + governance | **Fully connected** |
| `/dashboard/drivers/[id]` | Server | Ops | Driver detail + earnings | **Fully connected** |
| `/dashboard/orders` | Client | Ops | Order list + status management | **Fully connected** |
| `/dashboard/orders/[id]` | Server | Ops | Order oversight + audit trail | **Fully connected** |
| `/dashboard/finance` | Server | Ops (Manager+) | Finance operations + refund/payout queues | **Fully connected** |
| `/dashboard/support` | Server | Ops | Support ticket queue + exceptions | **Fully connected** |
| `/dashboard/settings` | Server | Ops (Manager+) | Platform rules configuration | **Fully connected** |
| `/dashboard/map` | Server | Ops | Live map (dynamic import) | **Fully connected** |

### API Routes (25 endpoints)

| Endpoint | Methods | Role Gate | Engine | Status |
|----------|---------|-----------|--------|--------|
| `/api/chefs` | GET/POST | Ops | platform.updateChefGovernance | **Fully connected** |
| `/api/chefs/[id]` | PATCH | Manager+ | platform.updateChefGovernance | **Fully connected** |
| `/api/customers` | GET/POST | Ops | — | **Fully connected** |
| `/api/deliveries` | GET | Ops | — | **Fully connected** |
| `/api/deliveries/[id]` | PATCH | Ops | dispatch.manualAssign | **Fully connected** |
| `/api/drivers` | GET/POST | Ops | platform.updateDriverGovernance | **Fully connected** |
| `/api/drivers/[id]` | PATCH | Manager+ | platform.updateDriverGovernance | **Fully connected** |
| `/api/orders` | GET | Ops | — | **Fully connected** |
| `/api/orders/[id]` | GET/PATCH | Ops | Various engine actions | **Fully connected** |
| `/api/orders/[id]/refund` | POST | Manager+ | Stripe refund + DB update | **Fully connected** |
| `/api/support` | GET/POST | Ops | — | **Fully connected** |
| `/api/support/[id]` | PATCH | Ops Agent+ | — | **Fully connected** |
| `/api/engine/dashboard` | GET/POST | Ops | ops.getDashboard + actions | **Fully connected** |
| `/api/engine/dispatch` | GET/POST | Ops | ops.getDispatchCommandCenter + interventions | **Fully connected** |
| `/api/engine/exceptions` | GET/POST | Ops | support.getExceptionQueue + create/actions | **Fully connected** |
| `/api/engine/exceptions/[id]` | GET/PATCH | Ops | support.getException + update | **Fully connected** |
| `/api/engine/finance` | GET/POST | Manager+ | ops.getFinanceOperations + actions | **Fully connected** |
| `/api/engine/orders/[id]` | GET/PATCH | Ops | orders + audit + commerce | **Fully connected** |
| `/api/engine/refunds` | GET/POST | Ops | commerce.getPendingRefunds + actions | **Fully connected** |
| `/api/engine/settings` | GET/POST | Manager+ | ops.getPlatformRules + update | **Fully connected** |
| `/api/engine/storefronts/[id]` | GET/PATCH | Ops | kitchen + storefront actions | **Fully connected** |

---

## Driver App (`apps/driver-app` — port 3003)

### Pages

| Route | File | Type | Access | Renders | Data Source | Status |
|-------|------|------|--------|---------|-------------|--------|
| `/` | `app/page.tsx` | Server | Driver | DriverDashboard | `getDriverByUserId()`, `getActiveDeliveriesForDriver()` | **Fully connected** |
| `/auth/login` | `app/auth/login/page.tsx` | Client | Guest | Login form | POST `/api/auth/login` | **Fully connected** |
| `/delivery/[id]` | `app/delivery/[id]/page.tsx` | Server | Driver | DeliveryDetail + location tracking | `getDeliveryById()`, order query | **Fully connected** |
| `/earnings` | `app/earnings/page.tsx` | Server | Driver | EarningsView | `getDeliveryHistory(limit:20)` | **Fully connected** |
| `/history` | `app/history/page.tsx` | Server | Driver | HistoryView | `getDeliveryHistory(limit:50)` | **Fully connected** |
| `/profile` | `app/profile/page.tsx` | Server | Driver | ProfileView | `getDriverByUserId()` | **Fully connected** |

### API Routes

| Endpoint | Methods | Auth | Engine | DB Tables | Status |
|----------|---------|------|--------|-----------|--------|
| `/api/auth/login` | POST | None | No | auth.users, drivers (status check) | **Fully connected** |
| `/api/auth/logout` | POST | Auth | No | auth session | **Fully connected** |
| `/api/deliveries` | GET | Driver | No | deliveries | **Fully connected** |
| `/api/deliveries/[id]` | GET/PATCH | Driver | Yes (dispatch.acceptOffer, declineOffer, updateDeliveryStatus, platform.completeDeliveredOrder) | deliveries, orders, assignment_attempts | **Fully connected** |
| `/api/driver` | GET/PATCH | Driver | No | drivers | **Fully connected** |
| `/api/driver/presence` | GET/PATCH | Driver | Yes (audit, events) | driver_presence | **Fully connected** |
| `/api/location` | POST | Driver | Yes (events) | driver_presence, driver_locations, delivery_tracking_events | **Fully connected** |
| `/api/offers` | GET/POST | Driver | Yes (dispatch.acceptOffer, declineOffer) | assignment_attempts, deliveries, orders | **Fully connected** |
| `/api/earnings` | GET | Driver | No | deliveries (calculated) | **Fully connected** |
