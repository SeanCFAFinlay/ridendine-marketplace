# ARCHITECTURE.md — Ridendine Marketplace

> Companion to `PROJECT_BASELINE.md`. Describes how this repository actually
> works, verified against commit `b78d8e28` on 2026-09-02 by reading source and
> querying the GitNexus graph — not inferred from filenames.
>
> Scope is `D:\Projects\RIDENDINE\ridendine-marketplace` only.

---

## 1. System Overview

Ridendine is a **chef-first food-delivery marketplace** that has grown a **Kitchen
Operating System** on top of it. Four Next.js 14 App Router applications are
deployed independently to Vercel. They share one Supabase PostgreSQL 17 database
and — crucially — **one central business-logic engine** (`@ridendine/engine`) that
owns every state transition, money movement, and dispatch decision.

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│  apps/web    │ chef-admin   │  ops-admin   │  driver-app  │
│  :3000       │  :3001       │  :3002       │  :3003       │
│  customer    │  chef/KOS    │  internal    │  driver PWA  │
│  + partner   │              │  + ALL cron  │              │
│    API       │              │    processors│              │
└──────┬───────┴──────┬───────┴──────┬───────┴──────┬───────┘
       │              │              │              │
       └──────────────┴──────┬───────┴──────────────┘
                             │
              ┌──────────────▼───────────────┐
              │     @ridendine/engine        │
              │  createCentralEngine(client) │
              │  orchestrators + services    │
              │  ← the only writer of        │
              │    lifecycle + money state   │
              └──────────────┬───────────────┘
                             │
       ┌─────────────────────┼─────────────────────┐
       │                     │                     │
┌──────▼──────┐  ┌───────────▼──────────┐  ┌───────▼────────┐
│@ridendine/db│  │ @ridendine/routing   │  │ notifications  │
│ 22 repos    │  │ ETA / geocode        │  │ templates      │
│ + clients   │  └──────────────────────┘  └────────────────┘
└──────┬──────┘
       │
┌──────▼───────────────────────────────────────────────────┐
│ Supabase — PostgreSQL 17 + RLS, Auth, Storage, Realtime  │
│ 113 tables · 62 migrations                                │
└───────────────────────────────────────────────────────────┘

External: Stripe · Resend · Twilio · Upstash Redis · Nominatim · Sentry
```

Shared leaf packages (`types`, `validation`, `utils`, `ui`, `config`) sit beneath
everything and have no runtime dependencies on the apps.

---

## 2. Subsystem Boundaries

There are four boundaries that matter. Crossing any of them without going through
the intended door is the main source of architectural drift in this repository.

| # | Boundary | The intended door | Enforcement |
|---|---|---|---|
| 1 | **App ↔ business logic** | `@ridendine/engine` orchestrators/services, obtained via `createCentralEngine()` or `@ridendine/engine/server` | Convention + tests. No automated gate. |
| 2 | **Business logic ↔ database** | `@ridendine/db` repositories (22) | ESLint `db-boundary/no-raw-supabase-from` (**warn**) + `pnpm audit:db-boundary` ratchet. **Currently failing** — 398 raw calls vs a 346 baseline. |
| 3 | **Client ↔ data** | RLS policies; anon/authenticated clients only | Postgres RLS + pgTAP tests in `supabase/tests/rls`. The admin/service-role client deliberately bypasses this and is engine/cron-only. |
| 4 | **App ↔ app** | HTTP only. There are **no** cross-app imports. Apps share state exclusively through the database. | Separate Vercel projects; `pnpm-workspace.yaml` scopes shared code to `packages/*`. |

Boundary 4 holds cleanly — a grep for `@ridendine/{web,chef-admin,ops-admin,driver-app}`
inside `apps/` returns nothing. The only place app code reaches outside itself by
relative path is one test file,
`apps/ops-admin/src/__tests__/high-risk-ops-negative-authz.test.ts`, which imports
`../../../../packages/utils/src/processor-auth` and
`../../../../scripts/audit/high-risk-ops-negative-authz.cjs` directly rather than
through the package export. Test-only, but it bypasses the package contract.

**Process boundary:** four independent Vercel deployments over one database. No
queue, no separate backend service, no long-running worker. Background work is
HTTP: Vercel Cron → POST to an `ops-admin` route → engine processor.

**Data ownership:** the database is shared, but write authority is not. Lifecycle
and money tables (`orders`, `deliveries`, `ledger_entries`, `payout_*`,
`stripe_*`) are written through engine orchestrators regardless of which app the
request arrived at. Kitchen-OS tables are chef-admin-driven; dispatch tables are
ops-admin/driver-app-driven; but all of them still route through the engine.

---

## 3. Major Components

### 3.1 Applications

#### `apps/web` — Customer marketplace (port 3000)

| | |
|---|---|
| **Purpose** | Public discovery, cart, checkout, order tracking, reviews, loyalty, referrals. Also hosts the **third-party partner API**. |
| **Entry point** | `src/app/layout.tsx` + `src/middleware.ts` (132 LOC — auth session refresh **and** maintenance-mode gate) |
| **Key files** | `src/lib/checkout/run-checkout.ts` (614 LOC, the single money path), `src/lib/checkout/quote.ts` (623 LOC), `src/lib/partner/{auth,signing,rate-limit,materialize}.ts`, `src/lib/stripe-adapter.ts`, `src/app/checkout/page.tsx` (881 LOC) |
| **Dependencies** | engine, db, auth, routing, types, ui, utils, validation, Stripe (server + Elements), Leaflet, Vercel Analytics |
| **Called by** | Customers (browser); **partner systems** (server-to-server); **Stripe** (webhook) |
| **Calls into** | `CentralEngine.orderCreation`, `masterOrder`, Stripe API, Upstash, Supabase |
| **Data used** | `carts`, `cart_items`, `orders`, `order_items`, `checkout_idempotency_keys`, `customer_addresses`, `promo_codes`, `loyalty_*`, `referral_*`, `favorites`, `reviews`, `api_partners`, `api_partner_keys` |
| **External systems** | Stripe (PaymentIntents + webhook), Upstash Redis, Sentry, Vercel Analytics |
| **Outputs** | Orders + PaymentIntents; JSON for partners |
| **Known risks** | 71 raw `.from()` calls (+2 over baseline). `checkout/page.tsx` is 881 LOC. The partner path shares `runCheckout` with the customer path — a change there affects both, including `STRIPE_ALLOW_TEST_IN_PRODUCTION` handling. |

#### `apps/chef-admin` — Chef / Kitchen OS (port 3001)

| | |
|---|---|
| **Purpose** | Storefront + menu management, order fulfilment, and the full Kitchen OS: recipes and costing, inventory, suppliers/purchasing/receiving, production planning, labour + payroll, kitchen P&L, multi-brand KDS. |
| **Entry point** | `src/app/layout.tsx` + `src/middleware.ts` (27 LOC, auth only) |
| **Key files** | `src/app/dashboard/page.tsx` (875 LOC), `src/components/layout/sidebar.tsx` (kitchen/brand-scoped `navSections`), `src/components/layout/kitchen-scope-provider.tsx`, `src/components/menu/menu-list.tsx` (608 LOC) |
| **Dependencies** | engine, db, auth, types, ui, utils, validation, Stripe |
| **Called by** | Chefs and kitchen staff |
| **Calls into** | `CentralEngine.kitchen`, `inventory`, `purchasing`, `production`, `labor`, `masterOrder`; `costing.service`, `kitchen-pnl.service`, `payroll.service`, `prep-consolidation.service` |
| **Data used** | All Kitchen-OS tables + `menu_*`, `chef_*`, `orders` |
| **External systems** | Stripe (payout setup), Supabase Storage, Sentry |
| **Outputs** | Menu/inventory/production/labour records; payroll exports |
| **Known risks** | **Largest boundary violator** — 259 raw `.from()` calls, +44 over baseline. The Costs page is orphaned from the sidebar (`PROJECT_BASELINE.md` §13-C1) and its smoke test fails. 68 API routes, the most of any app. |

#### `apps/ops-admin` — Internal operations (port 3002)

| | |
|---|---|
| **Purpose** | Dispatch oversight, live board, exceptions, refunds, payouts, reconciliation, support, promos, surge, team/roles — **and every scheduled processor**. |
| **Entry point** | `src/app/layout.tsx` + `src/middleware.ts` (27 LOC) |
| **Key files** | `src/lib/partner-webhooks.ts` (HMAC-signed outbound delivery + retry), `src/lib/test-order-lifecycle.ts`, `src/app/api/engine/processors/*`, `src/app/api/engine/payouts/*` |
| **Dependencies** | engine, db, auth, **routing**, types, ui, utils, validation, Stripe, Leaflet |
| **Called by** | Internal ops staff; **Vercel Cron** (unauthenticated by session — guarded by `validateEngineProcessorHeaders`) |
| **Calls into** | `CentralEngine.operations` (`OperationsCommandGateway`), `ops`, `dispatchOrchestrator`, `payoutAutomation`, `reconciliation`, `support`, `sla` |
| **Data used** | `ops_processor_runs`, `ops_override_logs`, `sla_timers`, `order_exceptions`, `refund_cases`, `payout_*`, `ledger_entries`, `stripe_*`, `partner_webhook_deliveries`, `system_alerts`, `audit_logs` |
| **External systems** | Stripe (refunds, Connect payouts, **second webhook endpoint**), partner webhook endpoints (outbound), Sentry |
| **Outputs** | Payout runs, refunds, reconciliation reports, partner webhooks, exports |
| **Known risks** | Sole owner of scheduled work — a deploy failure here silently stops SLA, offer expiry, and partner webhooks. Three cron routes exist with no scheduler. One deprecated `sla-tick` route is still live. |

#### `apps/driver-app` — Driver PWA (port 3003)

| | |
|---|---|
| **Purpose** | Shift/presence, offer accept/decline, navigation, delivery status progression, proof of delivery, earnings, instant payouts. |
| **Entry point** | `src/app/layout.tsx` + `src/middleware.ts` (28 LOC) |
| **Key files** | `src/app/delivery/[id]/components/DeliveryDetail.tsx` (**1,250 LOC — largest hand-written file in the repo**), `src/app/components/DriverDashboard.tsx` (937 LOC), `src/components/map/route-map.tsx` |
| **Dependencies** | engine, db, auth, types, ui, utils, validation, Leaflet |
| **Called by** | Drivers (mobile browser / PWA) |
| **Calls into** | `CentralEngine.masterDelivery`, `dispatchOrchestrator`, `offerManagement`, `payoutAutomation` |
| **Data used** | `deliveries`, `delivery_assignments`, `delivery_events`, `driver_*`, `assignment_attempts`, `driver_earnings`, `instant_payout_requests`, `push_subscriptions` |
| **External systems** | Supabase Storage (proof photos), Web Push (VAPID), Sentry |
| **Outputs** | Delivery status transitions, location pings, proof-of-delivery uploads |
| **Known risks** | 53 raw `.from()` calls (at baseline, not over). `DeliveryDetail.tsx` concentrates offline handling, status progression, and error UI in one 1,250-line component. |

### 3.2 `@ridendine/engine` — the central engine

The only place lifecycle and money state is legitimately mutated.

| Layer | Contents |
|---|---|
| **`core/`** | `engine.factory.ts` (composition root), `event-emitter.ts` + `public-broadcast-sanitizer.ts`, `audit-logger.ts`, `sla-manager.ts` + `sla-checks.ts`, `notification-sender.ts` + `email-provider.ts` (Resend) + `sms-provider.ts` (Twilio, direct REST) + `notification-triggers.ts`, `business-rules-engine.ts`, `health-checks.ts` |
| **`orchestrators/` — canonical** | `MasterOrderEngine` (939 LOC), `DeliveryEngine` (636), `order-state-machine.ts` (373 — the transition tables), `PayoutEngine` |
| **`orchestrators/` — dispatch (Phase-2 split)** | `DriverMatchingService` → `OfferManagementService` (702) → `DispatchOrchestrator` |
| **`orchestrators/` — facades** | `kitchen.engine` (787), `commerce.engine` (1,051), `support.engine` (759), `platform.engine` (740), `ops.engine`, `OperationsCommandGateway` |
| **`orchestrators/` — Kitchen OS** | `inventory.engine`, `purchasing.engine`, `production.engine`, `labor.engine`, `kitchen-availability`, `kitchen-ticket-state` |
| **`services/`** | `stripe.service`, `stripe-webhook-finance`, `stripe-webhook-idempotency`, `payout.service` (793), `payout-risk.service`, `ledger.service`, `reconciliation.service`, `tax-config.service`, `eta.service`, `geocoding.service`, `delivery-fee.service`, `surge-pricing.service`, `costing.service`, `kitchen-pnl.service`, `payroll.service`, `labor-allocation.service`, `inventory-consumption.service`, `order-consumption.writer`, `prep-consolidation.service`, `loyalty.service`, `referral.service`, `permissions.service`, `platform-api-guards`, `risk.engine`, `storage.service`, `ops-analytics.service` |
| **`server.ts`** | Next.js-only actor-context helpers (`getCustomerActorContext`, `getSystemActor`, `hasRequiredRole`, …). Imports `next/headers`, so it is route/server-component only. |

**Composition root** — `createCentralEngine(client, paymentAdapter?)` at
`packages/engine/src/core/engine.factory.ts:93`:

```
events → audit → sla → notifications (registers Resend + Twilio) → triggers → rules
      → masterOrder → masterDelivery → payouts → ledger → payoutAutomation
      → reconciliation → taxConfig → eta → orderCreation
      → driverMatching → offerManagement → dispatchOrchestrator
      → kitchen, commerce, support, platform, ops
      → operationsCommandGateway
```

Notification providers self-disable when their env vars are absent, so the engine
boots cleanly without Resend or Twilio credentials.

**Blast radius (GitNexus, upstream):** `MasterOrderEngine` →
**122 impacted symbols, risk CRITICAL** (13 direct, 68 at depth 2, 41 at depth 3),
touching 5 modules and the SLA processor flow. Treat it as the highest-risk symbol
in the repository.

### 3.3 `@ridendine/db` — data access

- **Clients** — `browser.ts` (anon, RLS applies), `server.ts` (SSR cookie-bound,
  RLS applies), `admin.ts` (**service role, bypasses RLS**).
- **Repositories (22)** — `address`, `analytics`, `audit`, `cart`, `chef`,
  `customer`, `delivery`, `driver`, `driver-presence`, `finance`, `menu`,
  `notification`, `ops` (931 LOC), `order` (887 LOC), `partner`, `platform`,
  `processor-run`, `promo`, `review`, `storefront`, `support`, `team`.
- **Realtime** — `realtime/channels.ts`, `realtime/events.ts`, `hooks/use-realtime.ts`.
- **Types** — `generated/database.types.ts` (7,514 LOC, from `pnpm db:generate`)
  overlaid by `database.merged.ts` (1,148 LOC, hand-written). See
  `PROJECT_BASELINE.md` §13-L1 — this overlay has already caused a production
  build break.

### 3.4 Supporting packages

| Package | Role | Notes |
|---|---|---|
| `@ridendine/auth` | `createAuthMiddleware`, session/role helpers | Used by all four `middleware.ts` files |
| `@ridendine/routing` | ETA/routing service | Only `engine` and `ops-admin`/`web` depend on it |
| `@ridendine/validation` | Zod schemas (`checkoutSchema`, partner schemas) | Route-level input validation |
| `@ridendine/utils` | Upstash rate limiting (`evaluateRateLimit`, `RATE_LIMIT_POLICIES`), `validateEngineProcessorHeaders` | Both security-relevant |
| `@ridendine/types` | Engine contracts, `ActorContext`, `ActorRole`, capability list | Dependency leaf |
| `@ridendine/ui` | Shared primitives + design tokens | cva/clsx/tailwind-merge |
| `@ridendine/config` | Shared TS/Tailwind/**ESLint incl. the `db-boundary` rule** | The rule lives here |
| `@ridendine/notifications` | Notification templates | Consumed by `engine` |

---

## 4. Execution Paths

### 4.0 Startup

```
Vercel cold start (per app)
  → next start / serverless function init
  → sentry.{server,edge,client}.config.ts registers Sentry
  → src/middleware.ts on every request:
        @ridendine/auth createAuthMiddleware → refresh Supabase session cookie
        (apps/web only) maintenance-mode check:
            read platform_settings via REST, 1.5 s timeout, 30 s in-process cache,
            bypass for /maintenance, /api/health, /api/, /_next/, /favicon
  → route handler executes
        → getEngine() / createCentralEngine(createAdminClient())
        → engine wired (see §3.2); Resend/Twilio register only if env present
  → ready
```

There is no separate boot sequence, no migration-on-start, and no warm-up job.
Config comes entirely from environment variables read at first use.

### 4.1 Checkout and payment (the money path)

**Trigger** — customer submits checkout, **or** a partner POSTs
`/api/partner/checkout`.

```
POST /api/checkout                    POST /api/partner/checkout
  ↓ evaluateRateLimit                   ↓ partner API-key auth (lib/partner/auth)
    (Upstash, RATE_LIMIT_POLICIES        ↓ partner rate limit
     .checkout, ns "web-checkout")       ↓ HMAC signature verify (lib/partner/signing)
  ↓ getCustomerActorContext()            ↓ system actor + partnerId + isTest
  ↓ checkoutSchema.safeParse
                 └────────────┬────────────┘
                              ↓
        apps/web/src/lib/checkout/run-checkout.ts :: runCheckout()
          1. validateScheduledFor(scheduledFor)
          2. server-side quote  (lib/checkout/quote.ts — never trusts client totals)
          3. risk checks        (engine risk.engine)
          4. idempotency claim  → checkout_idempotency_keys
               deriveIdempotencyKey + hashPayload
               'processing' rows past the staleness window are reclaimed;
               fresh duplicates return 409
          5. resolve Stripe mode BEFORE creating the order
               (a test-flagged order must never fall through to the live client)
          6. engine.orderCreation.createOrder(...)   ← order row exists here
          7. persist canonical quote snapshot on the order
          8. attribute partner_id + is_test (migration 00050 columns)
          9. getOrCreateStripeCustomer (per-mode: live vs test customer ids)
         10. stripe.paymentIntents.create(...)
         11. on failure → cancel the just-created order, mark idempotency 'failed'
          ↓
        JSON { orderId, clientSecret, … }
```

**Decision logic** — the server quote is authoritative; client-supplied
`clientSubtotal`/`clientTotal` are compared, not trusted. Idempotency is keyed on
a hash of the payload, so a retried request returns the original result rather
than double-charging.

**Data access** — `checkout_idempotency_keys`, `carts`, `orders`, `order_items`,
`promo_codes`, `customer_addresses`, `chef_storefronts`, `menu_items`.

**External calls** — Stripe PaymentIntents (live or test client per `isTest`),
Upstash Redis.

**Error handling** — failures throw `CheckoutFailure` so the outer catch can both
cancel the orphaned order and flip the idempotency row to `failed` (leaving it
`processing` would 409 forever).

**Note:** no delivery record is created here. Delivery is created by the dispatch
engine when the chef marks the order ready — so unpaid/abandoned orders never
enter dispatch.

### 4.2 Payment confirmation

```
Stripe → POST /api/webhooks/stripe          (apps/web,       STRIPE_WEBHOOK_SECRET)
Stripe → POST /api/stripe/webhook           (apps/ops-admin, STRIPE_WEBHOOK_SECRET_OPS)
  ↓ signature verification
  ↓ stripe-webhook-idempotency  → stripe_events_processed (replay guard)
  ↓ stripe-webhook-finance      → ledger_entries, platform_accounts
  ↓ MasterOrderEngine  PAYMENT_AUTHORIZED → PENDING
  ↓ NotificationTriggers → Resend / Twilio / Web Push
```

Two endpoints with two secrets: customer-side payment events land on `web`,
finance/Connect events on `ops-admin`.

### 4.3 Order lifecycle

Authoritative transition tables live in
`packages/engine/src/orchestrators/order-state-machine.ts`.
`assertValidOrderTransition()` throws `InvalidTransitionError` on anything not in
the map.

```
DRAFT → CHECKOUT_PENDING → PAYMENT_AUTHORIZED → PENDING
                         ↘ PAYMENT_FAILED → FAILED | CANCELLED

PENDING → ACCEPTED → PREPARING → READY → DISPATCH_PENDING
        ↘ REJECTED            ↘ EXCEPTION
        ↘ CANCELLED

DISPATCH_PENDING → DRIVER_OFFERED → DRIVER_ASSIGNED → DRIVER_EN_ROUTE_PICKUP
                 ↘ DRIVER_ASSIGNED (manual)          → PICKED_UP
                                                      → DRIVER_EN_ROUTE_DROPOFF
                                                        | DRIVER_EN_ROUTE_CUSTOMER
                                                      → DELIVERED → COMPLETED

COMPLETED → REFUND_PENDING → REFUNDED | PARTIALLY_REFUNDED
ACCEPTED  → CANCEL_REQUESTED → CANCELLED | ACCEPTED (denied)
any       → EXCEPTION → CANCELLED | FAILED
```

Terminal: `COMPLETED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `FAILED`.

A **parallel delivery state machine** runs alongside:

```
UNASSIGNED → OFFERED → ACCEPTED → EN_ROUTE_TO_PICKUP → ARRIVED_AT_PICKUP
           ↘ ACCEPTED (manual assign skips offer)     → PICKED_UP
OFFERED → UNASSIGNED (declined/expired)               → EN_ROUTE_TO_CUSTOMER
ACCEPTED → UNASSIGNED (reassigned)                    → ARRIVED_AT_CUSTOMER
                                                      → DELIVERED
```

Terminal: `DELIVERED`, `FAILED`, `CANCELLED`.

A third machine governs payouts (`PAYOUT_TRANSITION_MAP`,
`assertValidPayoutTransition`).

**Legacy translation:** `ENGINE_TO_LEGACY_ORDER_STATUS` and
`ENGINE_TO_LEGACY_DELIVERY_STATUS` map engine statuses onto an older vocabulary —
two vocabularies still coexist.

### 4.4 Dispatch

**Trigger** — chef marks an order `READY`.

```
chef-admin  PATCH /api/orders/[id]  (status → ready)
  ↓ MasterOrderEngine  READY → DISPATCH_PENDING
  ↓ DispatchOrchestrator.createDelivery()
       ↓ DriverMatchingService
            getRawDriverSupplyData → eligible drivers
            computeDriverScores / calculateDriverAssignmentScore
            (distance via EtaService, presence, shift state, capacity)
       ↓ OfferManagementService
            create offer → assignment_attempts
            SLAManager schedules the expiry timer
       ↓ driver-app: POST /api/offers  (accept / decline)
            accept  → DeliveryEngine  OFFERED → ACCEPTED, order → DRIVER_ASSIGNED
            decline → back to UNASSIGNED, offer next candidate
            expire  → /api/engine/processors/expired-offers sweeps it
  ↓ driver progresses status via DeliveryEngine (validated transitions)
  ↓ DELIVERED → MasterOrderEngine → COMPLETED
  ↓ payout + ledger writes (PayoutEngine, ledger.service)
```

**Dead alternative path:** `packages/engine/src/services/dispatch.service.ts`
exports `dispatchOrder()` describing this same job. It is exported from the
package index and `package.json`, but **no app route calls it**. The live path is
the orchestrator chain above. See `PROJECT_BASELINE.md` §13-C5.

### 4.5 Scheduled processing

```
Vercel Cron (apps/ops-admin/vercel.json)
  ├─ 0 2 * * *  POST /api/engine/processors/sla
  ├─ 0 3 * * *  POST /api/engine/processors/expired-offers
  └─ * * * * *  POST /api/engine/processors/partner-webhooks
        ↓ validateEngineProcessorHeaders (Bearer CRON_SECRET / ENGINE_PROCESSOR_TOKEN)
        ↓ createAdminClient() → createCentralEngine()
        ↓ processor runs
        ↓ writes ops_processor_runs  ← the idempotency + observability record
        ↓ surfaces in GET /api/engine/health .readiness.processorRuns
```

`scripts/local-cron.mjs` simulates this locally against `localhost:3002`, ticking
SLA every 60 s and expired-offers every 30 s.

**Not on any scheduler.** `apps/ops-admin/src/app/api/cron/` holds five routes and
**none** is scheduled: `sla-tick` (deprecated), `expired-offers` (duplicates the
processor), and `payouts-chef-preview`, `payouts-driver-preview`,
`reconciliation-daily` — the last three have no processor equivalent, so they run
nowhere. They also do not write `ops_processor_runs`, so their absence is
invisible to `/api/engine/health`.

### 4.6 Partner API (COOCO / Hoang Gia Pho)

**Inbound** (`apps/web`):

```
partner → GET  /api/partner/storefronts
          GET  /api/partner/storefronts/[id]/menu
          POST /api/partner/checkout/quote
          POST /api/partner/checkout            → shares runCheckout()
          POST /api/partner/orders/[orderId]/cancel
   guards: lib/partner/auth (api_partner_keys) → rate-limit → signing (HMAC)
   test mode: api keys carry a test flag (migrations 00050, 00063);
              test-flagged orders transact against Stripe TEST on the same host
```

**Outbound** (`apps/ops-admin`):

```
order lifecycle event
  → partner_webhook_deliveries (enqueued)
  → cron * * * * *  /api/engine/processors/partner-webhooks
      → src/lib/partner-webhooks.ts  runPartnerWebhookProcessor()
      → HMAC-signed POST to the partner webhook_url, with retries
```

`GET /api/engine/partner-stats` exposes delivery statistics (migration 00053).

### 4.7 Kitchen OS (chef-admin)

```
recipes + recipe_versions + recipe_ingredients
   → costing.service           → recipe_cost_snapshots  → menu item cost
inventory_items + inventory_stock_movements
   → order completion → order-consumption.writer / inventory-consumption.service
                      → shared-pool auto-decrement
   → inventory_alerts → /api/inventory/reorder → purchase_orders
   → purchase_order_lines → receiving_batches → stock back in
production.engine → production_batches (+inputs/outputs) → prep_tasks
   → prep-consolidation.service → cross-brand consolidated prep sheet
labor.engine → time_entries → labor_allocations → labor_cost_snapshots
   → pay_periods → /api/labor/pay-periods/[id]/export (payroll, Path A)
kitchen-pnl.service ← inventory + labour + orders → /api/costs/pnl
```

Kitchen scoping (`kitchen_id`, added by forward-only migration `00062`) lets one
physical kitchen host multiple brands; `kitchen-scope-provider.tsx` drives the
kitchen-vs-brand split in the chef-admin sidebar.

---

## 5. Dependencies

### Internal graph (acyclic — verified: "No circular imports found")

```
                    ┌─────────┐
                    │  types  │  (leaf)
                    └────┬────┘
             ┌───────────┼───────────┐
        ┌────▼─────┐ ┌───▼────┐ ┌────▼────────┐
        │  utils   │ │ notif. │ │ validation  │
        └────┬─────┘ └───┬────┘ └────┬────────┘
             │           │           │
        ┌────▼─────┐     │           │      ┌─────────┐  ┌────────┐
        │    db    │     │           │      │ routing │  │   ui   │
        └──┬────┬──┘     │           │      └────┬────┘  └───┬────┘
           │    └────────┼───────────┼───────────┤           │
      ┌────▼───┐    ┌────▼───────────▼───────────▼────┐ ┌────▼────┐
      │  auth  │    │            engine               │ │ config  │
      └────┬───┘    └────┬────────────────────────────┘ └─────────┘
           └─────────────┤
              ┌──────────▼───────────────────────────────┐
              │  web · chef-admin · ops-admin · driver-app│
              └──────────────────────────────────────────┘
```

`engine` is the only package depending on `routing` and `notifications`.
`ops-admin` and `web` are the only apps depending directly on `routing`.

### External

Runtime: `next`, `react`, `@supabase/supabase-js`, `@supabase/ssr`, `stripe`,
`@stripe/react-stripe-js`, `@stripe/stripe-js`, `resend`, `zod`, `leaflet`,
`react-leaflet`, `lucide-react`, `@sentry/nextjs`, `@vercel/analytics`,
`@vercel/speed-insights`, `class-variance-authority`, `clsx`, `tailwind-merge`.

Twilio and Upstash are called over plain `fetch` — no SDK.

Tooling: `turbo`, `typescript`, `eslint` 9 + `typescript-eslint`, `prettier`,
`vitest`, `jest` + Testing Library, `@playwright/test`, `tsx`, `pg`, `wait-on`,
`concurrently`.

### Package export surface

`@ridendine/engine` declares 18 subpath exports. **Two point at files deleted in
Phase 3 and are broken**: `./orders` → `order.orchestrator.ts`, `./dispatch` →
`dispatch.engine.ts`. Nothing imports them, so typecheck passes.

---

## 6. Data Flows

### Write authority

| Data | Written by | Read by |
|---|---|---|
| `orders`, `order_items`, `order_status_history` | `MasterOrderEngine` / `OrderCreationService` only | all four apps |
| `deliveries`, `delivery_events`, `delivery_assignments` | `DeliveryEngine` / `DispatchOrchestrator` | ops-admin, driver-app, web (tracking) |
| `assignment_attempts` | `OfferManagementService` | ops-admin (offer history), driver-app |
| `ledger_entries`, `platform_accounts` | `ledger.service`, `stripe-webhook-finance` | ops-admin finance |
| `payout_runs`, `chef_payouts`, `driver_payouts` | `PayoutEngine`, `payout.service` | ops-admin, chef-admin, driver-app |
| `stripe_events_processed` | `stripe-webhook-idempotency` | webhook replay guard |
| `checkout_idempotency_keys` | `runCheckout` | `runCheckout` |
| `sla_timers` | `SLAManager` | SLA processor, health |
| `ops_processor_runs` | processor routes | `/api/engine/health` readiness |
| `audit_logs` | `AuditLogger` (every engine mutation) | ops-admin |
| `domain_events` | `DomainEventEmitter` | realtime subscribers |
| `partner_webhook_deliveries` | ops-admin `partner-webhooks.ts` | partner-stats |
| Kitchen-OS tables | chef-admin routes via the Kitchen-OS engines | chef-admin |
| `platform_settings` | ops-admin settings | **web middleware** (maintenance), engine |

### Realtime

`packages/db/src/realtime/{channels,events}.ts` + `hooks/use-realtime.ts` wrap
Supabase Realtime. `core/public-broadcast-sanitizer.ts` strips fields before any
public broadcast — the guard against leaking PII through realtime channels.

### Non-database state

| State | Store | Lifetime |
|---|---|---|
| Rate-limit counters | Upstash Redis | policy window |
| Maintenance-mode flag | in-process cache in `apps/web` middleware | 30 s |
| Engine singleton | module scope in `packages/engine/src/server.ts` | warm lambda lifetime |
| Session | Supabase Auth cookie | refreshed per request by middleware |
| Uploads | Supabase Storage | permanent |

---

## 7. Integration Boundaries

| Boundary | Direction | Contract | Auth |
|---|---|---|---|
| Browser → app | in | HTTP + Next.js App Router | Supabase session cookie; role checked by `platform-api-guards` |
| Partner → `apps/web` | in | REST JSON, `/api/partner/*` | API key (`api_partner_keys`) + HMAC signature + rate limit |
| Stripe → `apps/web` | in | Stripe webhook | `STRIPE_WEBHOOK_SECRET` signature |
| Stripe → `apps/ops-admin` | in | Stripe webhook | `STRIPE_WEBHOOK_SECRET_OPS` signature |
| Vercel Cron → `apps/ops-admin` | in | POST, empty body | `validateEngineProcessorHeaders` (`Bearer CRON_SECRET` / `ENGINE_PROCESSOR_TOKEN`) |
| App → Supabase | out | supabase-js / REST | anon key (RLS) or service-role key (bypasses RLS) |
| Engine → Stripe | out | Stripe SDK | `STRIPE_SECRET_KEY` (or `STRIPE_TEST_SECRET_KEY` when a request is test-flagged) |
| Engine → Resend | out | REST | `RESEND_API_KEY` — provider inert without it |
| Engine → Twilio | out | REST (`fetch`, no SDK) | `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` |
| Utils → Upstash | out | REST | `UPSTASH_REDIS_REST_URL` / `_TOKEN` |
| Engine → Nominatim | out | public HTTP | none (public OSM endpoint) |
| ops-admin → partner | out | HMAC-signed POST | shared secret per partner |
| Apps → Sentry | out | `@sentry/nextjs` | `NEXT_PUBLIC_SENTRY_DSN` |
| Apps → browsers | out | Web Push | VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`) |

### Authorization model

1. **Middleware** refreshes the Supabase session (all four apps).
2. **Actor context** — `@ridendine/engine/server` resolves
   `{ userId, role, entityId }` per request (`getCustomerActorContext`,
   chef/driver/ops equivalents, `getSystemActor`).
3. **Capability check** — `services/permissions.service.ts` +
   `services/platform-api-guards.ts` map capability × role. The capability list
   lives in `packages/types/src/capabilities.ts`.
4. **RLS** is the last line of defence in Postgres.
5. **`pnpm audit:guards`** is an architecture test asserting every API route is
   guarded — currently **passing, zero unguarded routes**.

---

## 8. Where the Architecture Is Under Strain

Cross-references to `PROJECT_BASELINE.md` §13 — evidence-based, not speculation.

| Strain | Evidence |
|---|---|
| **DB boundary is eroding** | 398 raw `.from()` calls vs a 346 baseline; ratchet failing (+52) |
| **Two dispatch implementations** | `dispatch.service.ts` (dead) exported alongside `DispatchOrchestrator` (live) |
| **Two `getEngine` functions** | per-request factory vs module-level singleton, both exported |
| **Broken package exports** | `@ridendine/engine` `./orders` and `./dispatch` point at deleted files |
| **Deprecated route still deployed** | `/api/cron/sla-tick`, self-documented as superseded |
| **Unscheduled cron routes** | reconciliation + payout previews have no scheduler |
| **Duplicate type sources** | `generated/database.types.ts` vs `database.merged.ts` (already broke a prod build once) |
| **Two status vocabularies** | `ENGINE_TO_LEGACY_*` translation maps still in use |
| **Surface docs stale** | 104 pages / 180 routes actual vs 101 / 172 asserted; 6 gates failing |
| **Orphaned UI** | chef-admin Costs page has no nav entry; its smoke test fails |
| **Oversized modules** | `DeliveryDetail.tsx` 1,250 LOC, `commerce.engine.ts` 1,051 LOC, `database.merged.ts` 1,148 LOC |
| **Single point of scheduling** | every scheduled processor lives in `ops-admin`; a bad deploy there stops SLA, offer expiry, and partner webhooks |

---

## 9. Validating This Document

Before trusting any statement here against a changed codebase:

```bash
gitnexus status
gitnexus context "<symbol>"  --repo ridendine-marketplace
gitnexus impact  "<symbol>"  --repo ridendine-marketplace --direction upstream
gitnexus trace   "<from>" "<to>" --repo ridendine-marketplace
gitnexus check --cycles --repo ridendine-marketplace
```

`--repo ridendine-marketplace` is **mandatory** — four repositories are registered
in the global GitNexus registry on this machine.

GitNexus caveats that apply to every query (reported at index time): 1,671 of
1,871 candidate entry points never ranked into the 627 flows; 226 cross-language
property sites were not linked; 3,105 callees were dropped at the branching
budget. **An empty result means "not resolved", never "does not exist."** Confirm
with a text search before concluding a symbol is unused.
