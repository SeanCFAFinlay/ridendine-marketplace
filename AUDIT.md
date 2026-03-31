# Ridendine Marketplace — Full Repository Audit

> Generated: 2026-03-31  
> Auditor: Copilot Coding Agent  
> Typecheck status: ✅ All 12 packages pass  
> Linting status: ⚠️ ESLint not configured in any app (prompts for setup interactively)

---

## Executive Summary

**What this repo is:** Ridendine is a chef-first home-food delivery marketplace for Hamilton, ON. It connects customers with home chefs and dispatches drivers for delivery.

**Stack:**
- Monorepo: pnpm@9.15.0 + Turborepo 2.x
- Apps: 4 × Next.js 14 (App Router), TypeScript, Tailwind CSS
- Backend: Supabase (PostgreSQL + Auth + Realtime + Storage)
- Payments: Stripe
- Engine: Custom central business logic package (`@ridendine/engine`)
- Deployment: Vercel (one deployment per app)

**Current condition:** Early-stage but architecturally solid. TypeScript compiles clean. The engine, type system, and database schema are well-designed. However, there are critical runtime bugs, major security holes, missing pages/routes, missing test infrastructure, and several broken UX flows.

**Biggest blockers:**
1. `BYPASS_AUTH=true` hardcoded in ALL 4 `vercel.json` files — the entire platform deploys with auth bypassed
2. `clearCart()` in the checkout API is called with the wrong argument (customer ID instead of cart ID) — cart is never cleared after purchase
3. `order.total / 100` in the server-side confirmation page shows amounts 100× too small
4. `/orders/[id]/page.tsx` and `/account/orders/[id]/page.tsx` are missing — linked from UI buttons that go nowhere
5. No ESLint configs in any app directory — `next lint` prompts interactively and would fail in CI
6. No jest configuration files despite test scripts declared in package.json

---

## Repo Map

### Top-Level Structure

```
ridendine-marketplace/
├── apps/
│   ├── web/                    # Customer marketplace (port 3000)
│   ├── chef-admin/             # Chef dashboard (port 3001)
│   ├── ops-admin/              # Operations command center (port 3002)
│   └── driver-app/             # Driver PWA (port 3003)
├── packages/
│   ├── db/                     # Supabase clients + repositories
│   ├── engine/                 # Central business logic orchestrators
│   ├── types/                  # Shared TypeScript types and enums
│   ├── auth/                   # Auth hooks and provider (React)
│   ├── ui/                     # Shared React components
│   ├── validation/             # Zod schemas
│   ├── utils/                  # Utility functions
│   ├── notifications/          # Notification templates
│   └── config/                 # Shared ESLint, TypeScript, Tailwind configs
├── supabase/
│   ├── migrations/             # 8 SQL migration files (00001–00008)
│   ├── seeds/                  # seed.sql
│   ├── fix_permissions.sql     # Loose SQL (should be a migration)
│   └── make_userid_nullable.sql # Loose SQL (should be a migration)
├── .env.example                # All env var documentation
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # Workspace config
├── vercel.json                 # Root Vercel config (builds ops-admin)
└── package.json                # Root scripts and shared deps
```

---

### apps/web — Customer Marketplace

**Purpose:** Public-facing site where customers browse chefs, view menus, add to cart, checkout, and track orders.

**Route/Page Map:**

| Route | File | Type | Notes |
|-------|------|------|-------|
| `/` | `app/page.tsx` | Server | Landing page with hero, how-it-works, featured chefs |
| `/chefs` | `app/chefs/page.tsx` | Server | Browse all active storefronts |
| `/chefs/[slug]` | `app/chefs/[slug]/page.tsx` | Server | Storefront detail + menu |
| `/cart` | `app/cart/page.tsx` | Client | Cart review page |
| `/checkout` | `app/checkout/page.tsx` | Client | Multi-step checkout (address → tip → payment) |
| `/order-confirmation/[orderId]` | `app/order-confirmation/[orderId]/page.tsx` | Client | Full tracking page with Realtime + map |
| `/orders/[id]/confirmation` | `app/orders/[id]/confirmation/page.tsx` | Server | Simple static confirmation (duplicate!) |
| `/orders/[id]` | **MISSING** | — | No page.tsx — "Track Order" button leads to 404 |
| `/account` | `app/account/page.tsx` | Client | Account overview |
| `/account/orders` | `app/account/orders/page.tsx` | Client | Order history list |
| `/account/orders/[id]` | **MISSING** | — | No page.tsx — "View Details" leads to 404 |
| `/account/addresses` | `app/account/addresses/page.tsx` | Client | Saved delivery addresses |
| `/account/favorites` | `app/account/favorites/page.tsx` | Client | Favourite chefs/dishes |
| `/account/settings` | `app/account/settings/page.tsx` | Client | Account settings |
| `/auth/login` | `app/auth/login/page.tsx` | Client | Login form |
| `/auth/signup` | `app/auth/signup/page.tsx` | Client | Registration form |
| `/auth/forgot-password` | `app/auth/forgot-password/page.tsx` | Client | Password reset |
| `/about` | `app/about/page.tsx` | Server | Static about page |
| `/contact` | `app/contact/page.tsx` | Client | Contact form |
| `/privacy` | `app/privacy/page.tsx` | Server | Privacy policy |
| `/terms` | `app/terms/page.tsx` | Server | Terms of service |
| `/how-it-works` | `app/how-it-works/page.tsx` | Server | Explainer page |
| `/chef-resources` | `app/chef-resources/page.tsx` | Server | Chef onboarding info |
| `/chef-signup` | `app/chef-signup/page.tsx` | Client | Chef application form |

**API Routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/login` | POST | Supabase sign-in via API |
| `/api/auth/signup` | POST | Supabase sign-up via API |
| `/api/cart` | GET/POST/PATCH/DELETE | Cart CRUD |
| `/api/checkout` | POST | Create order + Stripe PaymentIntent |
| `/api/orders` | GET | Fetch customer's orders |
| `/api/orders/[id]` | GET | Single order detail |
| `/api/addresses` | GET/POST/DELETE | Customer address management |
| `/api/profile` | GET/PATCH | Customer profile |
| `/api/support` | POST | Submit support ticket |
| `/api/notifications` | GET | Fetch notifications |
| `/api/notifications/subscribe` | POST | Subscribe to push notifications |
| `/api/webhooks/stripe` | POST | Stripe webhook handler |

**Key Components:**
- `components/layout/header.tsx` — Top nav with cart count and auth state
- `components/chefs/chefs-list.tsx` — Server component fetching storefront list
- `components/chefs/chefs-filters.tsx` — Client-side cuisine type filters
- `components/checkout/stripe-payment-form.tsx` — Stripe Elements form
- `components/tracking/order-tracking-map.tsx` — Leaflet map for delivery
- `components/home/featured-chefs.tsx` — Featured chefs section
- `contexts/cart-context.tsx` — React context for cart state (client-side)

**Lib:**
- `lib/engine.ts` — Engine singleton, actor context helpers, response helpers
- `lib/auth-helpers.ts` — Server-side auth utilities

**Middleware:** `middleware.ts`
- Protects `/account/*`
- Redirects logged-in users away from `/auth/*`
- `BYPASS_AUTH=true` in vercel.json → **auth is bypassed in all deployments**

---

### apps/chef-admin — Chef Dashboard

**Purpose:** Dashboard for approved chefs to manage orders, menus, storefronts, reviews, and payouts.

**Route/Page Map:**

| Route | File | Notes |
|-------|------|-------|
| `/` | `app/page.tsx` | Redirect to `/dashboard` |
| `/auth/login` | `app/auth/login/page.tsx` | Chef login |
| `/auth/signup` | `app/auth/signup/page.tsx` | Chef registration |
| `/dashboard` | `app/dashboard/page.tsx` | KPIs, active orders, recent orders table |
| `/dashboard/orders` | `app/dashboard/orders/page.tsx` | Full order list + status management |
| `/dashboard/menu` | `app/dashboard/menu/page.tsx` | Menu item CRUD |
| `/dashboard/storefront` | `app/dashboard/storefront/page.tsx` | Storefront settings |
| `/dashboard/analytics` | `app/dashboard/analytics/page.tsx` | Revenue charts (mock data) |
| `/dashboard/reviews` | `app/dashboard/reviews/page.tsx` | Customer reviews |
| `/dashboard/payouts` | `app/dashboard/payouts/page.tsx` | Payout history |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | Account settings |

**API Routes:**

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/orders` | GET | Fetch storefront orders |
| `/api/orders/[id]` | GET/PATCH | Order detail + status update (via engine) |
| `/api/menu` | GET/POST | Menu items list + create |
| `/api/menu/[id]` | PATCH/DELETE | Menu item update/delete |
| `/api/menu/categories` | GET/POST | Menu categories |
| `/api/storefront` | GET/PATCH | Storefront settings |
| `/api/profile` | GET/PATCH | Chef profile |
| `/api/payouts/setup` | POST | Stripe Connect onboarding |
| `/api/payouts/request` | POST | Request payout |

---

### apps/ops-admin — Operations Command Center

**Purpose:** Internal dashboard for ops team to monitor orders, approve chefs/drivers, manage deliveries, handle support exceptions, view finance.

**Route/Page Map:**

| Route | File | Notes |
|-------|------|-------|
| `/` | `app/page.tsx` | Redirect to `/dashboard` |
| `/auth/login` | `app/auth/login/page.tsx` | Ops login |
| `/dashboard` | `app/dashboard/page.tsx` | Real-time KPIs + charts |
| `/dashboard/orders` | `app/dashboard/orders/page.tsx` | All orders list |
| `/dashboard/orders/[id]` | `app/dashboard/orders/[id]/page.tsx` | Order detail + engine actions |
| `/dashboard/chefs` | `app/dashboard/chefs/page.tsx` | Chef list |
| `/dashboard/chefs/approvals` | `app/dashboard/chefs/approvals/page.tsx` | Pending chef approvals |
| `/dashboard/chefs/[id]` | `app/dashboard/chefs/[id]/page.tsx` | Chef detail |
| `/dashboard/drivers` | `app/dashboard/drivers/page.tsx` | Driver list |
| `/dashboard/drivers/[id]` | `app/dashboard/drivers/[id]/page.tsx` | Driver detail |
| `/dashboard/customers` | `app/dashboard/customers/page.tsx` | Customer list |
| `/dashboard/customers/[id]` | `app/dashboard/customers/[id]/page.tsx` | Customer detail |
| `/dashboard/deliveries` | `app/dashboard/deliveries/page.tsx` | Deliveries list |
| `/dashboard/deliveries/[id]` | `app/dashboard/deliveries/[id]/page.tsx` | Delivery detail |
| `/dashboard/support` | `app/dashboard/support/page.tsx` | Support exceptions |
| `/dashboard/finance` | `app/dashboard/finance/page.tsx` | Finance / ledger |
| `/dashboard/analytics` | `app/dashboard/analytics/page.tsx` | Analytics charts |
| `/dashboard/map` | `app/dashboard/map/page.tsx` | Live delivery map |
| `/dashboard/settings` | `app/dashboard/settings/page.tsx` | Platform settings |

**API Routes:**

| Route | Purpose |
|-------|---------|
| `/api/engine/dashboard` | Aggregated platform stats |
| `/api/engine/orders/[id]` | Engine order actions (accept, reject, etc.) |
| `/api/engine/dispatch` | Dispatch engine operations |
| `/api/engine/storefronts/[id]` | Storefront operations |
| `/api/engine/finance` | Finance operations |
| `/api/engine/refunds` | Refund processing |
| `/api/engine/exceptions` | Exception management |
| `/api/engine/exceptions/[id]` | Individual exception |
| `/api/orders`, `/api/orders/[id]` | Order CRUD |
| `/api/orders/[id]/refund` | Trigger refund |
| `/api/chefs`, `/api/chefs/[id]` | Chef management |
| `/api/drivers`, `/api/drivers/[id]` | Driver management |
| `/api/customers`, `/api/customers/[id]` | Customer management |
| `/api/deliveries`, `/api/deliveries/[id]` | Delivery management |
| `/api/support`, `/api/support/[id]` | Support tickets |

**Components:**
- `components/DashboardLayout.tsx` — Dark-themed ops sidebar layout
- `components/dashboard/real-time-stats.tsx` — Realtime Supabase subscription panel
- `components/dashboard/revenue-chart.tsx` — Revenue chart (recharts)
- `components/dashboard/orders-heatmap.tsx` — Order heatmap
- `components/dashboard/alerts-panel.tsx` — SLA alerts / pending approvals
- `components/map/live-map.tsx` — Live driver map (Leaflet)
- `components/map/delivery-map.tsx` — Individual delivery map

---

### apps/driver-app — Driver PWA

**Purpose:** Mobile-optimized PWA for drivers to manage delivery offers, track routes, update status, and view earnings.

**Route/Page Map:**

| Route | File | Notes |
|-------|------|-------|
| `/` | `app/page.tsx` | Driver home dashboard |
| `/delivery/[id]` | `app/delivery/[id]/page.tsx` | Active delivery detail + map |
| `/history` | `app/history/page.tsx` | Delivery history |
| `/earnings` | `app/earnings/page.tsx` | Earnings summary |
| `/profile` | `app/profile/page.tsx` | Driver profile |

**API Routes:**

| Route | Purpose |
|-------|---------|
| `/api/driver` | Get driver profile |
| `/api/driver/presence` | Update online/offline status |
| `/api/offers` | Get and respond to delivery offers |
| `/api/deliveries` | Get active deliveries |
| `/api/deliveries/[id]` | Delivery detail + status update |
| `/api/location` | Update GPS location (rate-limited to 5s) |
| `/api/earnings` | Earnings data |
| `/api/auth/logout` | Sign out |

**Hooks:**
- `hooks/use-location-tracker.ts` — GPS tracking hook with rate limiting and background updates

**Components:**
- `app/components/DriverDashboard.tsx` — Driver home with offer cards
- `app/delivery/[id]/components/DeliveryDetail.tsx` — Active delivery flow
- `app/history/components/HistoryView.tsx` — Delivery history list
- `app/earnings/components/EarningsView.tsx` — Earnings breakdown
- `app/profile/components/ProfileView.tsx` — Profile management
- `components/map/route-map.tsx` — Route map (Leaflet)

---

### packages/db — Database Layer

**Purpose:** All Supabase client creation and repository functions. Apps import from here — never access Supabase directly.

**Structure:**
```
packages/db/src/
├── client/
│   ├── browser.ts        # createBrowserClient() — singleton, SSR-safe
│   ├── server.ts         # createServerClient(cookieStore) — for SSR/API routes
│   ├── admin.ts          # createAdminClient() — bypasses RLS, server only
│   └── types.ts          # SupabaseClient duck type (flexible, uses any)
├── generated/
│   └── database.types.ts  # Auto-generated Supabase types (36 tables)
└── repositories/
    ├── chef.repository.ts          # chef_profiles CRUD
    ├── storefront.repository.ts    # chef_storefronts CRUD
    ├── menu.repository.ts          # menu_categories, menu_items CRUD
    ├── customer.repository.ts      # customers CRUD
    ├── order.repository.ts         # orders, order_items CRUD
    ├── driver.repository.ts        # drivers CRUD
    ├── driver-presence.repository.ts # driver_presence upsert/query
    ├── delivery.repository.ts      # deliveries + tracking events
    ├── support.repository.ts       # support_tickets CRUD
    ├── cart.repository.ts          # carts, cart_items CRUD
    ├── address.repository.ts       # customer_addresses CRUD
    └── promo.repository.ts         # promo_codes CRUD
```

**Key note:** `createAdminClient()` is a singleton — one shared instance per process. Same for `createBrowserClient()`.

---

### packages/engine — Central Business Logic

**Purpose:** Orchestrates all business operations. Apps never write business logic directly — they call the engine.

**Structure:**
```
packages/engine/src/
├── core/
│   ├── engine.factory.ts    # createCentralEngine() — assembles all services
│   ├── event-emitter.ts     # DomainEventEmitter — queues and flushes domain events
│   ├── audit-logger.ts      # AuditLogger — writes to audit_logs table
│   └── sla-manager.ts       # SLAManager — tracks SLA timers, emits warnings/breaches
├── orchestrators/
│   ├── order.orchestrator.ts    # Full order lifecycle (create→complete→refund)
│   ├── kitchen.engine.ts        # Chef acceptance, rejection, prep tracking
│   ├── dispatch.engine.ts       # Driver assignment, offer management
│   ├── commerce.engine.ts       # Ledger entries, payouts, refunds
│   └── support.engine.ts        # Exceptions, escalations, resolution
└── services/ (legacy)
    ├── orders.service.ts
    ├── chefs.service.ts
    ├── customers.service.ts
    ├── permissions.service.ts
    ├── storage.service.ts
    └── dispatch.service.ts
```

**⚠️ Engine Singleton Risk:** Each app's `lib/engine.ts` implements `getEngine()` as a module-level singleton. In Next.js, this creates one engine instance that is shared across all server requests in the same process. Since `createAdminClient()` is also a singleton, all requests share one Supabase connection pool — this is intentional for the admin client but the engine's internal state (pending domain events in `DomainEventEmitter.pendingEvents[]`) can leak between requests if `flush()` is never called.

---

### packages/types — Shared Types

- `domains/`: chef, customer, order, driver, delivery, platform interfaces
- `enums.ts`: OrderStatus, DeliveryStatus, ChefStatus, DriverStatus, etc.
- `engine/index.ts`: ActorContext, ActorRole, EngineOrderStatus, OperationResult, DomainEvent, etc.
- `engine/transitions.ts`: ORDER_TRANSITIONS matrix, SLA_DURATIONS, isValidTransition, getAllowedActions

---

### packages/auth — Authentication

- `hooks/use-auth.ts`: `useAuth()` — signIn, signUp, signOut, resetPassword via browser client
- `hooks/use-user.ts`: `useUser()` — access current user
- `components/auth-provider.tsx`: `AuthProvider` + `useAuthContext()` — session state for React tree
- `utils/roles.ts`: Role-check utilities

---

### packages/ui — Shared Components

Exports: `Button`, `Input`, `Card`, `Badge`, `Spinner`, `Avatar`, `EmptyState`, `ErrorState`, `Modal`

`Badge` variants: `default`, `primary`, `success`, `warning`, `error`, `info`

Pre-built composites: `OrderStatusBadge`, `DeliveryStatusBadge`, `NoOrdersEmpty`, `NoMenuItemsEmpty`, `NoResultsEmpty`

---

### packages/validation — Zod Schemas

Schemas for: auth (login, signup), order (create, update status, refund, promo), menu (create, update), storefront, address, driver (location update), support, profile

---

### packages/config — Shared Configs

Exports:
- `./eslint` → `eslint.config.js` (flat config with TypeScript + React rules)
- `./typescript` → `tsconfig.json`
- `./tailwind` → `tailwind.config.ts`

**⚠️ Problem:** None of the apps reference `@ridendine/config/eslint` in any config file. The `eslint.config.js` exists in `packages/config/` but is orphaned — apps have no `.eslintrc.*` or `eslint.config.js` files.

---

### packages/notifications — Notification Templates

Templates for email/push notifications. Not currently wired to any actual sending service (Resend is commented out in `.env.example`).

---

### supabase/ — Database Migrations

| Migration | Description |
|-----------|-------------|
| `00001_initial_schema.sql` | Core tables: chef_profiles, chef_storefronts, chef_kitchens, menu_categories, menu_items, customers, customer_addresses, orders, order_items, drivers, deliveries, carts, cart_items, reviews, notifications |
| `00002_rls_policies.sql` | Initial RLS policies |
| `00003_fix_rls.sql` | Fix RLS edge cases |
| `00004_additions.sql` | promo_codes, support_tickets, platform_users, payout_runs, ledger_entries |
| `00005_anon_read_policies.sql` | Allow anon reads of storefronts/menus |
| `00006_fix_order_items.sql` | Order items RLS fix |
| `00007_central_engine_tables.sql` | audit_logs, domain_events, sla_timers, order_exceptions, system_alerts, ops_override_logs, driver_presence, driver_locations, kitchen_queue, delivery_tracking_events, assignment_attempts |
| `00008_engine_rpc_functions.sql` | RPC functions (increment_promo_usage, etc.) |

**Loose SQL files (not migrations):** `fix_permissions.sql`, `make_userid_nullable.sql` — changes applied outside the migration chain.

---

## Architecture Summary

### Frontend
Next.js 14 App Router across all 4 apps. Server Components used for data fetching in most pages. Client Components used where interactivity requires state (checkout, tracking, dashboards). `dynamic = 'force-dynamic'` used liberally to disable static generation.

### Backend
All business logic lives in `@ridendine/engine`. Apps expose Next.js API Routes that authenticate the caller, resolve their actor context, then delegate to the engine. The engine uses an admin Supabase client that bypasses RLS.

### Data
Supabase PostgreSQL. 8 migrations creating 36+ tables. RLS policies exist. Repositories in `@ridendine/db` provide type-safe access. Domain events stored in `domain_events` table and broadcast via Supabase Realtime channels.

### Auth
Supabase Auth. Middleware in each app reads the session cookie and redirects unauthenticated users. `AuthProvider` and `useAuthContext()` for client-side session state. Actor context (role + entity ID) resolved on each API request from the session's `user_id`.

### Deployment
One Vercel deployment per app. Each app has its own `vercel.json` with `pnpm turbo build --filter=<app>`. The root `vercel.json` builds `ops-admin` specifically. **All 4 vercel.json files hardcode `BYPASS_AUTH=true`**.

---

## Error List

### 🔴 CRITICAL Issues

---

**Issue 1**
- **Severity:** Critical
- **Category:** Security
- **File:** `apps/web/vercel.json`, `apps/chef-admin/vercel.json`, `apps/ops-admin/vercel.json`, `apps/driver-app/vercel.json`
- **Problem:** All four `vercel.json` files contain `"BYPASS_AUTH": "true"`. Combined with all four `middleware.ts` files checking `process.env.BYPASS_AUTH === 'true'`, **all apps deploy to production with authentication completely bypassed**. Any user can access any chef's dashboard, any driver's dashboard, the ops admin, and all protected customer pages without logging in.
- **Likely Cause:** Set during initial development and never removed before deployment.
- **Fix Direction:** Remove the `env.BYPASS_AUTH` block from all `vercel.json` files. Ensure real Supabase credentials are configured as environment variables in Vercel.

---

**Issue 2**
- **Severity:** Critical
- **Category:** Runtime bug — data integrity
- **File:** `apps/web/src/app/api/checkout/route.ts:191`
- **Problem:** `await clearCart(adminClient as any, customerContext.customerId)` — `clearCart()` expects a `cartId` (filters `cart_items.cart_id`), but is called with the customer's profile ID. Cart is never cleared after successful purchase. Customers can reorder from a "cleared" cart.
- **Likely Cause:** Incorrect argument passed — the cart object (`cart` variable, line 43) has an `.id` field that is the correct cart ID.
- **Fix Direction:** Replace `customerContext.customerId` with `cart.id` (the cart retrieved via `getCartWithItems` earlier in the function).

---

**Issue 3**
- **Severity:** Critical
- **Category:** Runtime bug — wrong data display
- **File:** `apps/web/src/app/orders/[id]/confirmation/page.tsx:86`
- **Problem:** `${(order.total / 100).toFixed(2)}` — `order.total` is stored in dollars by the engine, not cents. This displays amounts 100× too small (e.g., a $25 order shows as $0.25).
- **Likely Cause:** Inconsistency with how Stripe uses cents — the developer applied the cents-to-dollars conversion incorrectly to a field that is already in dollars.
- **Fix Direction:** Change to `${Number(order.total).toFixed(2)}` (matching the `order-confirmation/[orderId]/page.tsx` pattern which is correct).

---

**Issue 4**
- **Severity:** Critical
- **Category:** UX / broken route
- **File:** `apps/web/src/app/orders/[id]/confirmation/page.tsx:105-106`
- **Problem:** "Track Order" button links to `/orders/${order.id}` but `apps/web/src/app/orders/[id]/page.tsx` does not exist. The link goes to a Next.js 404.
- **Likely Cause:** The tracking page was built at `/order-confirmation/[orderId]` but the confirmation page links to a non-existent `/orders/[id]` route.
- **Fix Direction:** Either create `apps/web/src/app/orders/[id]/page.tsx` (redirect to `/order-confirmation/[orderId]`), or change the link to `/order-confirmation/${order.id}`.

---

**Issue 5**
- **Severity:** Critical
- **Category:** UX / broken route
- **File:** `apps/web/src/app/account/orders/page.tsx:167`
- **Problem:** "View Details" button links to `/account/orders/${order.id}` but `apps/web/src/app/account/orders/[id]/page.tsx` does not exist. Clicking "View Details" on any order goes to a 404.
- **Likely Cause:** The page was never created.
- **Fix Direction:** Create `apps/web/src/app/account/orders/[id]/page.tsx` showing order detail, or change the link to `/order-confirmation/${order.id}`.

---

### 🟠 HIGH Severity Issues

---

**Issue 6**
- **Severity:** High
- **Category:** Build / ESLint configuration missing
- **File:** All `apps/*/package.json` — no `.eslintrc.*` or `eslint.config.js` in any app directory
- **Problem:** `next lint` (used in all app `lint` scripts) prompts interactively for ESLint configuration if no config file is found. Running `pnpm lint` in CI hangs/fails. The config exists in `packages/config/eslint.config.js` but no app references it.
- **Likely Cause:** The shared config was created but the apps were never wired up to use it.
- **Fix Direction:** Add `eslint.config.js` to each app that extends `@ridendine/config/eslint`, or add `.eslintrc.json` with `{ "extends": "next/core-web-vitals" }` as a minimum.

---

**Issue 7**
- **Severity:** High
- **Category:** Tests / missing infrastructure
- **File:** `apps/ops-admin/package.json` (has jest deps), `apps/web/__tests__/` (has test files)
- **Problem:** `apps/ops-admin` declares `jest`, `@testing-library/react`, etc. as devDependencies and has `test`/`test:watch`/`test:coverage` scripts, but there is no `jest.config.js`. Running `pnpm test` in `ops-admin` will fail immediately. `apps/web` has `__tests__/auth/auth-layout.test.tsx` but has no jest devDependencies and no jest config — tests cannot run.
- **Fix Direction:** Add `jest.config.ts` (or `jest.config.js`) to `apps/ops-admin`. Add jest devDependencies to `apps/web/package.json` and add a jest config file.

---

**Issue 8**
- **Severity:** High
- **Category:** Architecture — duplicate pages
- **File:** `apps/web/src/app/order-confirmation/[orderId]/page.tsx` vs `apps/web/src/app/orders/[id]/confirmation/page.tsx`
- **Problem:** There are two separate order confirmation pages with different behavior. The checkout flow (`/api/checkout`) redirects to `/order-confirmation/[orderId]` (client-side, real-time, Leaflet map). The simple static page at `/orders/[id]/confirmation` has the `/100` bug and links to a 404. Two pages, one more correct than the other, serving the same conceptual purpose.
- **Fix Direction:** Consolidate to one confirmation/tracking page. Remove or redirect the `/orders/[id]/confirmation` page, fix its bugs, or make it the canonical destination.

---

**Issue 9**
- **Severity:** High
- **Category:** Security — no role-based guards on ops-admin API routes
- **File:** `apps/ops-admin/src/app/api/engine/**`, `apps/ops-admin/src/lib/engine.ts`
- **Problem:** `getOpsActorContext()` verifies the user is in `platform_users` table, but individual API routes don't verify `hasRequiredRole()` before executing. Any authenticated ops user can call finance routes, process refunds, or approve/reject chefs regardless of their assigned role.
- **Likely Cause:** Role checking function exists (`hasRequiredRole`) but is not called in the route handlers.
- **Fix Direction:** Add role checks at the start of each sensitive API route handler.

---

**Issue 10**
- **Severity:** High
- **Category:** Runtime — middleware auto-bypass in development
- **File:** All 4 `src/middleware.ts` files
- **Problem:** `const bypassAuth = process.env.BYPASS_AUTH === 'true' || process.env.NODE_ENV === 'development'` — In development mode (`NODE_ENV=development`), auth is completely bypassed regardless of `BYPASS_AUTH` setting. Developers never test auth flows locally.
- **Fix Direction:** Remove `|| process.env.NODE_ENV === 'development'` from the bypass condition. Use only `BYPASS_AUTH=true` explicitly when needed.

---

**Issue 11**
- **Severity:** High
- **Category:** Architecture — engine singleton leaks pending events
- **File:** `apps/*/src/lib/engine.ts` and `packages/engine/src/core/event-emitter.ts`
- **Problem:** The `engineInstance` is a module-level singleton shared across all requests in the same Next.js worker process. `DomainEventEmitter` stores `pendingEvents[]` in memory. If `flush()` is not called after emitting events (possible in error paths), events accumulate across different requests and may be flushed with the wrong context.
- **Fix Direction:** Call `engine.events.flush()` in finally blocks or create a per-request engine instance for critical operations. Consider resetting the engine on each request.

---

**Issue 12**
- **Severity:** High
- **Category:** UX — dead button
- **File:** `apps/web/src/app/checkout/page.tsx:329`
- **Problem:** `<Button variant="secondary">Apply</Button>` in the Promo Code section has no `onClick` handler. The promo code field updates state but the Apply button does nothing — promo codes cannot be applied.
- **Likely Cause:** The UI was built but the apply handler was not implemented.
- **Fix Direction:** Add an `onClick` handler that calls the checkout API's promo validation, or handle promo application inline in the checkout submission flow.

---

### 🟡 MEDIUM Severity Issues

---

**Issue 13**
- **Severity:** Medium
- **Category:** Type mismatch — PlatformUser
- **File:** `packages/types/src/domains/platform.ts:11` vs `apps/ops-admin/src/lib/engine.ts:52-57`
- **Problem:** `PlatformUser.role` in types is `'ops_admin' | 'super_admin' | 'support'`. But `getOpsActorContext()` maps roles `'ops_agent'`, `'ops_manager'`, `'finance_admin'`, `'super_admin'` from the database. The type does not match the actual database values.
- **Fix Direction:** Update `PlatformUser` type to match actual database enum values used in migrations and the ops engine.

---

**Issue 14**
- **Severity:** Medium
- **Category:** Runtime — storefront query selects inactive storefronts
- **File:** `apps/web/src/components/chefs/chefs-list.tsx:12`
- **Problem:** The chefs list uses the server-side Supabase `anon` client (from cookies) which only has RLS-granted access. `getActiveStorefronts` adds `.eq('is_active', true)` filter, so this is safe. However, `getStorefrontBySlug` also filters by `is_active`, but if a chef's storefront is paused/suspended, the slug page will 404 with no explanation to the customer.
- **Fix Direction:** Add a user-friendly "currently unavailable" message when a storefront is found but inactive.

---

**Issue 15**
- **Severity:** Medium
- **Category:** Runtime — order confirmation queries data without auth check
- **File:** `apps/web/src/app/order-confirmation/[orderId]/page.tsx:107`
- **Problem:** Uses `createBrowserClient()` to query orders directly from the client. RLS is the only protection. If RLS is misconfigured or the user's session has expired, any orderId can potentially be accessed.
- **Fix Direction:** Add an auth check before querying, or use an API route to proxy the query with server-side auth validation.

---

**Issue 16**
- **Severity:** Medium
- **Category:** Runtime — hydration risk
- **File:** `apps/web/src/app/order-confirmation/[orderId]/page.tsx:94`
- **Problem:** `const supabase = useMemo(() => createBrowserClient(), [])` — `createBrowserClient()` returns `null` if environment variables are missing or when rendered server-side. The component guards against `null` but the `useMemo` hook recreates the same singleton on every render in development (React StrictMode double invocation).
- **Fix Direction:** Minor — consider initializing the client in `useEffect` or using a stable ref.

---

**Issue 17**
- **Severity:** Medium
- **Category:** Architecture — notifications package is not wired
- **File:** `packages/notifications/`
- **Problem:** The notifications package exists with templates but no Resend integration is active. Notification inserts to the `notifications` table happen in a few places (e.g., refund webhook), but there's no email/push sending. `RESEND_API_KEY` is commented out in `.env.example`.
- **Fix Direction:** Wire up Resend or a push provider in the notifications package. Connect it to the domain event system.

---

**Issue 18**
- **Severity:** Medium
- **Category:** Architecture — missing turbo `test` pipeline
- **File:** `turbo.json`
- **Problem:** The `turbo.json` only defines `build`, `dev`, `lint`, `typecheck` tasks. There's no `test` task. Running `pnpm test` from root does not work. The `@ridendine/engine` has `vitest` configured; `apps/ops-admin` has jest configured. Neither runs in the turbo pipeline.
- **Fix Direction:** Add a `test` task to `turbo.json` similar to `typecheck`.

---

**Issue 19**
- **Severity:** Medium
- **Category:** Build — Stripe API version may mismatch
- **File:** `apps/web/src/app/api/checkout/route.ts:22`, `apps/web/src/app/api/webhooks/stripe/route.ts:17`
- **Problem:** `apiVersion: '2026-02-25.clover'` is a very recent/preview Stripe API version. The installed `stripe` package is `^20.4.1`. If the installed version doesn't support this API version, Stripe calls will fail or type errors will appear.
- **Fix Direction:** Pin to a stable, widely-supported Stripe API version (e.g., `'2024-12-18.acacia'`) or ensure `stripe@20.x` supports `2026-02-25.clover`.

---

**Issue 20**
- **Severity:** Medium
- **Category:** Runtime — in-memory rate limiter resets on every serverless cold start
- **File:** `apps/driver-app/src/app/api/location/route.ts:22`
- **Problem:** `const locationUpdateTimestamps = new Map<string, number>()` — in-memory rate limiting is per-process. In a serverless (Vercel) deployment, each invocation may be a new process. The 5-second rate limit is effectively bypassed.
- **Fix Direction:** Use Redis or Supabase (with a driver_presence `last_location_at` column that already exists) to enforce rate limiting durably.

---

**Issue 21**
- **Severity:** Medium
- **Category:** UX — no feedback when a driver is not logged in
- **File:** `apps/driver-app/src/app/page.tsx:14`
- **Problem:** When no user is found, the page renders an inline "Please sign in" message with no link to the login page. The driver has no way to navigate to sign in.
- **Fix Direction:** Add a link to `/auth/login` on the "Please sign in" message, or redirect with `redirect('/auth/login')`.

---

**Issue 22**
- **Severity:** Medium
- **Category:** Architecture — unused `@ridendine/engine` legacy services
- **File:** `packages/engine/src/services/`
- **Problem:** The engine has a `services/` directory marked as "Legacy services (for backwards compatibility)" that is fully exported from `engine/src/index.ts`. This creates confusion about whether to use orchestrators or legacy services, and bloats the public API surface.
- **Fix Direction:** Audit which apps/routes use legacy services vs orchestrators. If all consumers use orchestrators, deprecate and remove the legacy services.

---

**Issue 23**
- **Severity:** Medium
- **Category:** Database — loose SQL files not in migrations
- **File:** `supabase/fix_permissions.sql`, `supabase/make_userid_nullable.sql`
- **Problem:** These SQL files exist outside the `migrations/` directory. They cannot be applied via `supabase db push` or tracked in migration history. If a new developer runs `supabase db reset`, these changes will not be applied.
- **Fix Direction:** Create new migrations (`00009_fix_permissions.sql`, `00010_userid_nullable.sql`) with this SQL and delete the loose files.

---

**Issue 24**
- **Severity:** Medium
- **Category:** UX — analytics pages use mock/hardcoded data
- **File:** `apps/chef-admin/src/app/dashboard/analytics/page.tsx`, `apps/ops-admin/src/app/dashboard/analytics/page.tsx`
- **Problem:** Analytics pages likely contain hardcoded or placeholder chart data rather than real database queries. (Pattern consistent with the ops dashboard's `avgDeliveryTime: 25` hardcode in `getDashboardStats()`.)
- **Fix Direction:** Wire analytics to real aggregate queries from Supabase.

---

### 🔵 LOW Severity Issues

---

**Issue 25**
- **Severity:** Low
- **Category:** Runtime — `SupabaseClient` type uses excessive `any`
- **File:** `packages/db/src/client/types.ts`
- **Problem:** `SupabaseClient` is defined as `{ from: (table: string) => any; auth: any; rpc: (fn: string, params?: any) => any }` — extremely permissive. Repository functions don't get type checking on table names, column names, or return types. Errors in table names would only surface at runtime.
- **Fix Direction:** Use the typed `SupabaseClient<Database>` from `@supabase/supabase-js` in repositories.

---

**Issue 26**
- **Severity:** Low
- **Category:** Architecture — `adminClient` singleton can silently fail
- **File:** `packages/db/src/client/admin.ts`
- **Problem:** `adminClient` is a module-level singleton. Once created successfully, it's reused even if env vars later become unavailable (impossible in practice but conceptually fragile). More importantly, the same singleton is shared by every engine instance in the process.
- **Fix Direction:** Document clearly that this is intentional. No immediate code change required, but ensure SUPABASE_SERVICE_ROLE_KEY is always set.

---

**Issue 27**
- **Severity:** Low
- **Category:** UX — home page has hardcoded stats
- **File:** `apps/web/src/app/page.tsx:68-78`
- **Problem:** The hero section shows "3 Local Chefs", "15+ Unique Dishes" — hardcoded values. These will become stale as the platform grows.
- **Fix Direction:** Fetch real counts from Supabase (chef_storefronts count, menu_items count).

---

**Issue 28**
- **Severity:** Low
- **Category:** UX — checkout shows incorrect fee estimate before API call
- **File:** `apps/web/src/app/checkout/page.tsx:205-212`
- **Problem:** Before the `/api/checkout` call, the sidebar shows an estimated fee breakdown using client-side calculations (`subtotal * 0.08` for service fee, `* 0.13` for tax). These may differ from the engine's calculations.
- **Fix Direction:** Show a "Calculating..." state or clearly label these as estimates before the API call is made.

---

**Issue 29**
- **Severity:** Low
- **Category:** Missing env var documentation
- **File:** `.env.example`
- **Problem:** The `NEXT_PUBLIC_CHEF_ADMIN_URL`, `NEXT_PUBLIC_OPS_ADMIN_URL`, `NEXT_PUBLIC_DRIVER_APP_URL` variables are listed but never referenced in app code (no `process.env.NEXT_PUBLIC_CHEF_ADMIN_URL` usage found). The `turbo.json` `env` array is missing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_CHEF_ADMIN_URL`, `NEXT_PUBLIC_OPS_ADMIN_URL`, `NEXT_PUBLIC_DRIVER_APP_URL`, and `BYPASS_AUTH`.
- **Fix Direction:** Add all used `NEXT_PUBLIC_*` vars to `turbo.json`'s `env` array to ensure Turbo cache is invalidated when they change.

---

**Issue 30**
- **Severity:** Low
- **Category:** Deployment — root `vercel.json` builds `ops-admin` only
- **File:** `vercel.json` (root)
- **Problem:** The root `vercel.json` sets `buildCommand: "pnpm turbo build --filter=@ridendine/ops-admin"`. This means if you trigger a deployment from the repo root (not from an app directory), only `ops-admin` is built. Other apps require deploying from their own directories.
- **Fix Direction:** Document the deployment strategy (one project per app on Vercel) or remove the root `vercel.json`.

---

## Duplicate / Dead / Drifted Code

### Duplicate Systems

| System | Location | Notes |
|--------|----------|-------|
| Order confirmation pages | `app/order-confirmation/[orderId]/` + `app/orders/[id]/confirmation/` | Two pages for same purpose; checkout links to the first, confirmation page links to a 404 |
| Auth flows | Each app has its own login/signup pages with near-identical code | Some duplication acceptable given separate apps, but auth logic in `@ridendine/auth` is shared |
| Engine singleton | `apps/*/src/lib/engine.ts` — identical `getEngine()` pattern in all 4 apps | Could be extracted to `@ridendine/engine` itself |

### Dead / Unused Code

| Item | File | Notes |
|------|------|-------|
| Legacy services in engine | `packages/engine/src/services/` | Marked "legacy", unclear if anything still uses them |
| `NEXT_PUBLIC_CHEF_ADMIN_URL` etc. | `.env.example` | Declared but never referenced in app code |
| `fix_permissions.sql` / `make_userid_nullable.sql` | `supabase/` | Applied manually outside migration chain, should be cleaned up |
| `@ridendine/notifications` | `packages/notifications/` | Package exists but is never imported by any app |
| `turbo.json` `test` task | Missing | Tests exist but no turbo pipeline to run them |

### Partial Migrations

| Feature | Status |
|---------|--------|
| Notifications | Tables + inserts exist; no email/push sending |
| Driver tracking | GPS ingestion works; no live map wiring from driver to customer in real time (Leaflet map exists but relies on polling) |
| Payout system | Ledger entries created; no actual Stripe Transfer/Connect payout implementation |
| Reviews | `reviews` table in schema; no review submission flow visible in web app |
| Push notification subscribe | `app/api/notifications/subscribe/route.ts` exists; no frontend subscription UI |

---

## Missing Pieces

### Missing Routes / Pages

| Missing | Needed By | Priority |
|---------|-----------|----------|
| `apps/web/src/app/orders/[id]/page.tsx` | "Track Order" button in confirmation page | **Critical** |
| `apps/web/src/app/account/orders/[id]/page.tsx` | "View Details" in order history | **Critical** |

### Missing Backend Wiring

| Feature | Status |
|---------|--------|
| Stripe Connect payout transfers | Payout request API exists but no Stripe Transfer API call |
| Email notifications via Resend | `@ridendine/notifications` package has no sender |
| Push notifications | Subscribe endpoint exists but no web push sending |
| Review submission | No `/api/reviews` route in web app |
| Cart clearing on checkout | Bug — wrong argument passes, cart never clears |

### Missing Configuration

| Item | Location | Impact |
|------|----------|--------|
| ESLint config | All 4 apps | `next lint` fails in CI |
| `jest.config.js` | `apps/ops-admin`, `apps/web` | `pnpm test` fails immediately |
| `test` pipeline in turbo | `turbo.json` | Tests not run in CI |
| Supabase env vars in Vercel | All deployments | Can't work in production |
| `turbo.json` env array | `turbo.json` | Missing `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` etc. |

### Missing Validation

| Location | Issue |
|----------|-------|
| Ops admin API routes | No role-based access check after authentication |
| Checkout promo code | Apply button has no handler — promo code is never actually applied |
| Checkout address selection | No validation that selected address belongs to current user |

### Missing Deployment Pieces

| Item | Notes |
|------|-------|
| Stripe webhooks endpoint registered | Must be registered in Stripe dashboard pointing to deployed URL |
| Supabase RLS policies for `platform_users` | No RLS on this table confirmed in migration |
| Supabase Realtime enabled for tables | Must enable in Supabase dashboard for `orders`, `deliveries`, `driver_presence` |
| `SUPABASE_SERVICE_ROLE_KEY` | Never set in Vercel — ops admin uses admin client |

---

## Top Priority Problems

| # | Severity | Problem | File |
|---|----------|---------|------|
| 1 | 🔴 Critical | `BYPASS_AUTH=true` in all 4 `vercel.json` — entire platform deploys unauthenticated | All `vercel.json` |
| 2 | 🔴 Critical | `clearCart()` called with customer ID instead of cart ID — cart never clears after purchase | `apps/web/src/app/api/checkout/route.ts:191` |
| 3 | 🔴 Critical | `order.total / 100` — order amounts shown 100× too small in server confirmation page | `apps/web/src/app/orders/[id]/confirmation/page.tsx:86` |
| 4 | 🔴 Critical | Missing `orders/[id]/page.tsx` — "Track Order" button leads to 404 | Route gap |
| 5 | 🔴 Critical | Missing `account/orders/[id]/page.tsx` — "View Details" links go to 404 | Route gap |
| 6 | 🟠 High | No ESLint config in any app — `pnpm lint` fails in CI | All apps |
| 7 | 🟠 High | No `jest.config.js` in ops-admin or web — test scripts cannot run | `apps/ops-admin`, `apps/web` |
| 8 | 🟠 High | Duplicate order confirmation pages — checkout and confirmation inconsistent | `app/order-confirmation` vs `app/orders/[id]/confirmation` |
| 9 | 🟠 High | No role-based guards on ops-admin API routes — any ops user can process refunds | `apps/ops-admin/src/app/api/engine/**` |
| 10 | 🟠 High | Auth bypassed in development mode unconditionally | All 4 `middleware.ts` |
| 11 | 🟠 High | Engine singleton shares pending domain events across requests | `apps/*/lib/engine.ts`, `packages/engine/src/core/event-emitter.ts` |
| 12 | 🟠 High | Promo code Apply button has no `onClick` handler — promo codes cannot be used | `apps/web/src/app/checkout/page.tsx:329` |
| 13 | 🟡 Medium | `PlatformUser.role` type doesn't match actual database values | `packages/types/src/domains/platform.ts` |
| 14 | 🟡 Medium | No user-facing message when storefront is paused/inactive on slug page | `apps/web/src/app/chefs/[slug]/page.tsx` |
| 15 | 🟡 Medium | `@ridendine/notifications` package completely unwired — no emails sent | `packages/notifications/` |
| 16 | 🟡 Medium | No `test` task in `turbo.json` — tests not integrated in pipeline | `turbo.json` |
| 17 | 🟡 Medium | Stripe API version `2026-02-25.clover` is very recent/preview — may not be stable | `apps/web/src/app/api/checkout/route.ts` |
| 18 | 🟡 Medium | In-memory rate limiter resets on cold start — driver location rate limit bypassed | `apps/driver-app/src/app/api/location/route.ts` |
| 19 | 🟡 Medium | Loose SQL files outside migrations — not tracked or applied via `db push` | `supabase/fix_permissions.sql`, `supabase/make_userid_nullable.sql` |
| 20 | 🟡 Medium | `avgDeliveryTime: 25` hardcoded in ops dashboard stats | `apps/ops-admin/src/app/dashboard/page.tsx:111` |
