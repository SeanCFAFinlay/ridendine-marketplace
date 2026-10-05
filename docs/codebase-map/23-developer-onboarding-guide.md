# 23 — Developer Onboarding Guide

Everything here is drawn from active scripts and configuration. **Where a command was not verified during this analysis, it says so.**

---

## 1. Prerequisites

| Requirement | Version | Evidence |
|---|---|---|
| Node.js | **≥ 20** (CI uses 20; a vendored 22.16.0 sits in `.local-tools/`) | `package.json: engines.node` |
| pnpm | **9.15.0 exactly** | `package.json: packageManager` |
| Docker | required for the local Supabase stack | `supabase/config.toml` |
| Supabase CLI | for `db:migrate`, `db:seed`, `db:reset`, `supabase start` | root scripts |
| Git | | |
| PowerShell 7 (`pwsh`) | Windows only, for `tools:ensure`, `smoke:prod`, `release:verify`, `docs:obsidian-architecture` | `scripts/tools/`, `scripts/smoke/`, `scripts/release/` |

Windows shortcut: `pnpm tools:ensure` runs `scripts/tools/ensure-node-pnpm.ps1`, which provisions Node and pnpm into `.local-tools/`.

## 2. Repository layout

```
apps/           4 deployable Next.js apps  (web 3000 · chef-admin 3001 · ops-admin 3002 · driver-app 3003)
packages/       11 shared packages — engine is the important one
supabase/       migrations (forward-only, applied to production) · seeds · pgTAP RLS tests
scripts/        CI gates, smoke tests, doc generators, dev tooling
e2e/            Playwright: 6 lifecycle specs + 2 smoke specs
docs/           261 markdown files — mixed hand-written and generated, several knowingly stale
```

**Never edit:** `apps/*/.next/`, `node_modules/`, `.turbo/`, `.gitnexus/`, `.local-tools/`, any `graphify-out/` (there are 8), `archive/`, `test-results/`, `packages/db/src/generated/database.types.ts`.

## 3. Minimal safe local setup

```bash
git clone https://github.com/SeanCFAFinlay/ridendine-marketplace.git
cd ridendine-marketplace
pnpm install                 # --frozen-lockfile in CI

cp .env.example .env.local   # then fill in — see §4

supabase start               # Docker: API 54321 · DB 54322 · Studio 54323 · mail 54324
pnpm db:migrate              # supabase db push
pnpm db:seed
pnpm db:generate             # regenerate packages/db/src/generated/database.types.ts

pnpm dev                     # all four apps
```

> **Setup commands were not executed during this analysis** (read-only mandate). They are transcribed from `package.json` scripts and `supabase/config.toml`, both of which were read in full. Treat the sequence as evidence-backed but unverified end to end.

## 4. Configuration you actually need

**Minimum to boot anything:**
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from `supabase start` output>
SUPABASE_SERVICE_ROLE_KEY=<from `supabase start` output>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_CHEF_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_DRIVER_APP_URL=http://localhost:3003
```

**Add for checkout:** `STRIPE_SECRET_KEY` (`sk_test_…`), `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_…`), `STRIPE_WEBHOOK_SECRET` (from `stripe listen`).
**Add for processors:** `CRON_SECRET=anything-local`.
**Optional:** `ALLOW_DEV_AUTOLOGIN=true` — bypasses auth entirely; only honoured when `NODE_ENV !== 'production'`.

Full matrix: [`12-configuration-and-environments.md`](12-configuration-and-environments.md).

## 5. Running each unit

```bash
pnpm dev            # all four via Turbo
pnpm dev:web        # :3000  customer
pnpm dev:chef       # :3001  chef + Kitchen OS
pnpm dev:ops        # :3002  ops + processors + finance webhook
pnpm dev:driver     # :3003  driver PWA

pnpm local-cron     # POSTs the SLA and expired-offer processors against :3002
```

## 6. Verifying readiness

```bash
curl http://localhost:3000/api/health
curl http://localhost:3001/api/health
curl http://localhost:3002/api/health
curl http://localhost:3003/api/health

# deeper, requires an ops session:
curl http://localhost:3002/api/engine/health
```

Also: Supabase Studio at `http://localhost:54323`, local mail at `http://localhost:54324`.

## 7. Tests and gates

```bash
pnpm typecheck
pnpm lint
pnpm test                    # all package + app unit tests
pnpm audit:guards            # every state-changing API route has a guard
pnpm audit:db-boundary       # no NEW raw supabase.from() calls
pnpm verify:prod-data-hygiene
pnpm test:wiring-fixes       # 20 wiring assertions + 15 node --test suites

pnpm test:smoke              # Playwright @smoke only
pnpm test:e2e                # full Playwright
pnpm test:e2e:lifecycle      # needs `supabase start` + `pnpm test:e2e:setup`
```

**Verified passing during this analysis:** `audit:guards` (179 routes, 0 unguarded), `audit:db-boundary` (398 warnings = baseline), `verify:prod-data-hygiene`, `verify-known-wiring-fixes` (20/20).

Turbo caching: `pnpm exec turbo <task> --force` bypasses the cache. **Note the trap recorded in `CLAUDE.md`: `pnpm typecheck -- --force` passes `--force` through to `tsc`, which rejects it and fails.**

## 8. Where things live

| Looking for | Go to |
|---|---|
| Order lifecycle rules | `packages/engine/src/orchestrators/order-state-machine.ts` |
| Order transitions | `packages/engine/src/orchestrators/master-order-engine.ts` |
| Checkout | `apps/web/src/lib/checkout/run-checkout.ts` + `quote.ts` |
| Dispatch | `orchestrators/{dispatch-orchestrator,offer-management.service,driver-matching.service}.ts` |
| Money | `services/{ledger,payout,reconciliation}.service.ts` + `orchestrators/{commerce.engine,payout-engine}.ts` |
| Pricing constants | `packages/engine/src/constants.ts` + `services/{delivery-fee,surge-pricing,tax-config}.service.ts` |
| Auth middleware | `packages/auth/src/middleware.ts` |
| Actor contexts | `packages/engine/src/server.ts` |
| Ops permissions | `packages/engine/src/services/platform-api-guards.ts` |
| DB clients | `packages/db/src/client/{browser,server,admin}.ts` |
| Repositories | `packages/db/src/repositories/*.repository.ts` (22) |
| Schema | `supabase/migrations/` (62, forward-only) |
| Zod schemas | `packages/validation/src/` |
| Shared UI | `packages/ui/src/` |

## 9. Adding a feature safely

**A new API route**
1. Put it at `apps/<app>/src/app/api/<path>/route.ts`.
2. **Add a guard from the approved list in the first ~25 lines** — `guardPlatformApi`, `getCustomerActorContext`, `getChefActorContext`, `getOperatorKitchenContext`, `getDriverActorContext`, `validateEngineProcessorHeaders`, `verifyStripeWebhook`, `getCurrentCustomer`, `auth.getUser`, or `resolvePartnerContext`.
3. Validate the body with a Zod schema from `@ridendine/validation`.
4. Apply a rate-limit policy from `RATE_LIMIT_POLICIES`.
5. **Use a repository from `@ridendine/db`.** If your domain has none, writing it is the task — do not add another raw `.from()`; the ratchet will block you and it is right to.
6. Return `successResponse` / `errorResponse`.
7. Run `pnpm audit:guards` and `pnpm audit:db-boundary`.

**A new order status or transition**
Edit `ORDER_TRANSITION_MAP` in `order-state-machine.ts`, add the legacy mapping in `ENGINE_TO_LEGACY_ORDER_STATUS`, add a method to `MasterOrderEngine`, and add tests. `MasterOrderEngine` has a **CRITICAL** blast radius (122 dependent symbols per the GitNexus index) — determine impact before you touch it.

**A schema change**
Write a **new** forward-only migration. **Never edit an applied migration in place — that already caused a production incident** (commit `a6c72f6c`). Enable RLS on any new table and follow the three-policy pattern (`chef_manage_own_*`, `ops_read_*`, `service_role_*`). Then `pnpm db:generate` and commit the regenerated types.

**A new page or API route** — re-run `pnpm docs:wiring`… **but read §11 first.**

## 10. Debugging common failures

| Symptom | Likely cause | Check |
|---|---|---|
| `Missing Supabase admin environment variables` | `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_SERVICE_ROLE_KEY` unset | `.env.local` |
| Every route 401s | No session, or the profile row is missing / not `approved` | `customers` / `chef_profiles` / `drivers` / `platform_users` |
| Ops routes 403 | Role lacks the capability | `CAPABILITY_ROLES` in `platform-api-guards.ts` |
| Checkout `PAYMENT_CONFIG_ERROR` | `STRIPE_SECRET_KEY` missing or unsafe | `assertStripeConfigured` |
| Checkout 409 `IDEMPOTENCY_CONFLICT` | A `processing` row younger than 120 s | `checkout_idempotency_keys` |
| Order paid but never reaches the kitchen | Webhook not delivered or failing | `stripe_events_processed`; `stripe listen` locally |
| Driver receives no offers | Presence stale >90 s | `driver_presence.last_location_at` |
| Processor 401 | Both `CRON_SECRET` and `ENGINE_PROCESSOR_TOKEN` unset (fails closed) | `validateEngineProcessorHeaders` |
| `InvalidTransitionError` | Transition absent from the map | `ORDER_TRANSITION_MAP` |
| `pnpm audit:db-boundary` fails | You added a raw `.from()` | Use or write a repository |
| `pnpm audit:guards` fails | Your route has no approved guard string | Add one |

## 11. Traps — read before you touch these

1. **`pnpm docs:wiring` succeeds and then breaks the build.** The regenerated docs fail `verify-known-wiring-fixes.cjs`, which runs *first* inside `pnpm test:wiring-fixes`: 76 `| PARTIAL |` rows appear because `generate-wiring-docs.cjs:317` marks any surface with undetectable auth as PARTIAL and there is no allowlist. Refreshing these docs is a real project (auth metadata for ~76 surfaces plus missing phase-9 contracts), not a chore. The committed docs are knowingly stale.
2. **`pnpm audit:db-boundary` was re-baselined, not fixed.** 398 raw calls are accepted. If it fails, *you* added one.
3. **`dispatch.service.ts` is dead.** The live path is `DriverMatchingService → OfferManagementService → DispatchOrchestrator`.
4. **`@ridendine/engine` exports `./orders` and `./dispatch` pointing at files that do not exist.** Do not import them.
5. **Three `getEngine`-shaped factories exist; apps use `getAdminEngine`.** The other two have no production caller.
6. **`local-cron` POSTs; Vercel Cron GETs.** Your processor can work perfectly locally and do nothing in production. See R-01 — this is the single most important thing on this page.
7. **Never edit an applied migration.**
8. **Never hand-edit `packages/db/src/generated/database.types.ts`.**

## 12. Side-effecting commands to avoid

| Command | Why |
|---|---|
| `pnpm db:reset` / `db:seed` | Destroys and reseeds whatever `DATABASE_URL` points at |
| `pnpm test:load` (live mode) | Creates up to 40 real support submissions per run |
| `pnpm admin:bootstrap-super` | Creates a super-admin in the configured database |
| `POST /api/fixtures/reset` | Deletes fixture orders (triple-gated, but know it exists) |
| `pnpm docs:wiring` | Rewrites committed docs and breaks a gate — see §11 |
| `pnpm ui:command-center` | Rewrites committed screenshots and docs |

**Before running any of these, confirm what `DATABASE_URL` points at.** A production connection string has been observed in this repository's root `.env.local`.

## 13. Environment differences that will surprise you

| Aspect | Local | Production |
|---|---|---|
| Cron method | POST | **GET** — and the work is in POST (R-01) |
| Cron cadence | 30–60 s | daily / daily / minutely |
| Auth bypass | `ALLOW_DEV_AUTOLOGIN` available | hard-disabled |
| CSP | same as production | web only; the other three apps have none |
| Rate limiting | memory | memory unless Upstash is set |
| Email/SMS | Inbucket if configured | UNKNOWN (U-02) |
| Error tracking | none | **also none** (R-03) |

## 14. The first five files to read, and why

1. **`packages/engine/src/orchestrators/order-state-machine.ts`** (373 lines) — the complete vocabulary of the business. Every status, every legal transition, the legacy mapping. Read this and you can reason about anything else.
2. **`apps/web/src/lib/checkout/run-checkout.ts`** (614 lines) — the revenue path end to end: server re-quote, risk, readiness, idempotency, order creation, Stripe, compensating cleanup. It is also the best-engineered file in the repository and sets the standard the rest is measured against.
3. **`packages/engine/src/core/engine.factory.ts`** (197 lines) — the object graph. What exists, what depends on what, and the fact that everything is constructed per request on the service-role client.
4. **`packages/engine/src/services/platform-api-guards.ts`** — the entire authorization model in one table. Nothing about permissions lives anywhere else.
5. **`apps/ops-admin/vercel.json`** (20 lines) — the only scheduler in the system. Then open the three routes it names and look at which HTTP methods do the work. That comparison is the fastest way to understand both how this system runs and how it currently doesn't.
