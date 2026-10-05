# 01 — Executive Summary

**Ridendine marketplace · architecture map · 2026-09-08 · branch `feat/cooco-partner-webhooks-realtime` @ `c8b9049d`**

---

## Purpose

Ridendine is a **chef-first food-delivery marketplace for Hamilton, Ontario**. Home and ghost-kitchen chefs list storefronts; customers order; independent drivers deliver; a central engine moves the order, the delivery and the money through a validated state machine. On top of the marketplace the repository has grown a full **Kitchen Operating System** (recipes, costing, inventory, suppliers, purchasing, production planning, labour, P&L) and a **partner API** that lets third-party storefronts sell through Ridendine as merchant of record.

Delivery radius is hard-coded to **25 km around Hamilton city centre** (`packages/engine/src/services/geocoding.service.ts: HAMILTON_CENTER_LAT/DELIVERY_RADIUS_KM`). VERIFIED.

## Repository type and scale

pnpm/Turborepo monorepo. **1,107 source files** (TS/TSX/CJS/MJS/SQL/PS1) after excluding generated trees.

| | Count |
|---|---|
| Deployable applications | 4 |
| Shared packages | 11 (10 with source) |
| Pages (`page.tsx`) | 104 |
| API routes (`route.ts`) | 180 |
| Database migrations | 62 (`00061` intentionally absent) |
| Database tables | 112 — all 112 have RLS enabled |
| DB policies / functions / triggers | 316 / 34 / 37 |
| Test files | 250 |
| Commits | 412 |

## Active deployable units

| Unit | Port | Production host | Extra runtime role |
|---|---|---|---|
| `apps/web` | 3000 | `ridendine.ca` | Customer marketplace **+ partner API + customer Stripe webhook** |
| `apps/chef-admin` | 3001 | `chef.ridendine.ca` | Chef dashboard + Kitchen OS |
| `apps/ops-admin` | 3002 | `ops.ridendine.ca` | Ops console **+ all three Vercel Cron processors + finance Stripe webhook** |
| `apps/driver-app` | 3003 | `driver.ridendine.ca` | Driver PWA |

No app imports another app; they communicate **only through the shared Postgres database**. VERIFIED (workspace dependency graph in the four `package.json` files).

## Primary workflow

Customer browses → cart → `POST /api/checkout` → **`runCheckout()`** (server-side re-quote, risk check, kitchen-readiness check, idempotency claim, order creation via the engine, Stripe PaymentIntent) → customer confirms card → **Stripe `payment_intent.succeeded` webhook** authorises payment and calls `submitToKitchen` → chef accepts → prepares → marks ready → `DispatchOrchestrator` creates the delivery and offers it to ranked drivers → driver accepts, picks up, delivers → order `COMPLETED` → ledger + payout rows written → customer may review.

`apps/web/src/lib/checkout/run-checkout.ts: runCheckout` is the single checkout implementation, shared verbatim by the customer app and the partner API. Transitions are policed by `packages/engine/src/orchestrators/order-state-machine.ts`; anything not in the map throws `InvalidTransitionError`. VERIFIED. Full 24-step trace in `08-workflows-and-domain-logic.md`.

## Authoritative data stores

One store of record: **Supabase PostgreSQL 17**. Everything else is derived or external.

| Domain | Authoritative table(s) |
|---|---|
| Order lifecycle | `orders` (`engine_status` canonical, `status` legacy mirror) |
| Delivery lifecycle | `deliveries`, `assignment_attempts` |
| Money | `ledger_entries` (unique index on `idempotency_key`), `payout_runs`, `payouts` |
| Checkout de-duplication | `checkout_idempotency_keys` |
| Webhook de-duplication | `stripe_events_processed` |
| Identity | Supabase `auth.users` + `platform_users` / `chef_profiles` / `drivers` / `customers` |
| Kitchen OS | `recipes*`, `inventory_*`, `purchase_orders*`, `production_*`, `kitchen_*`, `labor_*`, `time_entries` |

Payment truth is **shared** with Stripe: Stripe owns the charge, Ridendine owns the ledger, and `ReconciliationService` is the intended bridge — but see risk R-02 below.

## Critical external dependencies

| Service | Required? | Failure impact |
|---|---|---|
| **Supabase** (Postgres + Auth + Storage + Realtime) | Hard | Total outage. Every request path opens a Supabase client. |
| **Stripe** | Hard for revenue | No checkout, no payouts, no refunds. |
| **Vercel** | Hard | Hosting, build, and the only scheduler. |
| **OSRM public demo server** (`router.project-osrm.org`) | Soft, unkeyed | Driver ranking and ETA degrade. Third-party free endpoint with a fair-use policy; no key, no contract, no SLA. |
| **Nominatim public** (`nominatim.openstreetmap.org`) | Soft, unkeyed | Address geocoding and delivery-zone validation degrade. |
| Resend (email), Twilio (SMS) | Optional | Falls back to in-database notifications. |
| Upstash Redis | Optional | Rate limiting silently degrades to per-instance memory. |
| Sentry | Declared | **Not actually initialised** — see finding V-03. |

## Security and trust model

Five trust boundaries: public internet → Next.js middleware (session) → route handler (capability guard) → engine → database.

The structural fact that governs everything else: **every API route runs as the Supabase service role.** All four apps import `getAdminEngine()`, which builds the engine on `createAdminClient()` — the service-role client that bypasses RLS by design (`packages/db/src/client/admin.ts`). RLS's 316 policies therefore protect *direct* client access to Postgres, **not** the API tier. On the API tier, authorization is enforced entirely in application code:

- `packages/auth/src/middleware.ts` — verifies the session with `supabase.auth.getUser()` (JWT verified server-side, not `getSession()`). Correct choice, explicitly commented.
- `packages/engine/src/services/platform-api-guards.ts: CAPABILITY_ROLES` — a server-side capability × role matrix for every ops surface, fail-closed.
- `packages/engine/src/server.ts` — per-actor context resolvers plus explicit `verifyChefOwnsOrder` / `verifyDriverOwnsDelivery` ownership checks.
- `scripts/audit/check-api-route-guards.mjs` — CI gate. **Passes: 179 routes, 0 unguarded.**

This is a coherent design, well executed. Its weakness is that the gate proves the guard *string exists in the file*, not that it runs before the mutation, and it ignores `GET` handlers entirely.

## Top five VERIFIED risks

| # | Risk | Evidence | Consequence |
|---|---|---|---|
| **R-01** | **Scheduled work almost certainly never runs in production.** All three Vercel-scheduled processors do their work in `POST`; their `GET` handler is a no-op health response. Vercel Cron invokes cron paths with `GET`. | `apps/ops-admin/vercel.json: crons[]` vs `apps/ops-admin/src/app/api/engine/processors/{sla,expired-offers,partner-webhooks}/route.ts: export async function GET` | SLA breaches never fire, chef-acceptance timeouts never auto-cancel, driver-assignment escalations never raise, stale delivery offers never expire, partner webhooks never deliver. Confidence 0.90 — see EV-021. |
| **R-02** | **Stripe↔ledger reconciliation is scheduled nowhere.** `reconciliation-daily` is a legacy `/api/cron/*` route absent from `vercel.json`, with no processor equivalent. | `apps/ops-admin/vercel.json`; `apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts` | Money divergence between Stripe and `ledger_entries` is only ever found if an operator manually POSTs `/api/engine/reconciliation`. Meanwhile `/api/engine/health` advertises it as a tracked processor, so its readiness field reads `null` forever. |
| **R-03** | **Sentry is a dependency, not a monitor.** `@sentry/nextjs@9.47.1` is installed and four `sentry.*.config.ts` files exist per app, but no `next.config.js` calls `withSentryConfig`, there is no `instrumentation.ts`, and nothing under `apps/*/src` imports `@sentry/nextjs`. The built `.next` output contains no Sentry code. | `apps/*/next.config.js`; `grep @sentry/nextjs apps/*/src` → 0 hits | Unhandled server errors produce no alert anywhere. The platform is effectively blind in production. |
| **R-04** | **The ops batch payout run has no trigger.** `/api/engine/payouts/{preview,execute,instant}` exist and are correctly guarded, but no page or component in `apps/ops-admin/src` fetches them; `/dashboard/finance/payouts` is a read-only list. The preview cron routes are unscheduled. | `grep -rn "engine/payouts/" apps/ops-admin/src` excluding the route files → 0 hits | Batch chef/driver payout runs can only be started by hand-crafting an HTTP request with an ops session cookie. |
| **R-05** | **Referral sharing is broken twice over.** The share link is built as `https://ridendine.com/signup?ref=CODE`. Production is `ridendine.ca`, and the signup page is `/auth/signup` — `/signup` does not exist. | `apps/web/src/components/profile/referral-dashboard.tsx: BASE_URL, buildReferralLink`; `apps/web/src/app/` has no `signup/` | Every shared referral link 404s on a domain the company may not control. The capture logic on `/auth/signup?ref=` works correctly and never receives traffic. |

## Top five unknowns

| # | Unknown | What would resolve it |
|---|---|---|
| U-01 | Does Vercel Cron actually execute the processors? (R-01) | `SELECT processor_name, max(finished_at) FROM ops_processor_runs GROUP BY 1` on production, or the Vercel cron invocation log. |
| U-02 | Which optional env vars are set in production — `UPSTASH_*`, `RESEND_API_KEY`, `TWILIO_*`, `STRIPE_WEBHOOK_SECRET_OPS`, `NEXT_PUBLIC_SENTRY_DSN`? | Vercel project → Environment Variables, per app. |
| U-03 | Are both Stripe webhook endpoints registered, and for which event types? | Stripe Dashboard → Developers → Webhooks. |
| U-04 | Is any database backup/restore actually configured and tested? `docs/BACKUP_AND_ROLLBACK.md` exists; nothing in the repository proves a schedule or a restore drill. | Supabase project → Database → Backups. |
| U-05 | Real traffic, latency and volume. Every performance statement in §18 is a hypothesis with a named measurement, not a benchmark. | Vercel Analytics / Supabase metrics. |

## Operational readiness

**Not production-ready as an unattended system; workable as an attended one.**

Strong: four green CI gates, an auth-guard audit over every route, forward-only migrations, idempotency at every money boundary (checkout keys, Stripe event keys, ledger keys, processor run keys), a fail-closed capability matrix, RLS on all 112 tables, CSP with per-request nonce, `getUser()` over `getSession()`.

Weak: no working error monitoring (R-03), no working scheduler (R-01), no reconciliation (R-02), no payout trigger (R-04), rate limiting that silently degrades to per-instance memory when Upstash is unset, and a runbook whose recovery procedures largely live in people's heads.

## Test confidence

**Moderate for logic, low for integration.** 250 test files; the engine alone has 62. But:
- `packages/{routing,validation,types,ui,notifications}` have 15 test files between them and **no CI job runs them** — `ci.yml` names engine, db, auth, utils, web, ops-admin, chef-admin, driver-app only.
- Playwright on PR runs `--grep @smoke` only; the full lifecycle suite runs nightly.
- pgTAP RLS tests exist (`supabase/tests/rls/`) but **no workflow executes them**.
- No test covers the cron→processor HTTP contract, which is exactly where R-01 lives.

## Recommended next three actions

1. **Prove or fix the scheduler (R-01).** Query `ops_processor_runs` in production. If it is empty or stale, add `export const GET = POST` to the three processor routes (or switch to a POST-capable scheduler) and add a contract test asserting `GET` performs work. This single change is the difference between an automated platform and a manual one.
2. **Turn on error monitoring (R-03).** Wrap each `next.config.js` in `withSentryConfig`, add `instrumentation.ts`, and confirm one test exception arrives. Until this is done, no other reliability work is measurable.
3. **Give reconciliation and payout runs a real trigger (R-02, R-04).** Move `reconciliation-daily` to `/api/engine/processors/*` with `ops_processor_runs` tracking and add it to `vercel.json`; add the "Run payout" control to `/dashboard/finance/payouts`.

## Index

| Document | Contents |
|---|---|
| [00 Scope & method](00-analysis-scope-and-method.md) | Configuration, exclusions, commands run, analysis log |
| [02 Plain language](02-plain-language-codebase-explainer.md) | The system with no jargon |
| [03 Repository inventory](03-repository-inventory.md) | Directory-purpose table, exclusions |
| [04 System context](04-system-context.md) | Actors and external systems |
| [05 Component catalog](05-component-catalog.md) | 20 components in full |
| [06 Connection register](06-connection-register.md) | 38 connections, NET-001…NET-066 |
| [07 Startup & runtime](07-startup-and-runtime-sequences.md) | Entry points, boot order |
| [08 Workflows & domain logic](08-workflows-and-domain-logic.md) | Checkout traced; all pricing/dispatch rules |
| [09 Data & source of truth](09-data-state-and-source-of-truth.md) | 112 tables, ownership matrix |
| [10 Interfaces & journeys](10-interfaces-and-user-journeys.md) | 104 pages, 180 routes, 5 journeys |
| [11 External dependencies](11-external-dependencies.md) | 13 services classified |
| [12 Configuration](12-configuration-and-environments.md) | 49 env vars, precedence, drift |
| [13 Security & trust](13-security-and-trust-boundaries.md) | Boundaries, authz matrix, findings |
| [14 Reliability](14-reliability-and-failure-modes.md) | 17 failure modes |
| [15 Tests](15-tests-and-verification-coverage.md) | Coverage matrix, CI gaps |
| [16 Deployment](16-deployment-and-operations.md) | Local vs production topology |
| [17 Observability](17-observability-runbook.md) | The 8 operator questions |
| [18 Performance](18-performance-and-capacity.md) | 9 hypotheses + measurements |
| [19 Cost drivers](19-cost-driver-map.md) | Drivers only, no prices |
| [20 Legacy & dead code](20-legacy-duplicate-and-dead-code.md) | 11 classified items |
| [21 Contradictions](21-contradictions-and-unknowns.md) | 14 contradictions, 12 unknowns |
| [22 Risk register](22-risk-and-improvement-register.md) | 60 findings |
| [23 Onboarding](23-developer-onboarding-guide.md) | Setup, first five files |
| [24 Runbook](24-operator-runbook.md) | Procedures; gaps labelled |
| [25 Evidence index](25-evidence-index.md) | EV-001…EV-127 |
| [26 Glossary](26-glossary.md) | Terms |
| [Diagrams](diagrams/) | 10 Mermaid sources · [viewer](codebase-map.html) |
| **[Program Map](program-map/00-INDEX.md)** | **Complete file-level enumeration** — every one of 1,126 files, 180 routes, 104 pages, 62 migrations, every exported symbol, table-usage and env matrices, plus [6 additional findings](program-map/15-findings-from-the-file-level-pass.md) |
