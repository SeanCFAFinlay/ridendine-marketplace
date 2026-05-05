# 02 - Applications Overview

**Audit Date**: 2026-04-23
**Scope**: High-level overview of all 4 Next.js applications, their purpose, routes, dependencies, and readiness

---

## Application Summary Table

| Field | web | chef-admin | ops-admin | driver-app |
|-------|-----|------------|-----------|------------|
| **Package Name** | `@ridendine/web` | `@ridendine/chef-admin` | `@ridendine/ops-admin` | `@ridendine/driver-app` |
| **Path** | `apps/web` | `apps/chef-admin` | `apps/ops-admin` | `apps/driver-app` |
| **Port** | 3000 | 3001 | 3002 | 3003 |
| **User Type** | Customers | Home Chefs | Ops Administrators | Delivery Drivers |
| **Framework** | Next.js 14.2.0 App Router | Next.js 14.2.0 App Router | Next.js 14.2.0 App Router | Next.js 14.2.0 App Router |
| **Styling** | Tailwind CSS | Tailwind CSS | Tailwind CSS | Tailwind CSS |
| **Auth** | Supabase Auth + SSR | Supabase Auth + SSR | Supabase Auth + SSR | Supabase Auth + SSR |
| **Page Count** | 22 | 11 | 18 | 6 |
| **API Route Count** | 12 | 10 | 21 | 9 |
| **Maturity** | ~80% production-ready | ~75% production-ready | ~60-70% production-ready | ~70% production-ready |
| **Build Status** | Passes | Passes | Passes | Passes |
| **Test Files** | 4 | 0 | 0 | 0 |

---

## Shared Dependencies (All Apps)

All 4 applications share the following workspace packages:

| Package | Purpose |
|---------|---------|
| `@ridendine/db` | Supabase client factory and all repository functions |
| `@ridendine/engine` | Central business logic orchestrators |
| `@ridendine/auth` | Auth utilities, hooks, role helpers |
| `@ridendine/types` | TypeScript domain types and enums |
| `@ridendine/validation` | Zod validation schemas |
| `@ridendine/ui` | Shared React component library (Button, Input, Card, Badge, etc.) |
| `@ridendine/utils` | Utility functions (dates, formatting, errors) |

Additional shared runtime dependencies (all apps):
- `@supabase/ssr` ^0.5.0
- `next` ^14.2.0
- `react` ^18.3.0
- `react-dom` ^18.3.0

App-specific runtime dependencies:
- `apps/web`: `@stripe/react-stripe-js`, `@stripe/stripe-js`, `stripe`, `zod`
- `apps/chef-admin`: `stripe`, `zod`
- `apps/ops-admin`: `stripe`, `zod`, recharts (for analytics charts)
- `apps/driver-app`: `zod`

---

## apps/web - Customer Marketplace

**Purpose**: The public-facing storefront. Customers browse chef storefronts, add items to cart, check out with Stripe, and track their orders.

**User Journey**:
1. Browse homepage → view featured chefs
2. Browse all chefs → filter by cuisine/rating
3. View chef storefront → browse menu → add items to cart
4. Checkout → enter delivery address → pay with Stripe
5. View order status → order history → reviews

**Key Features**:
- Anonymous browsing (no login required to view chefs/menus)
- Cart managed via React Context (`cart-context.tsx`) + server-side cart persistence
- Stripe Elements for payment (hosted by `@stripe/react-stripe-js`)
- Stripe webhook handler for payment confirmation (`/api/webhooks/stripe`)
- Notification bell with subscription endpoint
- Address management for delivery

**Maturity Notes**:
- Core browse → checkout flow: working
- Stripe payment: working with production-grade webhook handling
- Order tracking page: renders but no real-time updates (requires manual refresh)
- `order-confirmation/[orderId]` and `orders/[id]/confirmation` are near-duplicate routes (slight redundancy)
- No pagination on chef list or order history list
- Promo code validation at checkout is fully implemented

**Route Breakdown**:

| Category | Count | Routes |
|----------|-------|--------|
| Public pages | 8 | `/`, `/chefs`, `/chefs/[slug]`, `/how-it-works`, `/about`, `/chef-signup`, `/chef-resources`, `/contact` |
| Auth pages | 3 | `/auth/login`, `/auth/signup`, `/auth/forgot-password` |
| Account pages | 5 | `/account`, `/account/orders`, `/account/addresses`, `/account/favorites`, `/account/settings` |
| Shopping pages | 3 | `/cart`, `/checkout`, `/order-confirmation/[orderId]` |
| Other pages | 3 | `/orders/[id]/confirmation`, `/privacy`, `/terms` |
| API routes | 12 | See 07-api-map.md |

---

## apps/chef-admin - Chef Dashboard

**Purpose**: The chef-facing management portal. Chefs manage their storefront, menu items, incoming orders, payouts, and profile.

**User Journey**:
1. Chef signs up / logs in
2. Sets up storefront (name, description, cuisine type, hours, photos)
3. Creates menu items with prices, categories, modifiers
4. Receives and manages orders (accept → start prep → mark ready)
5. Views analytics (revenue, popular items)
6. Requests payouts via Stripe Connect

**Key Features**:
- Storefront setup and editing
- Menu CRUD (items, categories)
- Order management with status transitions (accept, reject, start prep, mark ready)
- Payout request and Stripe Connect setup
- Analytics dashboard (revenue charts)
- Review reading

**Maturity Notes**:
- Order accept/reject/ready flow: working via engine
- No real-time order notifications (chef must refresh to see new orders)
- Payout flow: Stripe Connect setup route exists; payout request route exists but full Stripe Connect onboarding flow is ~60% complete
- Analytics page: renders with placeholder/partial data
- Review reading page: renders but shows limited data

**Route Breakdown**:

| Category | Count | Routes |
|----------|-------|--------|
| Auth pages | 2 | `/auth/login`, `/auth/signup` |
| Dashboard pages | 8 | `/dashboard`, `/dashboard/orders`, `/dashboard/menu`, `/dashboard/storefront`, `/dashboard/payouts`, `/dashboard/analytics`, `/dashboard/reviews`, `/dashboard/settings` |
| Root redirect | 1 | `/` (redirects to dashboard or login) |
| API routes | 10 | See 07-api-map.md |

---

## apps/ops-admin - Operations Center

**Purpose**: The internal operations control panel. Ops administrators manage chefs, drivers, customers, orders, deliveries, support tickets, finances (refunds), and platform settings.

**User Journey**:
- Operations manager logs in
- Reviews dashboard queue (pending dispatch, escalations, support backlog, pending refunds)
- Manages chef approvals and governance actions
- Manages driver approvals and governance actions
- Manually overrides orders and deliveries
- Processes refunds
- Manages platform settings (fees, flags)

**Key Features**:
- Dashboard with real-time queue counts (from engine)
- Chef governance: approve, suspend, reactivate, storefront control
- Driver governance: approve, suspend, reassign deliveries
- Customer management: view profile, order history
- Order management: status override, manual reassign
- Delivery management: dispatch, status override
- Support ticket queue: view, respond, close
- Finance dashboard: pending refunds, revenue overview
- Real Stripe refund processing (uses `payment_intent_id` from order)
- Platform settings: fee rates, feature flags, dispatch parameters
- Map page: visual delivery map (currently placeholder with `delivery-map` and `live-map` components)

**Maturity Notes**:
- Dashboard queue counts: working (engine pulls real data)
- Chef/driver governance actions: working
- Refund processing: working - uses real Stripe API, not mock IDs
- Map page: component exists but live driver location data integration is incomplete
- No pagination on list views (chefs, drivers, customers, orders)
- No conflict resolution if two ops admins act simultaneously on same entity
- Finance analytics charts may use placeholder data

**Route Breakdown**:

| Category | Count | Routes |
|----------|-------|--------|
| Auth pages | 1 | `/auth/login` |
| Dashboard pages | 13 | `/dashboard`, `/dashboard/chefs`, `/dashboard/chefs/approvals`, `/dashboard/chefs/[id]`, `/dashboard/customers`, `/dashboard/customers/[id]`, `/dashboard/drivers`, `/dashboard/drivers/[id]`, `/dashboard/deliveries`, `/dashboard/deliveries/[id]`, `/dashboard/orders`, `/dashboard/orders/[id]`, `/dashboard/support` |
| Feature pages | 3 | `/dashboard/analytics`, `/dashboard/finance`, `/dashboard/map`, `/dashboard/settings` |
| Root redirect | 1 | `/` (redirects to dashboard) |
| API routes | 21 | See 07-api-map.md |

---

## apps/driver-app - Driver PWA

**Purpose**: The mobile-optimized Progressive Web App for delivery drivers. Drivers go online, receive delivery offers, navigate to pickup, confirm pickup, navigate to customer, confirm delivery.

**User Journey**:
1. Driver logs in
2. Goes online (sets presence to available)
3. Receives delivery offers (push from dispatch engine)
4. Accepts/declines offer
5. Navigates to pickup location
6. Confirms pickup with chef
7. Navigates to customer
8. Confirms delivery with customer
9. Views earnings history

**Key Features**:
- Driver presence toggle (online/offline)
- Location tracking (POST to `/api/location` every ~5 seconds with rate limiting)
- Delivery offer accept/decline
- Real-time delivery status updates (pickup, in-transit, delivered)
- Earnings view
- PWA manifest for home screen installation

**Maturity Notes**:
- Location tracking: implemented with in-memory rate limiting (5s minimum between updates)
- Offer accept/decline: working via dispatch engine
- Delivery status updates: working
- Route map (`route-map.tsx`): component exists; integration with live navigation is partial
- History page (`/history`): renders with `HistoryView` component but data may be placeholder
- No push notification integration for new offer delivery (driver must have app open to see offers)
- Profile page renders but profile update flow completeness is unclear

**Route Breakdown**:

| Category | Count | Routes |
|----------|-------|--------|
| Auth pages | 1 | `/auth/login` |
| App pages | 5 | `/` (main dashboard), `/delivery/[id]`, `/earnings`, `/history`, `/profile` |
| API routes | 9 | See 07-api-map.md |

---

## Middleware Comparison

All 4 apps have middleware with the same BYPASS_AUTH security issue:

| App | Protected Routes | Public Routes | BYPASS_AUTH Pattern |
|-----|-----------------|---------------|---------------------|
| `web` | `/account/*` | `/auth/login`, `/auth/signup`, all public pages | Yes - dev mode + BYPASS_AUTH env |
| `chef-admin` | All except `/auth/*` | `/auth/login`, `/auth/signup` | Yes - dev mode + BYPASS_AUTH env |
| `ops-admin` | All except `/auth/login` | `/auth/login` | Yes - dev mode + BYPASS_AUTH env |
| `driver-app` | All except `/auth/*` | `/auth/login`, `/auth/logout` | Yes - dev mode + BYPASS_AUTH env |

The `NODE_ENV === 'development'` branch means auth is completely bypassed during local development for all 4 apps. The `VERCEL_ENV !== 'production'` branch means preview deployments on Vercel also bypass auth unless `BYPASS_AUTH` is explicitly set to `false`.

---

## Engine Integration Pattern

All apps use the same pattern to integrate with `@ridendine/engine`:

Each app has `src/lib/engine.ts` which re-exports engine utilities with app-specific actor context helpers:
- `getEngine()` - returns the shared EngineFactory instance
- `getCustomerActorContext()` / `getChefActorContext()` / `getOpsActorContext()` / `getDriverActorContext()` - builds an `ActorContext` from the current session
- `errorResponse()` / `successResponse()` - standardized JSON response helpers
- `getSystemActor()` - system actor for webhook handlers

This means API routes in each app never directly instantiate engine classes - they always go through the local `engine.ts` adapter. This is a strong pattern that prevents context leakage between apps.
