# Ridendine — Full headless audit and production upgrade plan

**Generated:** 2026-04-30  
**Scope:** Read-only codebase audit; deliverable files live only under `AUDIT_AND_PLANNING/`.  
**Application source modified:** **No** — only this folder and diagrams were added.

## Legend

| Tag | Meaning |
|-----|---------|
| **EXISTING** | Implemented in repo; path cited |
| **PARTIAL** | Present but incomplete, inconsistent, or unverified end-to-end |
| **BROKEN** | Known runtime/build failure (none verified without execution) |
| **MISSING** | Not found in codebase |
| **MOCK/DEMO DATA** | Seed, fixture, or static demo content |
| **RECOMMENDED** | Engineering / product recommendation |
| **UNKNOWN** | Not determined from static read |

**Diagrams:** [AUDIT_AND_PLANNING/diagrams/monorepo_topology.md](diagrams/monorepo_topology.md), [order_status_flow.md](diagrams/order_status_flow.md), [checkout_payment_webhook.md](diagrams/checkout_payment_webhook.md), [auth_middleware_matrix.md](diagrams/auth_middleware_matrix.md).

---

## Part 1 — Full repository inventory

### 1.1 Root structure

| Path | Purpose | Tag |
|------|---------|-----|
| `apps/web/` | Customer marketplace Next app | EXISTING |
| `apps/chef-admin/` | Chef dashboard | EXISTING |
| `apps/ops-admin/` | Operations admin | EXISTING |
| `apps/driver-app/` | Driver PWA | EXISTING |
| `packages/db/` | Supabase clients, repos, generated types, `use-realtime` | EXISTING |
| `packages/engine/` | Central business orchestrators | EXISTING |
| `packages/auth/` | Shared auth middleware factory | EXISTING |
| `packages/ui/` | Shared UI primitives | EXISTING |
| `packages/types/`, `validation/`, `utils/`, `config/`, `notifications/` | Cross-cutting packages | EXISTING |
| `supabase/migrations/` | 14 SQL migrations | EXISTING |
| `supabase/seeds/seed.sql` | Dev seed data | MOCK/DEMO DATA |
| `docs/` | Platform docs (e.g. `DATABASE_SCHEMA.md`, `ORDER_FLOW.md`) | EXISTING |
| `.github/workflows/ci.yml` | CI pipeline | EXISTING |
| `.env.example` | Env template | EXISTING |
| `graphify-out/GRAPH_REPORT.md` | Workspace rule referenced graph | MISSING (not in repo root) |

### 1.2 Frameworks and tooling

- **Framework:** Next.js 14 App Router, React 18 — `package.json`, each `apps/*/package.json`.
- **Monorepo:** Turborepo — `turbo.json`, `package.json` scripts.
- **Package manager:** pnpm 9.15.0 — `package.json` `packageManager`.
- **Language:** TypeScript — root and package devDependencies.
- **DB:** Supabase (Postgres, RLS, Realtime client usage) — `packages/db/`, migrations.
- **Payments:** Stripe — `apps/web/package.json`, `apps/web/src/app/api/checkout/route.ts`, `apps/web/src/app/api/webhooks/stripe/route.ts`.
- **Lint/format:** ESLint, Prettier — root `package.json`.

### 1.3 Frontend routes / pages

**Count:** 66 `page.tsx` files under `apps/*/src/app/**` (glob scan 2026-04-30).

### 1.4 Backend API routes

**Count:** 73 `route.ts` files under `apps/*/src/app/api/**`.

### 1.5 Components (apps + co-located)

**Count:** 48 `*.tsx` under `apps/**/components/**` plus nested `**/app/**/components/**` (glob). Additional shared UI: `packages/ui/src/components/*.tsx` (13 files).

### 1.6 Hooks

- **EXISTING:** `packages/db/src/hooks/use-realtime.ts` — Supabase Realtime subscription.
- **EXISTING:** `apps/driver-app/src/hooks/use-location-tracker.ts`.
- **PARTIAL:** Most state in pages/contexts; no large `apps/*/src/hooks/` tree.

### 1.7 Utilities

- **EXISTING:** `packages/utils/` (includes rate limiter tests `packages/utils/src/rate-limiter.test.ts`).
- **EXISTING:** `packages/engine/src/constants.ts` and related.

### 1.8 Database / schema

- **EXISTING:** `supabase/migrations/00001_initial_schema.sql` through `00014_fix_audit_trigger.sql`.
- **EXISTING:** Table catalog narrative `docs/DATABASE_SCHEMA.md` (36 tables).
- **EXISTING:** Generated types `packages/db/src/generated/database.types.ts`.

### 1.9 Auth files

- **EXISTING:** `packages/auth/src/middleware.ts`, `packages/auth/src/middleware.test.ts`.
- **EXISTING:** Per-app `apps/*/src/middleware.ts`.
- **EXISTING:** API routes `apps/*/src/app/api/auth/*/route.ts` (web, chef-admin, driver-app).

### 1.10 Config files

- **EXISTING:** `turbo.json`, `packages/config/`, per-app `next.config.*`, `tsconfig.json`.
- **EXISTING:** `apps/*/vercel.json` (cron paths for ops processors).

### 1.11 Environment variables

- **EXISTING:** `.env.example` — Supabase, Stripe, app URLs, `ENGINE_PROCESSOR_TOKEN`, `CRON_SECRET`, optional Sentry, `BYPASS_AUTH`, feature flags.

### 1.12 Deployment

- **EXISTING:** `apps/web/vercel.json`, `apps/chef-admin/vercel.json`, `apps/ops-admin/vercel.json`, `apps/driver-app/vercel.json`.
- **MISSING:** Terraform/K8s/other non-Vercel IaC in repo (not searched beyond above).

### 1.13 Tests

- **EXISTING:** `packages/engine` Vitest suite (many `*.test.ts` under `packages/engine/src/`).
- **EXISTING:** `packages/utils` tests.
- **EXISTING:** `packages/auth/src/middleware.test.ts`.
- **EXISTING:** `apps/web/__tests__/**`, `apps/web/src/__tests__/stripe-adapter.test.ts`.
- **EXISTING:** `apps/ops-admin/src/components/__tests__/**`, `apps/ops-admin/src/app/api/analytics/trends/__tests__/route.test.ts`.
- **PARTIAL:** CI runs engine + utils tests only; full web/ops Jest not in `.github/workflows/ci.yml` matrix.

### 1.14 Static assets

- **EXISTING:** `apps/driver-app/public/sw.js`, `manifest.json`.
- **MISSING/EMPTY:** `apps/web/public/` glob returned 0 files at audit time — verify local icons/favicons may live elsewhere or MISSING.

### 1.15 Styling

- **EXISTING:** Tailwind in web app devDependencies `apps/web/package.json`; shared `@ridendine/ui` components.

### 1.16 Third-party services

- **EXISTING:** Supabase, Stripe, Resend (engine `package.json`), Sentry (`@sentry/nextjs` root `package.json`).
- **EXISTING:** Leaflet / react-leaflet (driver + ops map components); Google Maps URLs as deep links in driver delivery UI — grep `leaflet`, `google.com/maps` under `apps/`.

### 1.17 Payment libraries

- **EXISTING:** `stripe`, `@stripe/stripe-js`, `@stripe/react-stripe-js` in `apps/web/package.json`.

### 1.18 Map / location

- **EXISTING:** `apps/driver-app/src/components/map/route-map.tsx`, `apps/ops-admin/src/components/map/live-map.tsx`, `delivery-map.tsx`.
- **EXISTING:** `apps/driver-app/src/app/api/location/route.ts`.
- **PARTIAL:** `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` commented in `.env.example`.

### 1.19 Notifications

- **EXISTING:** `packages/notifications` templates package.
- **EXISTING:** Engine notification sender/tests `packages/engine/src/core/notification-sender.test.ts`, triggers.
- **EXISTING:** Web `apps/web/src/app/api/notifications/route.ts`, `notifications/subscribe/route.ts`.

### 1.20 Real-time / WebSocket / SSE / Supabase

- **EXISTING:** `packages/db/src/hooks/use-realtime.ts` — `postgres_changes` subscription.
- **EXISTING:** Ops alerts tests reference channels `apps/ops-admin/src/components/__tests__/ops-alerts.test.ts`.
- **MISSING:** Dedicated in-house WebSocket server — not found; Supabase Realtime is the path.

### 1.21 Major folders — purpose, risk, notes

| Folder | Purpose | Active | Risk | Notes |
|--------|---------|--------|------|-------|
| `packages/engine` | Order, dispatch, commerce, platform, SLA | EXISTING | MEDIUM | Complex; tests EXISTING |
| `packages/db` | All DB access boundary | EXISTING | HIGH if misused | Prefer RLS + least privilege |
| `apps/ops-admin` | Control plane + engine HTTP | EXISTING | HIGH | Broad `createAdminClient` usage |
| `apps/web` | Customer UX + checkout | EXISTING | MEDIUM | Middleware only `/account` |

---

## Part 2 — Route and page map

**Convention:** URL = path under each app’s `src/app` with `/page.tsx` removed; dynamic `[x]` preserved. Ports from `CLAUDE.md`: web 3000, chef 3001, ops 3002, driver 3003.

### 2.1 Customer web (`apps/web`)

| Route | File | User Role | Purpose | Data Source | Status | Missing Work |
|-------|------|-----------|---------|-------------|--------|--------------|
| `/` | `apps/web/src/app/page.tsx` | public | Home | Supabase storefronts / marketing | UNKNOWN | E2E verify |
| `/about` | `apps/web/src/app/about/page.tsx` | public | Marketing | STATIC/UNKNOWN | UNKNOWN | — |
| `/cart` | `apps/web/src/app/cart/page.tsx` | public/customer | Cart | `/api/cart` | PARTIAL | Auth UX if cart requires login |
| `/checkout` | `apps/web/src/app/checkout/page.tsx` | customer | Checkout Stripe | `/api/cart`, `/api/addresses`, `/api/checkout` | PARTIAL | Middleware does not guard `/checkout` — see Part 12 |
| `/chefs` | `apps/web/src/app/chefs/page.tsx` | public | List chefs | Supabase | UNKNOWN | — |
| `/chefs/[slug]` | `apps/web/src/app/chefs/[slug]/page.tsx` | public | Storefront menu | Supabase | UNKNOWN | — |
| `/chef-signup` | `apps/web/src/app/chef-signup/page.tsx` | public | Chef acquisition | UNKNOWN | UNKNOWN | Wire to chef app signup |
| `/chef-resources` | `apps/web/src/app/chef-resources/page.tsx` | public | Content | STATIC | UNKNOWN | — |
| `/how-it-works` | `apps/web/src/app/how-it-works/page.tsx` | public | Marketing | STATIC | UNKNOWN | — |
| `/contact` | `apps/web/src/app/contact/page.tsx` | public | Contact | UNKNOWN | UNKNOWN | — |
| `/terms` | `apps/web/src/app/terms/page.tsx` | public | Legal | STATIC | UNKNOWN | Legal review |
| `/privacy` | `apps/web/src/app/privacy/page.tsx` | public | Legal | STATIC | UNKNOWN | Legal review |
| `/auth/login` | `apps/web/src/app/auth/login/page.tsx` | public | Login | Supabase auth | EXISTING | — |
| `/auth/signup` | `apps/web/src/app/auth/signup/page.tsx` | public | Signup | Supabase auth | EXISTING | — |
| `/auth/forgot-password` | `apps/web/src/app/auth/forgot-password/page.tsx` | public | Password reset | Supabase | EXISTING | Tests `apps/web/__tests__/auth/forgot-password.test.tsx` |
| `/account` | `apps/web/src/app/account/page.tsx` | customer | Account hub | Supabase | EXISTING | — |
| `/account/orders` | `apps/web/src/app/account/orders/page.tsx` | customer | Order history | API/DB | UNKNOWN | — |
| `/account/addresses` | `apps/web/src/app/account/addresses/page.tsx` | customer | Addresses | `/api/addresses` | PARTIAL | — |
| `/account/favorites` | `apps/web/src/app/account/favorites/page.tsx` | customer | Favorites | `/api/favorites` | PARTIAL | — |
| `/account/settings` | `apps/web/src/app/account/settings/page.tsx` | customer | Settings | `/api/profile` | PARTIAL | — |
| `/orders/[id]/confirmation` | `apps/web/src/app/orders/[id]/confirmation/page.tsx` | customer | Post-place UI | API | UNKNOWN | — |
| `/order-confirmation/[orderId]` | `apps/web/src/app/order-confirmation/[orderId]/page.tsx` | customer | Confirmation | API | UNKNOWN | Consolidate duplicate flows RECOMMENDED |

### 2.2 Chef admin (`apps/chef-admin`)

| Route | File | User Role | Purpose | Data Source | Status | Missing Work |
|-------|------|-----------|---------|-------------|--------|--------------|
| `/` | `apps/chef-admin/src/app/page.tsx` | chef | Entry / redirect | UNKNOWN | UNKNOWN | Verify redirect |
| `/auth/login` | `apps/chef-admin/src/app/auth/login/page.tsx` | public | Chef login | Supabase | EXISTING | — |
| `/auth/signup` | `apps/chef-admin/src/app/auth/signup/page.tsx` | public | Chef signup | API `api/auth/signup` | PARTIAL | Onboarding completeness |
| `/dashboard` | `apps/chef-admin/src/app/dashboard/page.tsx` | chef | Dashboard | DB/API | UNKNOWN | — |
| `/dashboard/orders` | `apps/chef-admin/src/app/dashboard/orders/page.tsx` | chef | Orders | `api/orders` | PARTIAL | Real-time SLA |
| `/dashboard/menu` | `apps/chef-admin/src/app/dashboard/menu/page.tsx` | chef | Menu CRUD | `api/menu` | PARTIAL | — |
| `/dashboard/storefront` | `apps/chef-admin/src/app/dashboard/storefront/page.tsx` | chef | Storefront | `api/storefront` | PARTIAL | — |
| `/dashboard/settings` | `apps/chef-admin/src/app/dashboard/settings/page.tsx` | chef | Settings | `api/profile` | PARTIAL | — |
| `/dashboard/analytics` | `apps/chef-admin/src/app/dashboard/analytics/page.tsx` | chef | Analytics | DB | UNKNOWN | — |
| `/dashboard/reviews` | `apps/chef-admin/src/app/dashboard/reviews/page.tsx` | chef | Reviews | DB | UNKNOWN | — |
| `/dashboard/payouts` | `apps/chef-admin/src/app/dashboard/payouts/page.tsx` | chef | Payouts | Stripe Connect APIs | PARTIAL | Reconciliation |

### 2.3 Ops admin (`apps/ops-admin`)

| Route | File | User Role | Purpose | Data Source | Status | Missing Work |
|-------|------|-----------|---------|-------------|--------|--------------|
| `/` | `apps/ops-admin/src/app/page.tsx` | ops | Landing | UNKNOWN | UNKNOWN | — |
| `/auth/login` | `apps/ops-admin/src/app/auth/login/page.tsx` | admin | Ops login | Supabase | EXISTING | Role matrix Part 7 |
| `/dashboard` | `apps/ops-admin/src/app/dashboard/page.tsx` | admin | Home metrics | engine APIs | PARTIAL | — |
| `/dashboard/orders` | `apps/ops-admin/src/app/dashboard/orders/page.tsx` | admin | Orders | `api/orders` | PARTIAL | — |
| `/dashboard/orders/[id]` | `apps/ops-admin/src/app/dashboard/orders/[id]/page.tsx` | admin | Order detail | `api/orders/[id]` | PARTIAL | — |
| `/dashboard/deliveries` | `apps/ops-admin/src/app/dashboard/deliveries/page.tsx` | admin | Deliveries list | `apps/ops-admin/src/app/api/deliveries/route.ts` | PARTIAL | — |
| `/dashboard/deliveries/[id]` | `apps/ops-admin/src/app/dashboard/deliveries/[id]/page.tsx` | admin | Delivery detail | API | PARTIAL | — |
| `/dashboard/chefs` | `apps/ops-admin/src/app/dashboard/chefs/page.tsx` | admin | Chefs | `api/chefs` | PARTIAL | — |
| `/dashboard/chefs/[id]` | `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx` | admin | Chef detail | `api/chefs/[id]` | PARTIAL | — |
| `/dashboard/chefs/approvals` | `apps/ops-admin/src/app/dashboard/chefs/approvals/page.tsx` | admin | Approvals | engine/storefront | PARTIAL | — |
| `/dashboard/drivers` | `apps/ops-admin/src/app/dashboard/drivers/page.tsx` | admin | Drivers | `api/drivers` | PARTIAL | — |
| `/dashboard/drivers/[id]` | `apps/ops-admin/src/app/dashboard/drivers/[id]/page.tsx` | admin | Driver detail | `api/drivers/[id]` | PARTIAL | — |
| `/dashboard/customers` | `apps/ops-admin/src/app/dashboard/customers/page.tsx` | admin | Customers | `api/customers` | PARTIAL | — |
| `/dashboard/customers/[id]` | `apps/ops-admin/src/app/dashboard/customers/[id]/page.tsx` | admin | Customer detail | API | PARTIAL | — |
| `/dashboard/support` | `apps/ops-admin/src/app/dashboard/support/page.tsx` | support/admin | Tickets | `api/support` | PARTIAL | Dedicated support role |
| `/dashboard/map` | `apps/ops-admin/src/app/dashboard/map/page.tsx` | admin | Live map | Leaflet + DB | PARTIAL | Tile provider ToS |
| `/dashboard/analytics` | `apps/ops-admin/src/app/dashboard/analytics/page.tsx` | admin | Analytics | `api/analytics/trends` | PARTIAL | — |
| `/dashboard/finance` | `apps/ops-admin/src/app/dashboard/finance/page.tsx` | finance/admin | Finance | `api/engine/finance` | PARTIAL | Ledger UI depth |
| `/dashboard/promos` | `apps/ops-admin/src/app/dashboard/promos/page.tsx` | admin | Promos | `api/promos` | PARTIAL | — |
| `/dashboard/reports` | `apps/ops-admin/src/app/dashboard/reports/page.tsx` | admin | Reports | export APIs | UNKNOWN | — |
| `/dashboard/activity` | `apps/ops-admin/src/app/dashboard/activity/page.tsx` | admin | Activity | DB | UNKNOWN | — |
| `/dashboard/team` | `apps/ops-admin/src/app/dashboard/team/page.tsx` | admin | Team | `api/team` | PARTIAL | — |
| `/dashboard/settings` | `apps/ops-admin/src/app/dashboard/settings/page.tsx` | admin | Settings | engine settings | PARTIAL | — |
| `/dashboard/integrations` | `apps/ops-admin/src/app/dashboard/integrations/page.tsx` | admin | Integrations | env-driven | PARTIAL | — |
| `/dashboard/announcements` | `apps/ops-admin/src/app/dashboard/announcements/page.tsx` | admin | Comms | `api/announcements` | PARTIAL | — |
| `/dashboard/automation` | `apps/ops-admin/src/app/dashboard/automation/page.tsx` | admin | Automation | processors | PARTIAL | — |

### 2.4 Driver app (`apps/driver-app`)

| Route | File | User Role | Purpose | Data Source | Status | Missing Work |
|-------|------|-----------|---------|-------------|--------|--------------|
| `/` | `apps/driver-app/src/app/page.tsx` | driver | Home / offers | deliveries/offers API | PARTIAL | Background location policy |
| `/auth/login` | `apps/driver-app/src/app/auth/login/page.tsx` | public | Login | Supabase | EXISTING | — |
| `/auth/signup` | `apps/driver-app/src/app/auth/signup/page.tsx` | public | Signup | API | PARTIAL | — |
| `/delivery/[id]` | `apps/driver-app/src/app/delivery/[id]/page.tsx` | driver | Active delivery | `api/deliveries/[id]` | PARTIAL | Proof photos compliance |
| `/profile` | `apps/driver-app/src/app/profile/page.tsx` | driver | Profile | API | PARTIAL | — |
| `/history` | `apps/driver-app/src/app/history/page.tsx` | driver | History | UI + API | UNKNOWN | — |
| `/earnings` | `apps/driver-app/src/app/earnings/page.tsx` | driver | Earnings | `api/earnings` | PARTIAL | Payout parity with chef |

---

## Part 3 — Component map (important)

| File | Renders | Props/State | Parent usage | API / data | Tag | Recommendation |
|------|---------|-------------|--------------|------------|-----|----------------|
| `apps/web/src/components/checkout/stripe-payment-form.tsx` | Stripe Elements payment | client | `checkout/page.tsx` | Stripe | EXISTING | KEEP |
| `apps/web/src/components/tracking/live-order-tracker.tsx` | Order tracking UI | hooks | order pages | Realtime/API | PARTIAL | KEEP; verify subscriptions |
| `apps/web/src/components/tracking/order-tracking-map.tsx` | Map snippet | UNKNOWN | tracker | Maps | PARTIAL | KEEP |
| `apps/web/src/components/chefs/chefs-list.tsx` | Chef cards | props | `/chefs` | DB | UNKNOWN | KEEP |
| `apps/web/src/components/storefront/storefront-menu.tsx` | Menu | props | `/chefs/[slug]` | DB | UNKNOWN | KEEP |
| `apps/web/src/components/auth/password-strength.tsx` | Meter | props | auth pages | local | EXISTING | MERGE with `@ridendine/ui` / chef duplicate |
| `apps/chef-admin/src/components/auth/password-strength.tsx` | Duplicate pattern | props | chef auth | local | EXISTING | MERGE |
| `packages/ui/src/components/password-strength.tsx` | Shared primitive | props | — | local | EXISTING | REPLACE app copies |
| `apps/ops-admin/src/components/ops-alerts.tsx` | Ops alerts | realtime | dashboard | Supabase channel | PARTIAL | KEEP |
| `apps/ops-admin/src/components/map/live-map.tsx` | Leaflet map | client | `/dashboard/map` | DB | PARTIAL | KEEP |
| `apps/driver-app/src/components/map/route-map.tsx` | Route map | dynamic import | delivery | GPS | PARTIAL | KEEP |
| `apps/driver-app/src/components/sw-register.tsx` | PWA SW | effect | layout? | sw.js | EXISTING | KEEP |

**Business logic in UI:** **PARTIAL** — Checkout page orchestrates fetch sequence `apps/web/src/app/checkout/page.tsx` (lines with `fetch('/api/cart` etc.)); heavy logic should stay in engine/API RECOMMENDED.

**Mobile:** Driver app is PWA-oriented (`apps/driver-app/public/manifest.json`, `sw.js`); web responsive **UNKNOWN** without device QA.

---

## Part 4 — Data flow map (23 flows)

For each: **Files / APIs / Tables / Gaps** (abbreviated; engine entry `packages/engine/src/index.ts`).

1. **Customer signup/login** — EXISTING: `apps/web/src/app/api/auth/signup/route.ts`, `login/route.ts`, pages `apps/web/src/app/auth/*`. Tables: `auth.users`, `customers`. **MISSING:** UNKNOWN email verification UX depth.
2. **Chef signup/login** — EXISTING: chef-admin auth routes + `chef_profiles`. **PARTIAL:** Approval workflow ops + `chef_profiles.status`.
3. **Driver signup/login** — EXISTING: `apps/driver-app/src/app/api/auth/*`, `drivers` table.
4. **Admin login** — EXISTING: `apps/ops-admin/src/app/auth/login/page.tsx`, `platform_users`.
5. **Browse kitchens** — EXISTING: web `/chefs`, repositories `packages/db/src/repositories/storefront.repository.ts` (verify), RLS `supabase/migrations/*_rls*`.
6. **View menu** — EXISTING: `menu_categories`, `menu_items`; page `apps/web/src/app/chefs/[slug]/page.tsx`.
7. **Add to cart** — EXISTING: `apps/web/src/app/api/cart/route.ts`, tables `carts`, `cart_items`.
8. **Checkout** — EXISTING: checkout API + page. **PARTIAL:** pricing vs `docs/DATABASE_SCHEMA.md` fee table.
9. **Payment** — EXISTING: Stripe PI + webhook. **PARTIAL:** API version inconsistency (Part 11).
10. **Order creation** — EXISTING: via checkout + engine; `orders`, `order_items`.
11. **Chef receives order** — EXISTING: chef `api/orders`, notifications PARTIAL.
12. **Chef accept/reject** — EXISTING: engine + `apps/chef-admin/src/app/api/orders/[id]/route.ts` PATCH — verify states in `order-state-machine.ts`.
13. **Driver assignment** — EXISTING: `apps/ops-admin/src/app/api/engine/dispatch/route.ts`, `delivery_assignments`.
14. **Driver pickup** — EXISTING: `apps/driver-app/src/app/api/deliveries/[id]/route.ts` PATCH; delivery tables.
15. **Delivery tracking** — PARTIAL: `delivery_tracking_events`, web tracker components.
16. **Customer order status** — PARTIAL: `apps/web/src/app/api/orders/[id]/route.ts`, realtime hook.
17. **Refund/cancellation** — EXISTING: ops `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts`, `api/engine/refunds/route.ts`. **PARTIAL:** Stripe + ledger sync.
18. **Admin override** — EXISTING: engine `api/engine/orders/[id]`, exceptions `api/engine/exceptions*`.
19. **Menu update** — EXISTING: chef `api/menu`, `api/menu/[id]`, categories route.
20. **Availability update** — EXISTING: `chef_availability`, `menu_item_availability` per docs; UI coverage UNKNOWN.
21. **Notifications** — PARTIAL: DB `notifications`, engine sender, Resend.
22. **Reviews** — EXISTING: `apps/web/src/app/api/reviews/route.ts`, table `reviews`.
23. **Support tickets** — EXISTING: `apps/web/src/app/api/support/route.ts`, ops `apps/ops-admin/src/app/api/support/*`, table `support_tickets`.

---

## Part 5 — Backend / API audit (summary matrix)

**Legend:** Auth: Cookie/session via `createServerClient` / `cookies()`; Admin: `createAdminClient`; Proc: processor token (`x-processor-token` / `Authorization: Bearer CRON_SECRET`).

| App | Method | HTTP path (from file) | File | Auth | DB client | Validation | Production | Issues |
|-----|--------|------------------------|------|------|-----------|------------|------------|--------|
| web | POST | `/api/checkout` | `apps/web/src/app/api/checkout/route.ts` | customer context + rate limit | admin | partial zod in body | PARTIAL | Stripe apiVersion |
| web | POST | `/api/webhooks/stripe` | `apps/web/src/app/api/webhooks/stripe/route.ts` | Stripe signature | engine | Stripe event | EXISTING | Must configure secrets |
| web | GET/POST/PATCH/DELETE | `/api/cart` | `apps/web/src/app/api/cart/route.ts` | cookies/session | admin after session | PARTIAL | PARTIAL | Uses admin client — audit RLS assumptions |
| web | GET/POST/PATCH/DELETE | `/api/addresses` | `apps/web/src/app/api/addresses/route.ts` | session | mixed | PARTIAL | PARTIAL | Privacy Part 12 |
| web | GET/PATCH | `/api/profile` | `apps/web/src/app/api/profile/route.ts` | session | mixed | PARTIAL | PARTIAL | — |
| web | GET/PATCH | `/api/orders/[id]` | `apps/web/src/app/api/orders/[id]/route.ts` | `getCustomerActorContext` | admin | PARTIAL | PARTIAL | — |
| web | GET | `/api/orders` | `apps/web/src/app/api/orders/route.ts` | session | admin | UNKNOWN | PARTIAL | — |
| web | POST | `/api/support` | `apps/web/src/app/api/support/route.ts` | session | admin | PARTIAL | PARTIAL | Test `apps/web/__tests__/api/support/route.test.ts` |
| web | POST/GET | `/api/reviews` | `apps/web/src/app/api/reviews/route.ts` | session | admin | PARTIAL | PARTIAL | — |
| web | GET/POST | `/api/favorites` | `apps/web/src/app/api/favorites/route.ts` | session | admin | PARTIAL | PARTIAL | — |
| web | POST | `/api/upload` | `apps/web/src/app/api/upload/route.ts` | session | admin | PARTIAL | PARTIAL | File upload security Part 12 |
| web | GET/POST/PATCH | `/api/notifications` | `apps/web/src/app/api/notifications/route.ts` | session | admin | PARTIAL | PARTIAL | — |
| web | POST/DELETE | `/api/notifications/subscribe` | `apps/web/src/app/api/notifications/subscribe/route.ts` | cookies | — | PARTIAL | PARTIAL | — |
| web | POST | `/api/auth/login`, `/api/auth/signup` | `apps/web/src/app/api/auth/*/route.ts` | cookie write | supabase | PARTIAL | PARTIAL | — |
| chef | GET/POST/PATCH | `/api/storefront`, `/api/menu`, `/api/menu/[id]`, categories | `apps/chef-admin/src/app/api/*` | cookies | admin | PARTIAL | PARTIAL | Chef-scoped server checks required |
| chef | GET/PATCH | `/api/orders`, `/api/orders/[id]` | same | cookies | admin | PARTIAL | PARTIAL | — |
| chef | POST | `/api/payouts/setup`, `request` | `apps/chef-admin/src/app/api/payouts/*/route.ts` | session | Stripe | PARTIAL | PARTIAL | apiVersion clover |
| ops | many | `/api/engine/*` | `apps/ops-admin/src/app/api/engine/**` | session middleware + admin client | admin | PARTIAL | PARTIAL | God-mode APIs — role fine-grain MISSING |
| ops | POST | `/api/engine/processors/sla` | `apps/ops-admin/src/app/api/engine/processors/sla/route.ts` | Proc token | admin | N/A | PARTIAL | Fails closed if env missing |
| ops | POST | `/api/engine/processors/expired-offers` | `apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts` | Proc token | admin | N/A | PARTIAL | — |
| driver | GET/PATCH | `/api/deliveries`, `/api/deliveries/[id]` | `apps/driver-app/src/app/api/deliveries/**` | session | admin | PARTIAL | PARTIAL | Location privacy |
| driver | POST | `/api/location` | `apps/driver-app/src/app/api/location/route.ts` | session | admin | PARTIAL | PARTIAL | Rate limit RECOMMENDED |
| driver | GET/POST | `/api/offers` | `apps/driver-app/src/app/api/offers/route.ts` | session | admin | PARTIAL | PARTIAL | — |

**Full file list (73):** use repo glob `**/src/app/api/**/route.ts` — every file should be copied to an internal spreadsheet with the same columns; this document summarizes patterns.

**Missing APIs (vs ideal marketplace):** Many domains EXISTING under ops `engine/*` and web/chef/driver. **MISSING / PARTIAL:** Dedicated finance export APIs beyond `export/route.ts` (verify), public rate limits on all mutating routes (PARTIAL — checkout has `checkRateLimit` in `apps/web/src/app/api/checkout/route.ts`), webhook idempotency storage UNKNOWN.

---

## Part 6 — Database and storage audit

**Source of truth:** migrations `supabase/migrations/*.sql` + `docs/DATABASE_SCHEMA.md` + `packages/db/src/generated/database.types.ts`.

| Entity (requested) | Maps to | Tag |
|--------------------|---------|-----|
| users | `auth.users` | EXISTING |
| roles | Derived `packages/engine/src/services/permissions.service.ts`; `platform_users.role` | PARTIAL |
| customers | `customers` | EXISTING |
| chefs/vendors | `chef_profiles`, `chef_storefronts` | EXISTING |
| drivers | `drivers` | EXISTING |
| restaurants/kitchens | `chef_kitchens`, `chef_storefronts` | EXISTING |
| menus / menu_items | `menu_categories`, `menu_items`, options tables | EXISTING |
| availability_windows | `chef_availability`, `menu_item_availability` | EXISTING |
| carts / cart_items | `carts`, `cart_items` | EXISTING |
| orders / order_items | `orders`, `order_items`, `order_item_modifiers` | EXISTING |
| order_status_events | `order_status_history` (naming) | EXISTING (alias) |
| deliveries / assignments | `deliveries`, `delivery_assignments`, events tables | EXISTING |
| payments | Stripe external + `orders` payment columns + `ledger_entries` (engine migration) | PARTIAL |
| payouts | `payout_runs`, chef/driver payout tables per docs | PARTIAL |
| refunds | engine `refunds` routes + Stripe webhook `charge.refunded` handler | PARTIAL |
| promo_codes | `promo_codes` | EXISTING |
| reviews | `reviews` | EXISTING |
| support_tickets | `support_tickets` | EXISTING |
| notifications | `notifications` | EXISTING |
| admin_audit_logs | `audit_logs`, `domain_events` | PARTIAL |
| addresses | `customer_addresses` | EXISTING |
| zones | `chef_delivery_zones` (PostGIS) | EXISTING |
| platform_settings | `platform_settings` migrations `00004`, `00009`, `00010`, `00012` | EXISTING |

**RECOMMENDED:** Formal finance ledger document aligned to `ledger_entries` columns in `00007_central_engine_tables.sql` (read file for full column list).

---

## Part 7 — Role and permission model

**EXISTING roles (code):** `packages/engine/src/services/permissions.service.ts` — `customer`, `chef`, `driver`, `ops_admin`, `super_admin`.

**MISSING as first-class:** `Guest` (implicit), `Support Agent`, `Finance/Ops Manager` distinct from `ops_admin` — RECOMMENDED new `platform_users.role` values + RLS + middleware checks.

**Permissions matrix:** See RECOMMENDED table in implementation phase (View/Create/Edit/Delete/Approve/Reject/Override/Refund/Export/Disable) keyed to entity — not fully enforced in UI/API audit without per-route grep of `getUserRoles` usage **UNKNOWN** coverage.

**Insecure pages risk:** Ops uses session gate but not per-route role in middleware — **PARTIAL** — any authenticated `platform_users` may reach UI; server routes must enforce **RECOMMENDED** audit each `apps/ops-admin/src/app/api/**/route.ts`.

---

## Part 8 — Business engine requirements

Central package: **`packages/engine`** exports orchestrators and services (`packages/engine/src/index.ts`).

| Module (requested) | Code mapping | Tag |
|--------------------|--------------|-----|
| OrderEngine | `master-order-engine`, `order.orchestrator`, `order-state-machine` | EXISTING |
| PricingEngine | `commerce.engine` + checkout route calculations | PARTIAL |
| DeliveryEngine | `delivery-engine`, `dispatch.engine` | EXISTING |
| AvailabilityEngine | `kitchen.engine` + DB tables | PARTIAL |
| MenuEngine | chef APIs + repos | PARTIAL |
| PaymentEngine | Stripe + webhook + platform engine | PARTIAL |
| PayoutEngine | `payout-engine`, ops/chef routes | PARTIAL |
| NotificationEngine | core notification sender + triggers | PARTIAL |
| RiskEngine | **MISSING** named module — RECOMMENDED |
| AdminOpsEngine | `ops.engine`, ops API `engine/dashboard`, `maintenance` | PARTIAL |
| SupportEngine | `support.engine`, tickets APIs | PARTIAL |
| AnalyticsEngine | `ops-analytics.service`, `api/analytics/trends` | PARTIAL |

---

## Part 9 — End-to-end user journeys (production vs code)

Each: **Status** = PARTIAL unless noted; **MISSING** items typical: mobile polish, dispute, chargeback, tax jurisdiction engine, fraud, SLA legal copy.

1. Customer: signup → address → browse → cart → checkout → pay → track → review — APIs largely EXISTING; **PARTIAL** realtime and duplicate confirmation routes.
2. Chef: signup → profile → menu → open → accept → prepare → handoff — EXISTING routes; **PARTIAL** kitchen queue vs actual load.
3. Driver: signup → available → assign → pickup → deliver — EXISTING; **PARTIAL** background tracking battery/OS policies.
4. Admin: monitor → approve chef → refund → settings — EXISTING ops surfaces; **PARTIAL** granular RBAC.
5. Support agent — UI uses ops support pages; role separation **MISSING**.
6. Finance manager — `dashboard/finance` + engine finance; export **PARTIAL**.

---

## Part 10 — Real-time requirements

**EXISTING:** `useRealtimeSubscription`, `domain_events` table, ops alerts channel tests.  
**MISSING:** Central typed event bus contract for all clients.  
**RECOMMENDED:** Standardize on Supabase Realtime + `domain_events` consumer workers; document emit points in engine event emitter `packages/engine/src/core/event-emitter.test.ts` (pattern).

---

## Part 11 — Payment and finance audit

**EXISTING:** Checkout `apps/web/src/app/api/checkout/route.ts`; webhook signature `apps/web/src/app/api/webhooks/stripe/route.ts`; promo validation against `promo_codes`.  
**PARTIAL:** Stripe `apiVersion` — `2026-02-25.clover` in checkout/webhook/chef payout routes vs `2024-12-18.acacia` in `apps/web/src/lib/stripe-adapter.ts` and `apps/ops-admin/src/app/api/engine/payouts/route.ts`.  
**RECOMMENDED:** Single shared Stripe client module.  
**Ledger:** `ledger_entries` in `supabase/migrations/00007_central_engine_tables.sql` — map user-requested ledger fields to columns during build.

---

## Part 12 — Security audit (classified)

| Severity | Item | Path | Fix phase |
|----------|------|------|-----------|
| HIGH | Broad `createAdminClient` in customer-facing APIs bypasses end-user RLS — must validate actor IDs on every query | e.g. `apps/web/src/app/api/cart/route.ts`, `favorites`, `reviews` | Phase 12 |
| HIGH | Ops APIs powerful; middleware only checks login | `apps/ops-admin/src/middleware.ts` | Phase 3 / 12 |
| MEDIUM | `BYPASS_AUTH` — throws in production if mis-set | `packages/auth/src/middleware.ts` | Phase 12 |
| MEDIUM | CI lint `continue-on-error: true` | `.github/workflows/ci.yml` | Phase 13 |
| MEDIUM | Processor routes excluded from session — OK if token always required | `apps/ops-admin/src/app/api/engine/processors/sla/route.ts` | Phase 12 |
| LOW | `as any` casts on Supabase clients | multiple ops routes | Phase 16 |
| LOW | Realtime `postgres_changes as any` | `packages/db/src/hooks/use-realtime.ts` | Phase 10 |

---

## Part 13 — Mock / fake data audit

| Path | Content | Tag |
|------|---------|-----|
| `supabase/seeds/seed.sql` | Fixed UUID users, passwords, chefs, customers, drivers, orders | MOCK/DEMO DATA |
| `**/__tests__/**` | Jest/Vi mocks | MOCK/DEMO DATA |
| `.github/workflows/ci.yml` | Placeholder Supabase/Stripe env | MOCK/DEMO DATA (CI only) |

---

## Part 14 — UI/UX audit (summary)

| Surface | Status | Missing |
|---------|--------|---------|
| Customer web | PARTIAL | Unified loading/error; a11y audit UNKNOWN |
| Chef admin | PARTIAL | Mobile menu management |
| Driver PWA | PARTIAL | Offline queueing |
| Ops admin | PARTIAL | Role-based nav |

---

## Part 15 — Admin ops control center

**EXISTING pages:** `apps/ops-admin/src/app/dashboard/**` (see Part 2).  
**EXISTING APIs:** `apps/ops-admin/src/app/api/engine/**`, `orders`, `deliveries`, `chefs`, `drivers`, `customers`, `support`, `promos`, `export`, `team`, `announcements`.  
**MISSING:** Dedicated incident command center for multi-region outages (if required), formal RBAC UI.

---

## Part 16 — Technical debt and duplication

| Item | Tag | List |
|------|-----|------|
| Stripe apiVersion drift | PARTIAL | REPLACE with one module |
| Duplicate password strength | EXISTING | MERGE → `packages/ui` |
| Two order confirmation routes | PARTIAL | MERGE or redirect |
| Lint not gating | PARTIAL | CI |
| graphify report | MISSING | QUARANTINE N/A |

**KEEP:** `packages/engine`, `packages/db`, `docs/*`  
**MERGE:** password strength components  
**REPLACE:** ad-hoc Stripe instantiation  
**QUARANTINE LATER:** none identified without knip run  
**UNKNOWN:** dead exports without knip

---

## Part 17 — Production readiness scorecard (0–5)

| Dimension | Score | Rationale (path) |
|-----------|-------|-------------------|
| Local dev | 4 | `pnpm dev`, turbo |
| Env setup | 3 | `.env.example` complete; many secrets |
| Database setup | 4 | Migrations + seeds |
| Auth setup | 3 | Supabase SSR; `BYPASS_AUTH` footgun |
| Payment setup | 3 | Stripe wired; version drift |
| Deployment | 3 | `vercel.json` per app; no multi-cloud |
| Error monitoring | 2 | Sentry dep root `package.json`; DSN optional |
| Logging | 2 | console errors in webhook |
| Backups | 0 | Not in repo — Supabase platform |
| CI/CD | 3 | `ci.yml`; lint non-blocking |
| Testing | 3 | Engine strong; web/ops partial CI |
| Load handling | 0 | Not evidenced |
| Mobile readiness | 2 | Driver PWA; web UNKNOWN |
| Security | 2 | See Part 12 |
| Admin operations | 4 | Broad ops + engine |
| Legal/privacy | 1 | Static terms/privacy pages only |

---

## Part 18 — Phased upgrade roadmap (15 phases)

Each phase: **Goal — DoD — Risk — Likely paths later**

1. **Stabilize source of truth** — Regenerate DB types, reconcile docs vs migrations — LOW — `packages/db`, `docs/`
2. **Auth and role model** — Support/Finance roles, enforce on ops APIs — HIGH — `packages/engine/src/services/permissions.service.ts`, ops routes
3. **Database schema** — Migrations only via Supabase workflow — MEDIUM — `supabase/migrations/`
4. **Customer ordering** — Single confirmation flow, cart auth — MEDIUM — `apps/web/`
5. **Chef dashboard** — Availability + menu QA — MEDIUM — `apps/chef-admin/`
6. **Admin business engine** — RBAC + audit — HIGH — `apps/ops-admin/`
7. **Order engine** — State machine parity with docs — HIGH — `packages/engine/`
8. **Payment ledger** — Stripe + `ledger_entries` reconciliation — HIGH — `apps/web/src/app/api/webhooks/stripe/route.ts`, engine
9. **Driver delivery** — Location privacy, offline — MEDIUM — `apps/driver-app/`
10. **Realtime tracking** — Typed channels per event — MEDIUM — `packages/db/src/hooks/use-realtime.ts`
11. **Notifications + support** — Resend templates + SLA — MEDIUM — `packages/notifications`, engine
12. **Security hardening** — Rate limits, upload scan, RLS review — HIGH — all `api/**`
13. **Testing + QA** — CI include web jest, e2e — MEDIUM — `.github/workflows/ci.yml`
14. **Deployment readiness** — Secrets rotation, staging — MEDIUM — Vercel + Supabase dashboards
15. **Launch checklist** — Legal, insurance, food safety ops — HIGH — external

---

## Part 19 — Future Cursor prompts (copy/paste)

### 1) Stabilization
**Scope:** Regenerate types, fix doc drift, no feature work. **Rules:** No unrelated refactors. **Inspect:** `packages/db/src/generated/database.types.ts`, `supabase/migrations/`, `docs/DATABASE_SCHEMA.md`. **Avoid:** `supabase/seeds/seed.sql` in prod. **Output:** PR + changelog. **Tests:** `pnpm typecheck`. **Docs:** Update `AUDIT_AND_PLANNING/*.md` if inventory changes.

### 2) Auth / roles
**Scope:** Add support/finance roles to `platform_users` + enforcement. **Inspect:** `packages/engine/src/services/permissions.service.ts`, `apps/ops-admin/src/app/api/**`. **Avoid:** customer web middleware scope unless intended. **Tests:** `pnpm --filter @ridendine/engine test` + new role tests. **Docs:** `docs/` role section RECOMMENDED.

### 3) Database / schema
**Scope:** Migration for new RBAC/ledger columns. **Inspect:** `00007_central_engine_tables.sql`. **Tests:** local `supabase db reset`. **Docs:** `docs/DATABASE_SCHEMA.md`.

### 4) Customer order flow
**Scope:** Merge confirmation routes; hardened checkout. **Inspect:** `apps/web/src/app/checkout/page.tsx`, `apps/web/src/app/api/checkout/route.ts`. **Tests:** `pnpm --filter @ridendine/web test`. **Docs:** this audit Part 2/4.

### 5) Chef dashboard
**Scope:** Menu + availability UX. **Inspect:** `apps/chef-admin/src/app/dashboard/menu/page.tsx`, `api/menu/**`. **Tests:** UNKNOWN e2e — add Playwright RECOMMENDED.

### 6) Admin ops
**Scope:** Per-route role guard. **Inspect:** `apps/ops-admin/src/middleware.ts`, all `api/**`. **Tests:** API route tests.

### 7) Business engine
**Scope:** Risk module stub + hooks. **Inspect:** `packages/engine/src/orchestrators/`. **Tests:** `pnpm --filter @ridendine/engine test`.

### 8) Payment ledger
**Scope:** Unify Stripe client; ledger writes on webhook. **Inspect:** `apps/web/src/app/api/webhooks/stripe/route.ts`, `payout-engine`. **Tests:** Stripe CLI fixture tests RECOMMENDED.

### 9) Driver delivery
**Scope:** Location sampling + privacy. **Inspect:** `apps/driver-app/src/app/api/location/route.ts`. **Tests:** driver API tests RECOMMENDED.

### 10) Realtime tracking
**Scope:** Replace `as any` + channel naming. **Inspect:** `packages/db/src/hooks/use-realtime.ts`. **Tests:** component tests.

### 11) Security hardening
**Scope:** Rate limit all public POST, file upload validation. **Inspect:** `packages/utils/src/rate-limiter.ts`, upload routes. **Tests:** security test suite.

### 12) Final QA
**Scope:** CI lint gating + staging smoke. **Inspect:** `.github/workflows/ci.yml`. **Tests:** full `pnpm test` matrix RECOMMENDED.

---

## Part 20 — Executive summary

Ridendine is a **pnpm/Turborepo monorepo** with **four Next.js 14 apps** and shared packages, centered on **Supabase Postgres** and a **`@ridendine/engine` business layer**, with **Stripe** for payments and **seed data** for local demos (`supabase/seeds/seed.sql`).

**What works (EXISTING):** Rich schema and migrations; engine orchestrators with Vitest coverage; Stripe checkout and signed webhooks; ops “control plane” API surface; driver PWA artifacts; shared auth middleware.

**What is incomplete (PARTIAL):** End-to-end verification UNKNOWN without runtime; CI does not gate on lint; Stripe API version strings inconsistent; customer web middleware protects only `/account`; admin RBAC coarse; finance ledger UI vs backend depth unclear.

**What is missing for Uber-class operation:** Formal risk/fraud engine, load/chaos testing, observability SLOs, legal/compliance program, first-class support/finance roles, mobile/web parity proof, idempotent webhook processing evidence.

**Biggest risks:** Over-privileged server patterns (`createAdminClient` on web APIs), ops power concentration, processor token misconfiguration, reliance on demo seeds in non-prod discipline.

**Biggest opportunities:** Engine already modular — extend with **RiskEngine** and **typed realtime**; unify **Stripe** and **ledger**; tighten **CI** and **RBAC**.

**Engineering effort:** Large multi-quarter for full marketplace parity; first quarter on Phases 1–4 + 12 is RECOMMENDED.

**Build order:** Phase 1 → 2 → 3 → 12 → 4 → 8 (stabilize, roles, schema, security, customer flow, payments).

**Conclusion:** The codebase is a **serious scaffold** toward production, not a throwaway demo, but **operations, security, and test gating** must harden before real money and real riders.

---

## Deliverable checklist (this run)

| Item | Path |
|------|------|
| Master document | `AUDIT_AND_PLANNING/RIDENDINE_FULL_HEADLESS_AUDIT_AND_UPGRADE_PLAN.md` |
| Diagrams | `AUDIT_AND_PLANNING/diagrams/*.md` |
| App source touched | **None** (only `AUDIT_AND_PLANNING/`). |

---

## Appendix A — All API `route.ts` files (73)

Enumerated from repository glob `**/src/app/api/**/route.ts` on 2026-04-30.

1. `apps/chef-admin/src/app/api/auth/signup/route.ts`
2. `apps/chef-admin/src/app/api/health/route.ts`
3. `apps/chef-admin/src/app/api/menu/categories/route.ts`
4. `apps/chef-admin/src/app/api/menu/[id]/route.ts`
5. `apps/chef-admin/src/app/api/menu/route.ts`
6. `apps/chef-admin/src/app/api/orders/[id]/route.ts`
7. `apps/chef-admin/src/app/api/orders/route.ts`
8. `apps/chef-admin/src/app/api/payouts/request/route.ts`
9. `apps/chef-admin/src/app/api/payouts/setup/route.ts`
10. `apps/chef-admin/src/app/api/profile/route.ts`
11. `apps/chef-admin/src/app/api/storefront/route.ts`
12. `apps/chef-admin/src/app/api/upload/route.ts`
13. `apps/driver-app/src/app/api/auth/login/route.ts`
14. `apps/driver-app/src/app/api/auth/logout/route.ts`
15. `apps/driver-app/src/app/api/auth/signup/route.ts`
16. `apps/driver-app/src/app/api/deliveries/[id]/route.ts`
17. `apps/driver-app/src/app/api/deliveries/route.ts`
18. `apps/driver-app/src/app/api/driver/presence/route.ts`
19. `apps/driver-app/src/app/api/driver/route.ts`
20. `apps/driver-app/src/app/api/earnings/route.ts`
21. `apps/driver-app/src/app/api/health/route.ts`
22. `apps/driver-app/src/app/api/location/route.ts`
23. `apps/driver-app/src/app/api/offers/route.ts`
24. `apps/ops-admin/src/app/api/analytics/trends/route.ts`
25. `apps/ops-admin/src/app/api/announcements/route.ts`
26. `apps/ops-admin/src/app/api/chefs/[id]/route.ts`
27. `apps/ops-admin/src/app/api/chefs/route.ts`
28. `apps/ops-admin/src/app/api/customers/[id]/notify/route.ts`
29. `apps/ops-admin/src/app/api/customers/route.ts`
30. `apps/ops-admin/src/app/api/deliveries/[id]/route.ts`
31. `apps/ops-admin/src/app/api/deliveries/route.ts`
32. `apps/ops-admin/src/app/api/drivers/[id]/route.ts`
33. `apps/ops-admin/src/app/api/drivers/route.ts`
34. `apps/ops-admin/src/app/api/engine/dashboard/route.ts`
35. `apps/ops-admin/src/app/api/engine/dispatch/route.ts`
36. `apps/ops-admin/src/app/api/engine/exceptions/[id]/route.ts`
37. `apps/ops-admin/src/app/api/engine/exceptions/route.ts`
38. `apps/ops-admin/src/app/api/engine/finance/route.ts`
39. `apps/ops-admin/src/app/api/engine/health/route.ts`
40. `apps/ops-admin/src/app/api/engine/maintenance/route.ts`
41. `apps/ops-admin/src/app/api/engine/orders/[id]/route.ts`
42. `apps/ops-admin/src/app/api/engine/payouts/route.ts`
43. `apps/ops-admin/src/app/api/engine/processors/expired-offers/route.ts`
44. `apps/ops-admin/src/app/api/engine/processors/sla/route.ts`
45. `apps/ops-admin/src/app/api/engine/refunds/route.ts`
46. `apps/ops-admin/src/app/api/engine/rules/route.ts`
47. `apps/ops-admin/src/app/api/engine/settings/route.ts`
48. `apps/ops-admin/src/app/api/engine/storefronts/[id]/route.ts`
49. `apps/ops-admin/src/app/api/export/route.ts`
50. `apps/ops-admin/src/app/api/health/route.ts`
51. `apps/ops-admin/src/app/api/orders/[id]/refund/route.ts`
52. `apps/ops-admin/src/app/api/orders/[id]/route.ts`
53. `apps/ops-admin/src/app/api/orders/route.ts`
54. `apps/ops-admin/src/app/api/promos/route.ts`
55. `apps/ops-admin/src/app/api/support/[id]/route.ts`
56. `apps/ops-admin/src/app/api/support/route.ts`
57. `apps/ops-admin/src/app/api/team/route.ts`
58. `apps/web/src/app/api/addresses/route.ts`
59. `apps/web/src/app/api/auth/login/route.ts`
60. `apps/web/src/app/api/auth/signup/route.ts`
61. `apps/web/src/app/api/cart/route.ts`
62. `apps/web/src/app/api/checkout/route.ts`
63. `apps/web/src/app/api/favorites/route.ts`
64. `apps/web/src/app/api/health/route.ts`
65. `apps/web/src/app/api/notifications/route.ts`
66. `apps/web/src/app/api/notifications/subscribe/route.ts`
67. `apps/web/src/app/api/orders/[id]/route.ts`
68. `apps/web/src/app/api/orders/route.ts`
69. `apps/web/src/app/api/profile/route.ts`
70. `apps/web/src/app/api/reviews/route.ts`
71. `apps/web/src/app/api/support/route.ts`
72. `apps/web/src/app/api/upload/route.ts`
73. `apps/web/src/app/api/webhooks/stripe/route.ts`
