# 03 - Folder Tree (Expanded)

**Audit Date**: 2026-04-23
**Scope**: Full source-level folder structure for all 4 apps and all 9 packages

Conventions used:
- `[page]` = Next.js page component
- `[route]` = Next.js API route handler
- `[layout]` = Next.js layout component
- `[component]` = React component
- `[context]` = React Context provider
- `[hook]` = Custom React hook
- `[util]` = Utility/helper module
- `[type]` = TypeScript type/interface definitions
- `[schema]` = Zod schema
- `[repo]` = Repository (DB access layer)
- `[test]` = Test file

---

## apps/web (Customer Marketplace)

```
apps/web/
├── __tests__/
│   ├── api/
│   │   └── support/
│   │       └── (1 test file)                    [test] Support API handler test
│   └── auth/
│       ├── auth-layout.test.tsx                  [test] Auth layout rendering
│       ├── forgot-password.test.tsx              [test] Forgot password form
│       └── password-strength.test.tsx            [test] Password strength indicator
├── src/
│   ├── app/
│   │   ├── layout.tsx                            [layout] Root layout (fonts, providers)
│   │   ├── page.tsx                              [page] Homepage (hero, featured chefs)
│   │   ├── error.tsx                             [page] Error boundary
│   │   ├── loading.tsx                           [page] Root loading state
│   │   ├── not-found.tsx                         [page] 404 page
│   │   ├── globals.css                           Global CSS
│   │   │
│   │   ├── about/
│   │   │   └── page.tsx                          [page] About Ridendine
│   │   ├── auth/
│   │   │   ├── layout.tsx                        [layout] Auth pages wrapper
│   │   │   ├── login/
│   │   │   │   └── page.tsx                      [page] Customer login
│   │   │   ├── signup/
│   │   │   │   └── page.tsx                      [page] Customer signup
│   │   │   └── forgot-password/
│   │   │       └── page.tsx                      [page] Password reset request
│   │   ├── account/
│   │   │   ├── layout.tsx                        [layout] Account section wrapper (auth-guarded)
│   │   │   ├── page.tsx                          [page] Account overview
│   │   │   ├── addresses/
│   │   │   │   └── page.tsx                      [page] Saved delivery addresses
│   │   │   ├── favorites/
│   │   │   │   └── page.tsx                      [page] Favorite chefs/storefronts
│   │   │   ├── orders/
│   │   │   │   └── page.tsx                      [page] Order history list
│   │   │   └── settings/
│   │   │       └── page.tsx                      [page] Account settings
│   │   ├── cart/
│   │   │   ├── layout.tsx                        [layout] Cart layout wrapper
│   │   │   └── page.tsx                          [page] Shopping cart view
│   │   ├── checkout/
│   │   │   └── page.tsx                          [page] Checkout (Stripe Elements)
│   │   ├── chefs/
│   │   │   ├── page.tsx                          [page] All chefs browse (with filters)
│   │   │   └── [slug]/
│   │   │       └── page.tsx                      [page] Individual chef storefront
│   │   ├── chef-resources/
│   │   │   └── page.tsx                          [page] Resources for aspiring chefs
│   │   ├── chef-signup/
│   │   │   └── page.tsx                          [page] Chef signup landing/redirect
│   │   ├── contact/
│   │   │   └── page.tsx                          [page] Contact form/info
│   │   ├── how-it-works/
│   │   │   └── page.tsx                          [page] How Ridendine works
│   │   ├── order-confirmation/
│   │   │   └── [orderId]/
│   │   │       └── page.tsx                      [page] Post-checkout confirmation
│   │   ├── orders/
│   │   │   └── [id]/
│   │   │       └── confirmation/
│   │   │           └── page.tsx                  [page] Order detail confirmation (near-dup of above)
│   │   ├── privacy/
│   │   │   └── page.tsx                          [page] Privacy policy
│   │   ├── terms/
│   │   │   └── page.tsx                          [page] Terms of service
│   │   │
│   │   └── api/
│   │       ├── addresses/
│   │       │   └── route.ts                      [route] GET/POST customer addresses
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   │   └── route.ts                  [route] POST customer login
│   │       │   └── signup/
│   │       │       └── route.ts                  [route] POST customer signup
│   │       ├── cart/
│   │       │   └── route.ts                      [route] GET/POST cart operations
│   │       ├── checkout/
│   │       │   └── route.ts                      [route] POST create order + Stripe PaymentIntent
│   │       ├── notifications/
│   │       │   ├── route.ts                      [route] GET customer notifications
│   │       │   └── subscribe/
│   │       │       └── route.ts                  [route] POST subscribe to push notifications
│   │       ├── orders/
│   │       │   ├── route.ts                      [route] GET customer orders list
│   │       │   └── [id]/
│   │       │       └── route.ts                  [route] GET/PATCH individual order
│   │       ├── profile/
│   │       │   └── route.ts                      [route] GET/PATCH customer profile
│   │       ├── support/
│   │       │   └── route.ts                      [route] POST create support ticket
│   │       └── webhooks/
│   │           └── stripe/
│   │               └── route.ts                  [route] POST Stripe webhook handler
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── auth-layout.tsx                   [component] Auth page wrapper UI
│   │   │   └── password-strength.tsx             [component] Password strength meter
│   │   ├── checkout/
│   │   │   └── stripe-payment-form.tsx           [component] Stripe Elements payment form
│   │   ├── chefs/
│   │   │   ├── chefs-filters.tsx                 [component] Browse filters (cuisine, rating)
│   │   │   └── chefs-list.tsx                    [component] Grid of chef storefront cards
│   │   ├── home/
│   │   │   └── featured-chefs.tsx                [component] Featured chefs section (homepage)
│   │   ├── layout/
│   │   │   └── header.tsx                        [component] Site header (nav, cart icon, user menu)
│   │   ├── notifications/
│   │   │   └── notification-bell.tsx             [component] Notification bell with dropdown
│   │   ├── storefront/
│   │   │   ├── storefront-header.tsx             [component] Chef storefront hero section
│   │   │   └── storefront-menu.tsx               [component] Menu display with add-to-cart
│   │   └── tracking/
│   │       └── order-tracking-map.tsx            [component] Order status/tracking display
│   │
│   ├── contexts/
│   │   └── cart-context.tsx                      [context] Cart state (items, add, remove, clear)
│   │
│   ├── lib/
│   │   ├── auth-helpers.ts                       [util] Session and auth helper wrappers
│   │   ├── engine.ts                             [util] Engine adapter + actor context helpers
│   │   └── order-helpers.ts                      [util] Order formatting utilities
│   │
│   └── middleware.ts                             Auth middleware (BYPASS_AUTH pattern)
│
├── package.json
├── next.config.js
├── tsconfig.json
└── tsconfig.typecheck.json
```

---

## apps/chef-admin (Chef Dashboard)

```
apps/chef-admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx                            [layout] Root layout
│   │   ├── page.tsx                              [page] Root redirect (→ dashboard or login)
│   │   ├── error.tsx                             [page] Error boundary
│   │   ├── loading.tsx                           [page] Root loading
│   │   ├── globals.css                           Global CSS
│   │   │
│   │   ├── auth/
│   │   │   ├── layout.tsx                        [layout] Auth pages wrapper
│   │   │   ├── login/
│   │   │   │   └── page.tsx                      [page] Chef login
│   │   │   └── signup/
│   │   │       └── page.tsx                      [page] Chef signup (also triggers storefront setup)
│   │   ├── dashboard/
│   │   │   ├── layout.tsx                        [layout] Dashboard shell with sidebar
│   │   │   ├── loading.tsx                       [page] Dashboard loading state
│   │   │   ├── page.tsx                          [page] Dashboard home (order summary, stats)
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx                      [page] Revenue and item analytics
│   │   │   ├── menu/
│   │   │   │   └── page.tsx                      [page] Menu management (list, add, edit, delete)
│   │   │   ├── orders/
│   │   │   │   └── page.tsx                      [page] Active and past orders list
│   │   │   ├── payouts/
│   │   │   │   └── page.tsx                      [page] Payout history and request
│   │   │   ├── reviews/
│   │   │   │   └── page.tsx                      [page] Customer reviews received
│   │   │   ├── settings/
│   │   │   │   └── page.tsx                      [page] Chef profile and preferences
│   │   │   └── storefront/
│   │   │       └── page.tsx                      [page] Storefront setup and editing
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── signup/
│   │       │       └── route.ts                  [route] POST chef signup + storefront creation
│   │       ├── menu/
│   │       │   ├── route.ts                      [route] GET/POST menu items
│   │       │   ├── [id]/
│   │       │   │   └── route.ts                  [route] GET/PATCH/DELETE individual menu item
│   │       │   └── categories/
│   │       │       └── route.ts                  [route] GET/POST menu categories
│   │       ├── orders/
│   │       │   ├── route.ts                      [route] GET orders for chef's storefront
│   │       │   └── [id]/
│   │       │       └── route.ts                  [route] PATCH order status (accept/reject/ready)
│   │       ├── payouts/
│   │       │   ├── request/
│   │       │   │   └── route.ts                  [route] POST request payout
│   │       │   └── setup/
│   │       │       └── route.ts                  [route] POST Stripe Connect setup
│   │       ├── profile/
│   │       │   └── route.ts                      [route] GET/PATCH chef profile
│   │       └── storefront/
│   │           └── route.ts                      [route] GET/PATCH storefront details
│   │
│   ├── components/
│   │   ├── auth/
│   │   │   ├── auth-layout.tsx                   [component] Auth page wrapper UI
│   │   │   └── password-strength.tsx             [component] Password strength meter (duplicated from web)
│   │   ├── layout/
│   │   │   ├── header.tsx                        [component] Dashboard header
│   │   │   └── sidebar.tsx                       [component] Dashboard sidebar navigation
│   │   ├── menu/
│   │   │   └── menu-list.tsx                     [component] Menu items management table
│   │   ├── orders/
│   │   │   └── orders-list.tsx                   [component] Orders list with action buttons
│   │   ├── profile/
│   │   │   └── profile-form.tsx                  [component] Chef profile edit form
│   │   └── storefront/
│   │       ├── storefront-form.tsx               [component] Edit storefront details
│   │       └── storefront-setup-form.tsx         [component] Initial storefront setup wizard
│   │
│   └── lib/
│       └── engine.ts                             [util] Engine adapter + chef actor context helpers
│   └── middleware.ts                             Auth middleware (BYPASS_AUTH pattern)
│
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## apps/ops-admin (Operations Center)

```
apps/ops-admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx                            [layout] Root layout
│   │   ├── page.tsx                              [page] Root redirect (→ dashboard or login)
│   │   ├── error.tsx                             [page] Error boundary
│   │   ├── loading.tsx                           [page] Root loading
│   │   ├── globals.css                           Global CSS
│   │   │
│   │   ├── auth/
│   │   │   └── login/
│   │   │       └── page.tsx                      [page] Ops admin login
│   │   ├── dashboard/
│   │   │   ├── page.tsx                          [page] Dashboard queue overview
│   │   │   ├── analytics/
│   │   │   │   └── page.tsx                      [page] Platform analytics and charts
│   │   │   ├── chefs/
│   │   │   │   ├── page.tsx                      [page] All chefs list
│   │   │   │   ├── approvals/
│   │   │   │   │   └── page.tsx                  [page] Chef approval queue
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx                  [page] Chef detail view
│   │   │   │       ├── chef-governance-actions.tsx    [component] Approve/suspend/reactivate actions
│   │   │   │       └── storefront-governance-actions.tsx [component] Storefront control actions
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx                      [page] All customers list
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx                  [page] Customer detail + order history
│   │   │   ├── deliveries/
│   │   │   │   ├── page.tsx                      [page] All deliveries list (with queue filters)
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx                  [page] Delivery detail view
│   │   │   │       └── delivery-actions.tsx      [component] Manual dispatch/status override
│   │   │   ├── drivers/
│   │   │   │   ├── page.tsx                      [page] All drivers list
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx                  [page] Driver detail view
│   │   │   │       └── driver-governance-actions.tsx [component] Approve/suspend driver actions
│   │   │   ├── finance/
│   │   │   │   ├── page.tsx                      [page] Finance overview + refund queue
│   │   │   │   └── finance-actions.tsx           [component] Refund processing actions
│   │   │   ├── map/
│   │   │   │   └── page.tsx                      [page] Live delivery map view
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx                      [page] All orders list
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx                  [page] Order detail view
│   │   │   │       └── status-actions.tsx        [component] Manual order status override
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx                      [page] Platform settings
│   │   │   │   └── settings-form.tsx             [component] Settings edit form
│   │   │   └── support/
│   │   │       └── page.tsx                      [page] Support ticket queue
│   │   │
│   │   └── api/
│   │       ├── chefs/
│   │       │   ├── route.ts                      [route] GET all chefs
│   │       │   └── [id]/
│   │       │       └── route.ts                  [route] GET/PATCH individual chef
│   │       ├── customers/
│   │       │   └── route.ts                      [route] GET all customers
│   │       ├── deliveries/
│   │       │   ├── route.ts                      [route] GET all deliveries
│   │       │   └── [id]/
│   │       │       └── route.ts                  [route] GET/PATCH individual delivery
│   │       ├── drivers/
│   │       │   ├── route.ts                      [route] GET all drivers
│   │       │   └── [id]/
│   │       │       └── route.ts                  [route] GET/PATCH individual driver
│   │       ├── orders/
│   │       │   ├── route.ts                      [route] GET all orders
│   │       │   └── [id]/
│   │       │       ├── route.ts                  [route] GET/PATCH individual order
│   │       │       └── refund/
│   │       │           └── route.ts              [route] POST process Stripe refund
│   │       ├── support/
│   │       │   ├── route.ts                      [route] GET support tickets
│   │       │   └── [id]/
│   │       │       └── route.ts                  [route] GET/PATCH support ticket
│   │       └── engine/
│   │           ├── dashboard/
│   │           │   └── route.ts                  [route] GET dashboard queue counts
│   │           ├── dispatch/
│   │           │   └── route.ts                  [route] POST manual dispatch actions
│   │           ├── exceptions/
│   │           │   ├── route.ts                  [route] GET exceptions list
│   │           │   └── [id]/
│   │           │       └── route.ts              [route] PATCH resolve exception
│   │           ├── finance/
│   │           │   └── route.ts                  [route] GET finance summary
│   │           ├── orders/
│   │           │   └── [id]/
│   │           │       └── route.ts              [route] PATCH engine order status
│   │           ├── refunds/
│   │           │   └── route.ts                  [route] GET/POST pending refunds
│   │           ├── settings/
│   │           │   └── route.ts                  [route] GET/PATCH platform settings
│   │           └── storefronts/
│   │               └── [id]/
│   │                   └── route.ts              [route] PATCH storefront governance
│   │
│   ├── components/
│   │   ├── DashboardLayout.tsx                   [component] Main dashboard shell (sidebar + header)
│   │   ├── dashboard/
│   │   │   ├── alerts-panel.tsx                  [component] Active alerts/escalations panel
│   │   │   ├── orders-heatmap.tsx                [component] Order volume heatmap chart
│   │   │   ├── real-time-stats.tsx               [component] Live stats counters
│   │   │   └── revenue-chart.tsx                 [component] Revenue trend chart
│   │   └── map/
│   │       ├── delivery-map.tsx                  [component] Static delivery map view
│   │       └── live-map.tsx                      [component] Live driver map (incomplete)
│   │
│   └── lib/
│       └── engine.ts                             [util] Engine adapter + ops actor context helpers
│   └── middleware.ts                             Auth middleware (BYPASS_AUTH pattern)
│
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## apps/driver-app (Driver PWA)

```
apps/driver-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx                            [layout] Root layout (PWA manifest link)
│   │   ├── page.tsx                              [page] Main driver dashboard (online/offline toggle, active delivery)
│   │   ├── error.tsx                             [page] Error boundary
│   │   ├── loading.tsx                           [page] Root loading
│   │   ├── globals.css                           Global CSS
│   │   ├── components/
│   │   │   └── DriverDashboard.tsx               [component] Main dashboard UI (co-located with page)
│   │   │
│   │   ├── auth/
│   │   │   └── login/
│   │   │       └── page.tsx                      [page] Driver login
│   │   ├── delivery/
│   │   │   └── [id]/
│   │   │       ├── page.tsx                      [page] Active delivery detail
│   │   │       └── components/
│   │   │           └── DeliveryDetail.tsx        [component] Delivery detail UI (pickup/deliver buttons)
│   │   ├── earnings/
│   │   │   ├── page.tsx                          [page] Earnings summary
│   │   │   └── components/
│   │   │       └── EarningsView.tsx              [component] Earnings breakdown UI
│   │   ├── history/
│   │   │   ├── page.tsx                          [page] Delivery history list
│   │   │   └── components/
│   │   │       └── HistoryView.tsx               [component] History list UI (may be placeholder)
│   │   └── profile/
│   │       ├── page.tsx                          [page] Driver profile
│   │       └── components/
│   │           └── ProfileView.tsx               [component] Profile view/edit UI
│   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── login/
│   │       │   │   └── route.ts                  [route] POST driver login
│   │       │   └── logout/
│   │       │       └── route.ts                  [route] POST driver logout
│   │       ├── deliveries/
│   │       │   ├── route.ts                      [route] GET driver's active deliveries
│   │       │   └── [id]/
│   │       │       └── route.ts                  [route] GET/PATCH delivery (pickup/deliver)
│   │       ├── driver/
│   │       │   ├── route.ts                      [route] GET driver profile/status
│   │       │   └── presence/
│   │       │       └── route.ts                  [route] POST toggle online/offline
│   │       ├── earnings/
│   │       │   └── route.ts                      [route] GET earnings summary and history
│   │       ├── location/
│   │       │   └── route.ts                      [route] POST update driver GPS location (rate-limited)
│   │       └── offers/
│   │           └── route.ts                      [route] GET pending offers / POST accept or decline
│   │
│   ├── components/
│   │   └── map/
│   │       └── route-map.tsx                     [component] Navigation route map display
│   │
│   ├── hooks/
│   │   └── use-location-tracker.ts               [hook] GPS location tracking with rate limiting
│   │
│   └── lib/
│       └── engine.ts                             [util] Engine adapter + driver actor context helpers
│   └── middleware.ts                             Auth middleware (BYPASS_AUTH pattern)
│
├── package.json
├── next.config.js
└── tsconfig.json
```

---

## packages/db (Database Access Layer)

```
packages/db/
├── src/
│   ├── index.ts                                  Barrel export of all clients and repositories
│   ├── client/
│   │   ├── index.ts                              Re-exports all client factories
│   │   ├── admin.ts                              createAdminClient() - service role, server-only
│   │   ├── browser.ts                            createBrowserClient() - anon key, browser
│   │   ├── server.ts                             createServerClient() - SSR cookie handling
│   │   └── types.ts                              SupabaseClient type alias
│   ├── generated/
│   │   └── database.types.ts                     Auto-generated Supabase schema types
│   └── repositories/
│       ├── index.ts                              Re-exports all repository functions
│       ├── address.repository.ts                 [repo] Customer delivery addresses
│       ├── cart.repository.ts                    [repo] Shopping cart + cart items
│       ├── chef.repository.ts                    [repo] Chef profiles
│       ├── customer.repository.ts                [repo] Customer profiles
│       ├── delivery.repository.ts                [repo] Delivery records
│       ├── driver-presence.repository.ts         [repo] Driver online/offline presence
│       ├── driver.repository.ts                  [repo] Driver profiles
│       ├── finance.repository.ts                 [repo] Financial records, payouts
│       ├── menu.repository.ts                    [repo] Menu items and categories
│       ├── ops.repository.ts                     [repo] Ops action records
│       ├── order.repository.ts                   [repo] Orders and order items
│       ├── platform.repository.ts                [repo] Platform settings
│       ├── promo.repository.ts                   [repo] Promotional codes
│       ├── storefront.repository.ts              [repo] Chef storefronts
│       └── support.repository.ts                 [repo] Support tickets
├── package.json
└── tsconfig.json
```

---

## packages/engine (Business Logic)

```
packages/engine/
├── src/
│   ├── index.ts                                  Barrel export of all orchestrators and services
│   ├── constants.ts                              SERVICE_FEE_PERCENT, HST_RATE, BASE_DELIVERY_FEE, etc.
│   ├── core/
│   │   ├── index.ts
│   │   ├── audit-logger.ts                       AuditLogger - records domain events for accountability
│   │   ├── engine.factory.ts                     EngineFactory - creates singleton orchestrator instances
│   │   ├── event-emitter.ts                      DomainEventEmitter - pub/sub for domain events
│   │   └── sla-manager.ts                        SLAManager - tracks prep/delivery time SLAs
│   ├── orchestrators/
│   │   ├── order.orchestrator.ts                 Order lifecycle: create, accept, reject, cancel, pay, complete
│   │   ├── kitchen.engine.ts                     Kitchen state machine: startPrep, markReady
│   │   ├── dispatch.engine.ts                    Driver assignment: assign, offerAccept, offerDecline, pickup, deliver
│   │   ├── commerce.engine.ts                    Commerce: refunds, promo validation, platform fee calc
│   │   ├── support.engine.ts                     Support tickets: create, assign, resolve, close
│   │   ├── platform.engine.ts                    Platform settings CRUD
│   │   ├── ops.engine.ts                         Governance: chef approve/suspend, driver approve/suspend
│   │   ├── commerce.engine.test.ts               [test] Commerce engine tests
│   │   ├── dispatch.engine.test.ts               [test] Dispatch engine tests
│   │   ├── ops.validation.test.ts                [test] Ops validation tests
│   │   └── platform-settings.test.ts             [test] Platform settings tests
│   └── services/                                 Legacy services (backwards-compat)
│       ├── chefs.service.ts
│       ├── customers.service.ts
│       ├── dispatch.service.ts
│       ├── orders.service.ts
│       ├── permissions.service.ts
│       └── storage.service.ts
├── package.json
└── tsconfig.json
```

---

## packages/types (TypeScript Types)

```
packages/types/
├── src/
│   ├── index.ts                                  Barrel export
│   ├── api.ts                                    ApiResponse<T>, ErrorResponse types
│   ├── enums.ts                                  All domain enums: OrderStatus, EngineOrderStatus,
│   │                                             UserRole, DeliveryStatus, DriverPresenceStatus, etc.
│   ├── domains/
│   │   ├── chef.ts                               Chef, ChefProfile, ChefStorefront types
│   │   ├── customer.ts                           Customer, CustomerProfile types
│   │   ├── delivery.ts                           Delivery, AssignmentAttempt types
│   │   ├── driver.ts                             Driver, DriverPresence types
│   │   ├── order.ts                              Order, OrderItem, CartItem types
│   │   └── platform.ts                           PlatformSettings types
│   └── engine/
│       ├── index.ts                              ActorContext, OperationResult, DomainEventType
│       └── transitions.ts                        isValidTransition(), getAllowedActions() - state machine
├── package.json
└── tsconfig.json
```

---

## packages/ui (Shared Components)

```
packages/ui/
├── src/
│   ├── index.ts                                  Exports all components + cn utility
│   ├── utils.ts                                  cn() = clsx + tailwind-merge
│   └── components/
│       ├── avatar.tsx                            Avatar - user/chef image with fallback initials
│       ├── badge.tsx                             Badge - status labels with variants
│       ├── button.tsx                            Button - primary/secondary/ghost variants, sizes
│       ├── card.tsx                              Card - container with optional header/footer
│       ├── empty-state.tsx                       EmptyState - zero-data placeholder
│       ├── error-state.tsx                       ErrorState - error display with retry
│       ├── input.tsx                             Input - form input with label and error
│       ├── modal.tsx                             Modal - accessible dialog overlay
│       └── spinner.tsx                           Spinner - loading indicator, size variants
├── package.json
└── tsconfig.json
```

---

## packages/validation (Zod Schemas)

```
packages/validation/
├── src/
│   ├── index.ts                                  Exports all schemas
│   └── schemas/
│       ├── auth.ts                               signupSchema, loginSchema, forgotPasswordSchema
│       ├── chef.ts                               chefProfileSchema, storefrontSchema, menuItemSchema
│       ├── common.ts                             addressSchema, paginationSchema, idSchema
│       └── customer.ts                           customerProfileSchema, locationUpdateSchema
├── package.json
└── tsconfig.json
```

---

## packages/auth (Auth Utilities)

```
packages/auth/
├── src/
│   ├── index.ts                                  Exports all auth utilities
│   ├── server.ts                                 getSession(), getUser() server-side helpers
│   ├── hooks/
│   │   ├── use-auth.ts                           useAuth() - auth state, login, logout, signup
│   │   └── use-user.ts                           useUser() - current user data
│   └── utils/
│       ├── roles.ts                              hasRole(), requireRole(), ROLE_HIERARCHY
│       └── session.ts                            validateSession(), createSessionCookie()
├── package.json
└── tsconfig.json
```

---

## packages/utils (Utility Functions)

```
packages/utils/
├── src/
│   ├── index.ts                                  Exports all utilities
│   ├── dates.ts                                  formatDate(), formatRelativeTime(), isToday()
│   ├── errors.ts                                 AppError, isAppError(), formatError()
│   ├── formatting.ts                             formatCurrency(), formatPhone(), formatAddress()
│   └── helpers.ts                                generateId(), slugify(), truncate(), debounce()
├── package.json
└── tsconfig.json
```

---

## packages/notifications (Notification Templates)

```
packages/notifications/
├── src/
│   ├── index.ts                                  Exports templates and types
│   ├── templates.ts                              Email + push templates for all notification types:
│   │                                             order_confirmed, order_accepted, order_ready,
│   │                                             driver_assigned, order_delivered, refund_processed
│   └── types.ts                                  NotificationType, NotificationPayload, NotificationTemplate
├── package.json
└── tsconfig.json
```

---

## packages/config (Shared Configuration)

```
packages/config/
├── tailwind.config.ts                            Shared Tailwind config (brand colors, fonts)
├── eslint.config.js                              Shared ESLint rules for all packages and apps
└── tsconfig/
    ├── base.json                                 Base TypeScript config
    ├── nextjs.json                               Next.js-specific TypeScript config
    └── react-library.json                        React library TypeScript config
```
