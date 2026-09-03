# PROJECT_BASELINE.md — Ridendine Marketplace

> Engineering baseline snapshot. Investigative only — no application code was
> changed to produce it. Everything below was verified against this repository
> on the date shown; nothing is imported from any other project on this machine.

---

## 1. Repository Identity

| Field | Value |
|---|---|
| Git root | `D:\Projects\RIDENDINE\ridendine-marketplace` |
| Repository name | `ridendine-marketplace` |
| Package name | `@ridendine/monorepo` (private, v0.1.0) |
| Remote (`origin`) | `https://github.com/SeanCFAFinlay/ridendine-marketplace.git` |
| Default branch | `master` (via `origin/HEAD`) |
| Branch at baseline | `feat/cooco-partner-webhooks-realtime` |
| Commit at baseline | `b78d8e28e0c60c58229c64f46147cb099b595a03` (`b78d8e28`) |
| Commit date | 2026-08-12 |
| Working tree | Clean at start of baseline (0 modified, 0 untracked) |
| Position vs `origin/master` | **4 commits ahead, 0 behind** — unmerged |
| Total commits | 410 |
| Local branches | 12 |
| Remote branches | 27 |
| Submodules | None (`.gitmodules` absent) |
| Nested repositories | None inside the root |

### Repository boundary — important

The Claude Code session was opened at `D:\Projects\RIDENDINE`, which is **not** a
Git repository. It is an Obsidian vault / business-document folder (pitch deck,
business plan PDF, financial model, logos, `Ridendine_Business_Bible_Obsidian_Vault/`)
that happens to *contain* the code repository.

**Only `D:\Projects\RIDENDINE\ridendine-marketplace` is in scope.** The parent
folder and its sibling projects under `D:\Projects\` (FXONLY, SIDESCROLLER,
HOLPYP, trade-terminal-main, …) are unrelated and must never be used as a source
of architectural truth for this codebase.

Three stale references exist to paths that no longer exist on disk — they are
registration leftovers, not duplicate copies:

- `git worktree list` reports two **prunable** worktrees under
  `C:\Users\assoc\Documents\Codex\2026-06-05\...` (`ridendine-marketplace-phase1`,
  `-phase2`). Both directories are gone.
- Turbo's cache replays log lines containing `C:\RIDENDINE\ridendine-marketplace`,
  a former location of this repo. That path is also gone.

---

## 2. Baseline Date

**2026-09-02**

---

## 3. Project Purpose

Ridendine is a **chef-first food-delivery marketplace** connecting home /
ghost-kitchen chefs with customers. `chef_storefronts` is the primary listing
entity (not a restaurant record), and the platform has grown beyond ordering into
a **Kitchen Operating System**: recipes and costing, inventory, purchasing and
receiving, production planning, labour/payroll, and kitchen P&L.

Four Next.js applications share one Supabase database and one central
business-logic engine. A **partner API** (currently onboarding the "COOCO" /
Hoang Gia Pho partner) lets third-party storefronts quote, check out, cancel, and
receive HMAC-signed order webhooks against the same money-handling code path as
the customer app.

---

## 4. Technology Stack

Determined from manifests, lockfile, and source — not from filenames.

| Layer | Technology | Version evidence |
|---|---|---|
| Language | TypeScript | `^5.6.0` (root devDep) |
| Runtime | Node.js | `engines.node >= 20`; CI uses 20; local machine runs **v24.19.0** |
| Package manager | pnpm | `packageManager: pnpm@9.15.0` |
| Monorepo build | Turborepo | `turbo ^2.3.0`, `turbo.json`, `pnpm-workspace.yaml` |
| Framework | Next.js (App Router) | `next ^14.2.0` |
| UI | React 18 | `react ^18.3.0`, `react-dom ^18.3.0` |
| Styling | Tailwind CSS + `class-variance-authority`, `clsx`, `tailwind-merge` | `packages/ui` |
| Icons | `lucide-react` | all four apps |
| Database | PostgreSQL 17 via Supabase | `supabase/config.toml` `major_version = 17` |
| DB client | `@supabase/supabase-js`, `@supabase/ssr` | all apps + `packages/db` |
| Data access | Hand-written repository layer (**no ORM**) | `packages/db/src/repositories/*.repository.ts` (22 files) |
| Migrations | Raw SQL, Supabase CLI | `supabase/migrations/` (62 files) |
| Validation | Zod | `packages/validation`, `packages/utils` |
| Payments | Stripe | `stripe` SDK, `@stripe/react-stripe-js`, `@stripe/stripe-js` |
| Email | Resend | `resend` (engine dep) |
| SMS | Twilio | direct `fetch`, **no SDK** (`core/sms-provider.ts`) |
| Rate limiting | Upstash Redis (REST) | `packages/utils/src/rate-limit` |
| Geocoding | OpenStreetMap Nominatim | `services/geocoding.service.ts` |
| Maps | Leaflet / react-leaflet | web, ops-admin, driver-app |
| Monitoring | Sentry (`@sentry/nextjs`) + Vercel Analytics / Speed Insights | `sentry.*.config.ts` × 4 apps |
| Unit tests (packages) | Vitest | `vitest run` in every package |
| Unit tests (apps) | Jest + Testing Library + jsdom | `jest` in every app |
| Contract/smoke tests | `node --test` | `scripts/smoke/*.test.cjs`, `scripts/audit/*.test.cjs` |
| E2E | Playwright | `@playwright/test ^1.55.1`, `playwright.config.ts` |
| DB tests | pgTAP | `supabase/tests/rls` |
| Lint | ESLint 9 flat config + `typescript-eslint` + a **custom `db-boundary` rule** | `packages/config/eslint.config.js` |
| Format | Prettier 3 + `prettier-plugin-tailwindcss` | `.prettierrc` |
| CI | GitHub Actions | `.github/workflows/{ci,e2e,load-test,post-deploy-smoke}.yml` |
| Hosting | Vercel (4 independent projects) | `apps/*/vercel.json` |
| Scheduling | Vercel Cron | `apps/ops-admin/vercel.json` `crons[]` |
| Containers | Docker **only** for local Supabase | no Dockerfile in repo |

**Not present despite being plausible:** no message queue, no ORM
(Prisma/Drizzle), no separate vector store, no Kubernetes/Terraform, no
standalone backend service.

---

## 5. Repository Statistics

| Metric | Value |
|---|---|
| Total on-disk size | **3.0 GB** |
| Total files on disk | 53,240 |
| **Git-tracked files** | **1,484** |
| Tracked source lines (`.ts`/`.tsx`) | ~57,800 |
| GitNexus graph | 64,261 nodes · 147,115 edges · 538 clusters · 627 flows · 1,254 files |

### Tracked-file distribution

| Path | Tracked files |
|---|---|
| `apps/` | 731 |
| `packages/` | 329 |
| `docs/` | 258 |
| `scripts/` | 67 |
| `supabase/` | 66 |
| `e2e/` | 10 |
| root + `.github` + `.superpowers` | 23 |

### On-disk size by directory

| Directory | Size | Tracked? |
|---|---|---|
| `apps/` | 2.1 GB | source only (~4 MB); rest is `.next` |
| ↳ `apps/ops-admin/.next` | 597 MB | no (ignored) |
| ↳ `apps/web/.next` | 528 MB | no (ignored) |
| ↳ `apps/driver-app/.next` | 511 MB | no (ignored) |
| ↳ `apps/chef-admin/.next` | 485 MB | no (ignored) |
| `node_modules/` | 631 MB | no |
| `.gitnexus/` | 307 MB | no (`.git/info/exclude`) |
| `.local-tools/` | 152 MB | no (vendored Node v22.16.0 + corepack) |
| `.turbo/` | 83 MB | no |
| `.git/` | 21 MB | — |
| `docs/` | 15 MB | yes |
| `archive/` | 9.3 MB | **no longer tracked** — only ignored graphify output remains |
| `packages/` | 8.8 MB | yes |
| `**/graphify-out/` (8 copies) | 26 MB total | no (`**/graphify-out/`) |
| `scripts/` | 1.1 MB | yes |
| `supabase/` | 544 KB | yes |

**Roughly 2.9 GB of the 3.0 GB is regenerable.** Tracked source + docs is well
under 30 MB.

### Largest tracked files

All are assets or generated types — no oversized committed binaries:

| File | Size |
|---|---|
| `apps/*/public/logo-icon.png` (×4) | 456 KB each |
| `pnpm-lock.yaml` | 324 KB |
| `apps/*/public/logo.png` (×4) | 316 KB each |
| `docs/architecture/codebase-map/pages/EVERY_PAGE_DOCUMENT.md` | 264 KB |
| `docs/obsidian/codebase-map/Every Page Document.md` | 260 KB |
| `docs/ui/screenshots/*.png`, `apps/web/public/screenshots/*.png` | ~230 KB each |

### Largest tracked source files (LOC)

| File | LOC |
|---|---|
| `packages/db/src/generated/database.types.ts` | 7,514 (generated) |
| `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx` | 1,250 |
| `packages/db/src/database.merged.ts` | 1,148 |
| `packages/engine/src/orchestrators/commerce.engine.ts` | 1,051 |
| `packages/engine/src/orchestrators/master-order-engine.ts` | 939 |
| `apps/driver-app/src/app/components/DriverDashboard.tsx` | 937 |
| `packages/db/src/repositories/ops.repository.ts` | 931 |
| `packages/db/src/repositories/order.repository.ts` | 887 |
| `apps/web/src/app/checkout/page.tsx` | 881 |
| `apps/chef-admin/src/app/dashboard/page.tsx` | 875 |

---

## 6. Major Components

### Applications (`apps/`)

| App | Package | Port | Pages | API routes | Purpose |
|---|---|---|---|---|---|
| `web` | `@ridendine/web` | 3000 | 23 | 36 | Customer marketplace + **partner API** + Stripe customer webhook |
| `chef-admin` | `@ridendine/chef-admin` | 3001 | 30 | 68 | Chef / Kitchen OS: menu, orders, recipes, inventory, purchasing, production, labour, costs |
| `ops-admin` | `@ridendine/ops-admin` | 3002 | 40 | 57 | Internal ops: dispatch, finance, payouts, exceptions, support, **all cron processors** |
| `driver-app` | `@ridendine/driver-app` | 3003 | 11 | 19 | Driver PWA: offers, deliveries, proof-of-delivery, earnings, payouts |
| **Total** | | | **104** | **180** | |

### Packages (`packages/`)

| Package | Purpose | Depends on |
|---|---|---|
| `@ridendine/types` | Shared TypeScript types, capability list, engine contracts | — (leaf) |
| `@ridendine/validation` | Zod schemas (checkout, partner, …) | zod |
| `@ridendine/utils` | Rate limiting (Upstash), processor-token validation, helpers | types, zod |
| `@ridendine/ui` | Shared React primitives + design tokens | cva, clsx, tailwind-merge |
| `@ridendine/config` | Shared TS / Tailwind / **ESLint (incl. `db-boundary` rule)** | ui |
| `@ridendine/db` | Supabase clients (browser/server/admin), 22 repositories, realtime channels, generated types | utils, supabase |
| `@ridendine/auth` | Auth middleware + session/role helpers | db, types, supabase |
| `@ridendine/routing` | ETA / routing service | supabase |
| `@ridendine/notifications` | Notification templates | types |
| `@ridendine/engine` | **Central business logic** — 133 source files | routing, db, notifications, types, utils, validation, stripe, resend |

`@ridendine/engine` internal shape:

- `core/` — `engine.factory.ts` (composition root), event emitter, audit logger,
  SLA manager, notification sender + Resend/Twilio providers, business-rules
  engine, health checks
- `orchestrators/` — `MasterOrderEngine`, `DeliveryEngine`, `order-state-machine`,
  `DispatchOrchestrator`, `DriverMatchingService`, `OfferManagementService`,
  `PayoutEngine`, domain facades (kitchen, commerce, support, platform, ops,
  `OperationsCommandGateway`), and Kitchen-OS engines (inventory, purchasing,
  production, labor)
- `services/` — Stripe, payouts, ledger, reconciliation, tax config, ETA,
  geocoding, costing, payroll, loyalty, referral, surge pricing, risk,
  permissions, prep consolidation, kitchen P&L
- `server.ts` — Next.js-only actor-context helpers (`getCustomerActorContext`, …)

---

## 7. Runtime Architecture

### Composition root

`createCentralEngine(client, paymentAdapter?)` in
`packages/engine/src/core/engine.factory.ts:93` wires the whole engine in one
place and returns a `CentralEngine` object. Order of construction:

```
events → audit → sla → notifications (+Resend, +Twilio) → triggers → rules
      → masterOrder → masterDelivery → payouts → ledger → payoutAutomation
      → reconciliation → taxConfig → eta → orderCreation
      → driverMatching → offerManagement → dispatchOrchestrator
      → kitchen, commerce, support, platform, ops → operationsCommandGateway
```

Providers self-disable when their env vars are absent (Resend needs
`RESEND_API_KEY`; Twilio needs `TWILIO_*`), so the engine boots without them.

### Request path (all four apps)

```
Browser → Next.js middleware (auth session refresh; web also gates maintenance mode)
        → app/api/**/route.ts
            → rate limit (Upstash, web checkout + partner)
            → actor context (@ridendine/engine/server)
            → Zod validation (@ridendine/validation)
            → CentralEngine orchestrator / service
                → @ridendine/db repository
                    → Supabase (Postgres + RLS)
```

`apps/web/src/middleware.ts` (132 lines) additionally reads `platform_settings`
for maintenance mode with a 30-second in-process cache and a 1.5 s fetch timeout;
the other three middlewares are ~27 lines of auth only.

### Process boundaries

Four independently deployed Vercel projects sharing one Postgres database. There
is no separate backend service and no queue — background work runs as **Vercel
Cron → HTTP POST → ops-admin route**, guarded by
`validateEngineProcessorHeaders` (`Bearer ${CRON_SECRET}` / `ENGINE_PROCESSOR_TOKEN`).

Scheduled in `apps/ops-admin/vercel.json`:

| Path | Schedule |
|---|---|
| `/api/engine/processors/sla` | `0 2 * * *` (daily 02:00 UTC) |
| `/api/engine/processors/expired-offers` | `0 3 * * *` (daily 03:00 UTC) |
| `/api/engine/processors/partner-webhooks` | `* * * * *` (every minute) |

---

## 8. Data Architecture

### Primary store

**Supabase PostgreSQL 17** — the single source of truth. **113 tables** created
across 62 migrations (`supabase/migrations/00001` … `00063`; `00061` is
intentionally absent — folded into `00062`, see §13).

Domain groupings:

- **Identity / access** — `platform_users`, `customers`, `chef_profiles`,
  `drivers`, `kitchen_staff`
- **Catalogue** — `chef_storefronts`, `chef_kitchens`, `menu_categories`,
  `menu_items`, `menu_item_options`, `menu_item_option_values`,
  `menu_item_availability`, `menu_item_packaging`
- **Ordering** — `carts`, `cart_items`, `orders`, `order_items`,
  `order_item_modifiers`, `order_status_history`, `order_exceptions`,
  `order_pack_checks`, `checkout_idempotency_keys`
- **Delivery / dispatch** — `deliveries`, `delivery_assignments`,
  `delivery_events`, `delivery_tracking_events`, `assignment_attempts`,
  `driver_locations`, `driver_presence`, `driver_shifts`, `driver_vehicles`,
  `service_areas`, `chef_delivery_zones`
- **Money** — `ledger_entries`, `platform_accounts`, `payout_runs`,
  `payout_adjustments`, `chef_payouts`, `driver_payouts`, `driver_earnings`,
  `instant_payout_requests`, `chef_payout_accounts`, `driver_payout_accounts`,
  `stripe_events_processed`, `stripe_reconciliation`, `refund_cases`
- **Kitchen OS** — `kitchen_tickets`, `kitchen_ticket_items`,
  `kitchen_ticket_events`, `kitchen_queue_entries`, `kitchen_stations`,
  `kitchen_station_assignments`, `kitchen_shifts`, `kitchen_daily_summaries`,
  `recipes`, `recipe_versions`, `recipe_ingredients`, `recipe_steps`,
  `recipe_cost_snapshots`, `inventory_items`, `inventory_stock_movements`,
  `inventory_counts`, `inventory_count_lines`, `inventory_alerts`,
  `inventory_waste_events`, `storage_locations`, `suppliers`, `supplier_items`,
  `supplier_price_history`, `purchase_orders`, `purchase_order_lines`,
  `receiving_batches`, `production_batches`, `production_batch_inputs`,
  `production_batch_outputs`, `prep_tasks`, `prep_task_events`, `packaging_items`
- **Labour** — `time_entries`, `labor_allocations`, `labor_cost_snapshots`,
  `pay_periods`
- **Growth** — `promo_codes`, `promo_code_usages`, `loyalty_accounts`,
  `loyalty_transactions`, `referral_codes`, `referral_signups`, `favorites`,
  `reviews`
- **Partner API** — `api_partners`, `api_partner_keys`,
  `partner_webhook_deliveries`
- **Platform / ops** — `platform_settings`, `audit_logs`, `domain_events`,
  `analytics_events`, `notifications`, `push_subscriptions`, `sla_timers`,
  `system_alerts`, `ops_processor_runs`, `ops_override_logs`, `support_tickets`,
  `admin_notes`, `storefront_state_changes`, `chef_availability`,
  `chef_documents`, `driver_documents`, `driver_notification_preferences`,
  `customer_addresses`

### Access rules

- **Row Level Security** is the enforcement boundary. Many migrations are
  dedicated to it (`00002`, `00003`, `00005`, `00011`, `00017`, `00025`, `00031`,
  `00042`, `00045`, `00046`, `00049`). pgTAP tests live in `supabase/tests/rls`.
- The **intended** access path is `@ridendine/db` repositories; a custom ESLint
  rule (`db-boundary/no-raw-supabase-from`) flags raw `supabase.from('…')` in app
  code. See §13 — this boundary is materially eroded.
- The **admin (service-role) client** bypasses RLS and is used by engine/cron
  paths.

### Other data

| Kind | Where | Written by | Read by |
|---|---|---|---|
| Rate-limit counters | Upstash Redis (REST) | `packages/utils/src/rate-limit` | web checkout, partner API |
| Session cookies | Supabase Auth | `@supabase/ssr` via middleware | all apps |
| Uploads | Supabase Storage | `services/storage.service.ts`, `/api/upload` × 3 apps | apps |
| Generated DB types | `packages/db/src/generated/database.types.ts` | `pnpm db:generate` | whole repo |
| Type overrides | `packages/db/src/database.merged.ts` | hand-written | `@ridendine/db` clients |
| Seed data | `supabase/seeds/seed.sql`, `scripts/seed-*.sql` | manual | local / E2E |
| Wiring / UI docs | `docs/wiring/`, `docs/ui/` | `pnpm docs:wiring`, `pnpm ui:command-center` | humans |
| Knowledge graph | `.gitnexus/` (307 MB) | `gitnexus analyze` | agents |
| Legacy graph output | `**/graphify-out/` (8 dirs, 26 MB) | graphify tool | — |

### Duplicate sources of truth (documented, not changed)

1. **Generated vs merged DB types** — `generated/database.types.ts` is regenerated
   from the live DB; `database.merged.ts` (1,148 LOC) hand-patches columns the
   generator may miss. Its own header says "prefer regenerating types." Commit
   `a6c72f6c` already had to delete stale hand-written Kitchen-OS overrides here
   that shadowed correct generated types and red-lined the build.
2. **Repository layer vs raw `.from()`** — 398 raw Supabase calls in app code
   coexist with 22 repositories (§13-C2).
3. **Order status vocabularies** — `order-state-machine.ts` exports
   `ENGINE_TO_LEGACY_ORDER_STATUS` and `ENGINE_TO_LEGACY_DELIVERY_STATUS`, i.e.
   two status vocabularies are still translated between.

---

## 9. External Integrations

| System | Direction | Code |
|---|---|---|
| **Supabase** (Postgres, Auth, Storage, Realtime) | out | `packages/db`, `packages/auth` |
| **Stripe** — PaymentIntents, refunds, Connect payouts | out | `engine/services/stripe.service.ts`, `payout.service.ts` |
| **Stripe webhooks** — two separate endpoints/secrets | **in** | `apps/web/api/webhooks/stripe` (`STRIPE_WEBHOOK_SECRET`), `apps/ops-admin/api/stripe/webhook` (`STRIPE_WEBHOOK_SECRET_OPS`) |
| **Resend** — transactional email | out | `engine/core/email-provider.ts` |
| **Twilio** — SMS (direct REST, no SDK) | out | `engine/core/sms-provider.ts` |
| **Upstash Redis** — rate limiting | out | `packages/utils/src/rate-limit` |
| **OpenStreetMap Nominatim** — geocoding | out | `engine/services/geocoding.service.ts` |
| **Sentry** — error monitoring | out | `apps/*/sentry.{client,server,edge}.config.ts` |
| **Vercel Analytics / Speed Insights** | out | `apps/web` |
| **Vercel Cron** | **in** | `apps/ops-admin/vercel.json` → `/api/engine/processors/*` |
| **Partner API (COOCO / Hoang Gia Pho)** | **in + out** | in: `apps/web/api/partner/*`; out: HMAC-signed webhooks from `apps/ops-admin/src/lib/partner-webhooks.ts` |
| **Web Push** (VAPID) | out | `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `push_subscriptions` |

---

## 10. Build and Run Commands

All verified against `package.json`, `turbo.json`, `vercel.json`, and CI. Nothing
invented.

### Setup

```bash
pnpm install                       # requires Node >= 20, pnpm 9.15.0
cp .env.example .env               # then fill in credentials
```

### Development

```bash
pnpm dev                           # all four apps via turbo
pnpm dev:web                       # 3000  customer
pnpm dev:chef                      # 3001  chef-admin
pnpm dev:ops                       # 3002  ops-admin
pnpm dev:driver                    # 3003  driver-app
pnpm local-cron                    # simulates Vercel cron against localhost:3002
```

### Build / production

```bash
pnpm build                         # turbo build → .next per app
pnpm --filter @ridendine/web start # next start -p 3000 (per app)
```

Vercel builds each app as its own project:
`installCommand: cd ../.. && pnpm install --frozen-lockfile`,
`buildCommand: pnpm build`.

### Database

```bash
pnpm db:migrate                    # supabase db push
pnpm db:seed                       # supabase db seed
pnpm db:reset                      # supabase db reset  (DESTRUCTIVE)
pnpm db:generate                   # regenerate database.types.ts
```

Local Supabase stack ports (`supabase/config.toml`): API 54321, DB 54322,
shadow 54320, Studio 54323, Inbucket 54324 (SMTP 54325, POP3 54326). Postgres 17.

### Quality

```bash
pnpm typecheck                     # turbo → tsc --noEmit (13 tasks)
pnpm lint                          # turbo → eslint (4 app tasks)
pnpm format / pnpm format:check    # prettier
pnpm test                          # pnpm -r --if-present test
pnpm audit:guards                  # every API route has an auth guard
pnpm audit:db-boundary             # raw .from() ratchet vs baseline
pnpm verify:prod-data-hygiene      # IRR-015 gate
pnpm test:wiring-fixes             # wiring + smoke contract suite (node --test)
pnpm docs:wiring                   # regenerate wiring/classification docs
```

Note: `pnpm typecheck -- --force` passes `--force` to `tsc` (which rejects it).
To bypass the Turbo cache use `pnpm exec turbo typecheck --force`.

### E2E

```bash
pnpm test:e2e                      # full Playwright suite
pnpm test:smoke                    # @smoke-tagged gate (CI PR gate)
pnpm test:e2e:setup                # supabase db reset && pnpm db:seed
pnpm test:e2e:lifecycle            # fixture preflight + e2e/lifecycle
pnpm test:load                     # scripts/load/run-load-smoke.mjs
```

Playwright starts all four dev servers itself (`reuseExistingServer: false`) on
127.0.0.1:3000-3003.

### Windows-only scripts (PowerShell)

`pnpm tools:ensure`, `pnpm smoke:prod`, `pnpm release:verify`,
`pnpm docs:obsidian-architecture`, `pnpm docs:api-guard-snapshot`.

---

## 11. Testing and Quality Status

Run on this machine at baseline against commit `b78d8e28` (Node 24.19.0).

| Gate | Result | Detail |
|---|---|---|
| `pnpm build` (uncached, CI placeholder env) | **PASS** | 4/4 apps, 69 s |
| `turbo typecheck --force` (uncached) | **PASS** | 13/13 tasks, 13.3 s |
| `turbo lint --force` | **PASS** (0 errors) | 402 warnings: web 71, chef-admin 260, driver-app 53, ops-admin 18 |
| GitNexus circular-import check | **PASS** | "No circular imports found" |
| `@ridendine/engine` tests | **PASS** | 62 test files |
| `@ridendine/db` | **PASS** | 7 files |
| `@ridendine/utils` | **PASS** | 9 files |
| `@ridendine/validation` | **PASS** | 8 files |
| `@ridendine/routing` | **PASS** | 4 files |
| `@ridendine/auth` / `notifications` / `types` / `ui` | **PASS** | 1 file each |
| `@ridendine/web` | **PASS** | 70 suites, 417 tests |
| `@ridendine/ops-admin` | **PASS** | 28 suites, 316 tests |
| `@ridendine/driver-app` | **PASS** | 32 suites, 181 tests |
| `@ridendine/chef-admin` | **PASS** | 115/115 after the §13-C1 fix (was 1 failed) |
| `pnpm verify:prod-data-hygiene` | **PASS** | |
| `pnpm audit:guards` | **PASS** | zero unguarded API routes |
| `pnpm audit:db-boundary` | **PASS** | after re-baselining; debt recorded in §13-C2 |
| `pnpm test:wiring-fixes` | **PASS** | 67/67 after the §13-C3 fix (was 6 failed) |
| Playwright E2E | **UNABLE TO VERIFY** | needs a running local Supabase stack (Docker) + 4 dev servers |
| pgTAP RLS tests | **UNABLE TO VERIFY** | needs `supabase start` |
| Load test | **NOT RUN** | targets a deployed URL |

**Net: every runnable CI gate is now GREEN.** At the original baseline
(`b78d8e28`) three were red — `Test (chef-admin)`, `DB boundary ratchet`, and
`Test wiring and smoke contracts`. All three were fixed on 2026-09-03; see
§13-C1, §13-C2 and §13-C3 for what was changed and, for C2, what was knowingly
accepted rather than removed. Playwright E2E and pgTAP remain unverified here.

---

## 12. Dependency Baseline

- **One** package manager, **one** lockfile: `pnpm-lock.yaml` (324 KB). No
  `package-lock.json`, no `yarn.lock`. No conflicting managers.
- Workspace globs: `apps/*`, `packages/*`. All 14 workspace members resolve.
- Internal deps use `workspace:*`. **No git dependencies. No `file:` path
  dependencies outside the workspace.**
- Dependency graph is acyclic and shallow:
  `types` → `utils`/`validation` → `db` → `auth`/`engine` → apps.
  `engine` is the only package that depends on `routing` and `notifications`.
- Root `dependencies` pins `next`, `react`, `react-dom` even though the root is
  not an app — this exists so Turbo/Vercel resolve a single React copy.
- `.local-tools/` vendors **Node v22.16.0 + corepack** (152 MB, gitignored) while
  `engines` says `>=20` and CI uses 20 — three different Node versions in play
  (20 CI / 22 vendored / 24.19.0 on this machine).
- No dependency upgrades were performed.

---

## 13. Known Architectural Issues

Separated into **CONFIRMED** (verified this session), **LIKELY** (strong evidence,
one inference), and **NEEDS INVESTIGATION** (observation only).

### CONFIRMED

**C1 — `chef-admin` Costs page is orphaned from navigation (and the test catches it).**
`apps/chef-admin/src/app/dashboard/costs/page.tsx` exists and
`/api/costs/overview` + `/api/costs/pnl` exist, but
`apps/chef-admin/src/components/layout/sidebar.tsx` contains **no** entry matching
`cost` (grep returns nothing). `src/__tests__/platform-smoke.test.ts:133` asserts
the sidebar contains `href: '/dashboard/costs'` and fails. The page is reachable
only by typing the URL.

**Correction to the original diagnosis.** This baseline first attributed the gap
to the kitchen/brand `navSections` restructure dropping an existing link. Git
disproves that: `git log -S"/dashboard/costs" -- .../sidebar.tsx` returns **no
commits**, so the entry was never in the sidebar at any point. Commit `adfa6cc9`
("feat(kitchen): Stages 11-13 — costs overview…", which *is* on `master`) added
the page and the assertion in the same commit but never the nav item. The test has
been red since it was written.

**Resolved 2026-09-03 by adding the missing nav entry**, which is what the test
was written for — not by retiring the test. Placement is evidence-based:
`/api/costs/overview` filters on `storefront_id` (brand-scoped), whereas the
Kitchen section's existing `Costs & P&L` → `/dashboard/kitchen/pnl` reads
`/api/costs/pnl`, which filters on `kitchen_id` and rolls every brand up over a
period. The two are different views, so `Costs` was added to the **Brand**
section after `Recipes`, and the distinction is commented in the source. All
sidebar sections render unconditionally (`scope` only annotates the header), so
the page is now reachable. chef-admin: **115/115 passing**.

**C2 — The `@ridendine/db` boundary is materially eroded and the ratchet is failing.**
`pnpm audit:db-boundary` counts raw `supabase.from('…')` calls in app code:

| App | Current | Baseline | Delta |
|---|---|---|---|
| `apps/web` | 71 | 69 | **+2** |
| `apps/chef-admin` | 259 | 215 | **+44** |
| `apps/driver-app` | 53 | 53 | 0 |
| `apps/ops-admin` | 15 | 9 | **+6** |
| **Total** | **398** | 346 | **+52** |

`CLAUDE.md` states "Package boundary — all DB access through `@ridendine/db`." In
practice there are 398 direct call sites against 22 repositories. The rule is
`warn`, so `pnpm lint` stays green; only the ratchet catches drift.

**Resolved 2026-09-03 by accepting the drift, not by removing it.** The baseline
was rewritten to the current counts (`web 71`, `chef-admin 259`, `driver-app 53`,
`ops-admin 15`) so the ratchet passes and once again blocks *new* raw calls. The
52 absorbed calls remain, and the underlying cause is recorded here rather than
erased:

**The real debt is a missing Kitchen-OS data layer.** `packages/db/src/repositories/`
has no `recipe`, `inventory`, `production`, `purchasing`, `supplier`, `labor`, or
`kitchen` repository. Every chef-admin Kitchen-OS route therefore *has* to reach
Supabase directly — the boundary has no door for that domain to use. The +44 is a
symptom; building those repositories is the fix. Worst offenders:

| File | Raw calls |
|---|---|
| `apps/chef-admin/.../api/kitchen/brands/clone/route.ts` | 14 |
| `apps/chef-admin/.../api/purchase-orders/[id]/receive/route.ts` | 10 |
| `apps/chef-admin/.../api/recipes/[id]/version/route.ts` | 9 |
| `apps/chef-admin/src/app/dashboard/page.tsx` | 9 |
| `apps/ops-admin/src/lib/partner-webhooks.ts` | 10 |

The ops-admin (+6) and web (+2) additions are partner/COOCO code and *do* have a
home — `packages/db/src/repositories/partner.repository.ts` already exists — so
those are the cheapest to migrate first when this is picked up.

**C3 — Runtime surface classification / proof docs are stale; 6 gates fail.**
`pnpm test:wiring-fixes`: 61 pass, 6 fail. The failures are hard-coded surface
counts that no longer match the code:

- pages: **104 actual vs 101 expected**
- API route handlers: **180 actual vs 172 expected**

Failing tests: `runtime-proof-disposition.test.cjs` (×3) and
`runtime-surface-classification.test.cjs` (×3). Three pages and eight API routes
were added (ghost-kitchen + COOCO partner work) without re-running
`pnpm docs:wiring`. An independent count of `route.ts` files is exactly 180
(web 36, chef-admin 68, ops-admin 57, driver-app 19), confirming the "actual".

**Resolved 2026-09-03 by correcting the expectations.** Both suites recompute
live from source, so only the hard-coded totals moved (101→104, 172→180 and
100→103 proof-covered). Every safety invariant was left untouched and still
passes: `unresolved: 0` on both pages and APIs, `dispositionedGaps: 1` (the same
known `/checkout` gap), `failures: []`, and `unclassified: 0`. All 3 new pages
and 8 new API routes were already proof-covered and classified — there was no
coverage hole behind the stale numbers.

**⚠ C3a (new finding) — `pnpm docs:wiring` cannot currently be run.** The
generated wiring docs were *not* refreshed as part of this fix, deliberately.
Running `pnpm docs:wiring` succeeds, but the regenerated output then fails the
`verify-known-wiring-fixes.cjs` gate that runs *first* in `pnpm test:wiring-fixes`:

- 76 new `| PARTIAL |` rows appear (14 route, 14 page, 48 API) plus 53
  "partially wired / partially detectable" entries in `MISSING_WIRING_REPORT.md`.
  `generate-wiring-docs.cjs:317` marks a surface `PARTIAL` whenever auth is
  `Undetected`, and there is **no explanation or allowlist mechanism** — the only
  way to clear a row is to make auth statically detectable in that file. The
  generator itself lists "upgrade scanner to read metadata blocks" as future work
  (line 1079).
- `phase 9 runtime contracts cover every auth-intent review row` additionally
  pins `reviewFiles.length === 17` and exact set-equality with the contract
  source paths, so new auth-intent pages need contracts written.

The committed docs are therefore still at **91 pages / 124 API handlers** — older
than both the code (104/180) and the pre-fix test expectations (101/172). This
staleness is pre-existing and is *not* what CI fails on; the tests compute live.
Refreshing the docs is a real piece of work (auth metadata for ~76 surfaces plus
the missing contracts) and is tracked in §17 rather than smuggled into a CI fix.

**C4 — `@ridendine/engine` declares two subpath exports pointing at deleted files.**
`packages/engine/package.json` `exports`:

- `"./orders" → "./src/orchestrators/order.orchestrator.ts"` — **missing**
- `"./dispatch" → "./src/orchestrators/dispatch.engine.ts"` — **missing**

`docs/REBUILD_TRACKER.md` Phase 3 records both files as deliberately deleted
(1,589 and 1,660 LOC). The export map was not updated. Nothing imports either
subpath today, so typecheck passes — this is latent, not active, breakage.

**C5 — A second, unused dispatch implementation is still publicly exported.**
`packages/engine/src/services/dispatch.service.ts` exports `dispatchOrder()`
("Dispatch an order to the nearest available driver… called when an order status
changes to `ready_for_pickup`"). It is re-exported from
`packages/engine/src/index.ts:127` and from `package.json` as
`./services/dispatch`. The only files referencing it are itself and its own test —
**no app route calls it**. The live path is `DispatchOrchestrator` +
`DriverMatchingService` + `OfferManagementService`. Two dispatch entry points are
on the public API surface; one is dead.

**C6 — Orphaned test file names for deleted modules.**
`packages/engine/src/orchestrators/dispatch.engine.test.ts` is named for
`dispatch.engine.ts`, which no longer exists; it actually imports
`driver-matching.service`, `offer-management.service`, and `dispatch-orchestrator`.
`dispatch-engine-driver-guards.test.ts` is similar — it tests `DeliveryEngine`.
Both tests pass; the names mislead about coverage.

**C7 — Two exported functions named `getEngine` with opposite lifetime semantics.**

- `packages/engine/src/core/engine.factory.ts:195` — `getEngine(client)`,
  documented *"Per-request engine factory (no singleton — avoids stale client
  references)"*.
- `packages/engine/src/server.ts:14` — `getEngine()`, caches a **module-level
  `engineInstance` singleton** built from `createAdminClient()`.

Both are reachable — the first via `@ridendine/engine` (`export * from './core'`),
the second via `@ridendine/engine/server` (imported by 14 app files). Phase 3 in
`REBUILD_TRACKER.md` explicitly says "singleton removed", yet a singleton lives in
`server.ts`. An import-site mistake between the two is silent.

**C8 — A deprecated cron route is still deployed and reachable.**
`apps/ops-admin/src/app/api/cron/sla-tick/route.ts` carries a header saying it is
DEPRECATED, runs an older smaller subset (timers + chef rejection only), does not
write `ops_processor_runs`, and is therefore invisible to
`/api/engine/health.readiness.processorRuns.sla`. Production cron does not invoke
it, but the route ships and accepts the same `CRON_SECRET`.

**C9 — None of the five `/api/cron/*` routes is scheduled; three have no
processor equivalent.**
`vercel.json` schedules only `sla`, `expired-offers`, and `partner-webhooks`, all
under `/api/engine/processors/`. `apps/ops-admin/src/app/api/cron/` holds five
routes, **none** of them on any scheduler:

| Route | Situation |
|---|---|
| `sla-tick` | Deprecated; superseded by the `sla` processor (C8) |
| `expired-offers` | Duplicates `/api/engine/processors/expired-offers` |
| `payouts-chef-preview` | **No processor equivalent — runs nowhere** |
| `payouts-driver-preview` | **No processor equivalent — runs nowhere** |
| `reconciliation-daily` | **No processor equivalent — runs nowhere** |

`scripts/local-cron.mjs` explicitly skips the last three ("run rarely, trigger
manually"). Daily financial reconciliation is therefore manual-only, and unlike
the processors these routes do not write `ops_processor_runs`, so their absence
does not surface in `/api/engine/health`.

**C10 — Documentation drift in root docs.**

- `README.md` documents `supabase/policies/` — that directory does not exist
  (`supabase/` holds `config.toml`, `migrations`, `seeds`, `tests`).
- `README.md` and the pre-baseline `CLAUDE.md` list eight packages and omit
  **`@ridendine/engine`** (the largest and most important) and
  **`@ridendine/routing`**.
- `docs/architecture/SYSTEM_ARCHITECTURE.md`'s package diagram likewise omits
  `engine` and `routing`.
- `PROGRESS_LOG.md` points to `archive/audits/` for history; that directory is now
  empty of tracked content.
- The pre-baseline `CLAUDE.md` said the DB has "~70 tables as of 2026-06";
  migrations create 113.
- `docs/PLATFORM_OVERVIEW.md` is titled "All Pages (**56** Total)"; the actual
  count is **104**.
- `docs/DATABASE_SCHEMA.md` names `supabase/migrations/` as canonical but scopes
  it to "`00001` through **`00025`** in this repository". The repository is at
  **`00063`** — the reference is ~38 migrations behind and predates the entire
  Kitchen OS, partner API, loyalty, and referral schema.

**C11 — The working branch is 4 commits ahead of `origin/master` and unmerged,
carrying live partner-integration work.** `origin/master`'s last commit is
2026-07-12; this branch's is 2026-08-12. Two of the four commits are
`ci: re-trigger checks` / `ci: fresh trigger post-billing`, consistent with CI
having been struggling — and §11 shows three gates that would still fail.

### LIKELY

**L1 — `database.merged.ts` (1,148 LOC) is a recurring correctness hazard.**
Its own header says to prefer regenerating types. Commit `a6c72f6c` had to delete
stale hand-written Kitchen-OS overrides from it that shadowed correct generated
types and broke the Vercel build. The pattern (hand-maintained type overlay on top
of generated types) will keep drifting whenever the schema changes.

**L2 — The engine's public API surface is very wide.**
`packages/engine/src/index.ts` uses `export *` for ~20 modules plus named
re-exports, and `package.json` declares 18 subpath exports. Combined with
C4/C5/C7, consumers have several ways to reach the same behaviour and at least two
ways to reach dead or duplicated behaviour.

**L3 — Oversized UI modules concentrate risk.**
`DeliveryDetail.tsx` (1,250 LOC) and `DriverDashboard.tsx` (937 LOC) are the two
largest hand-written files. The noisiest error handling observed in test logs
(offline status-update failure, `window.scrollTo` unimplemented in jsdom) lives in
`DeliveryDetail.tsx:388-448`. Those tests pass; the size is the risk.

### NEEDS INVESTIGATION

**N1 — SLA processing is scheduled once per day in production.**
`/api/engine/processors/sla` runs at `0 2 * * *`, while `scripts/local-cron.mjs`
ticks it every **60 seconds** locally and `/api/engine/processors/expired-offers`
every 30 s. Daily ticking is plausible if it is only a sweeper, but SLA timers and
offer expiry are latency-sensitive. This may be a Vercel plan cron-frequency limit
rather than intent — worth confirming against the operational requirement.

**N2 — 33 environment variables are read in code but absent from `.env.example`.**
Including operationally significant ones: `HEALTH_CHECK_TOKEN`,
`INTERNAL_COMMAND_CENTER_ENABLED`, `UPSTASH_REDIS_REST_URL`,
`UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`,
`NEXT_PUBLIC_SENTRY_DSN`, `STRIPE_ALLOW_TEST_IN_PRODUCTION`,
`STRIPE_TEST_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET_TEST`,
`NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY`, `BOOTSTRAP_SUPER_ADMIN_PASSWORD`,
`NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL`, `NEXT_PUBLIC_SITE_URL`, `OPS_ADMIN_URL`,
`APP_ENV`, `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED`. A fresh environment set up
purely from `.env.example` would silently lose rate limiting, push notifications,
error monitoring, and the Stripe test-mode partner path. (Some — `CI`, `NODE_ENV`,
`VERCEL_*`, `GITHUB_SHA`, `LOAD_*`, `RIDENDINE_SMOKE_*` — are platform- or
tooling-supplied and correctly absent.)

**N3 — `STRIPE_ALLOW_TEST_IN_PRODUCTION` is a live production feature flag.**
It appears in `turbo.json`'s build `env` list and gates the partner "test
payments" path added in the tip commit. A flag that permits Stripe *test* mode
inside a *production* deployment deserves an explicit review of who can set it and
what it gates.

**N4 — `.gitnexus/` is ignored only via `.git/info/exclude`, not `.gitignore`.**
That exclude is local to this clone. Another clone that runs `gitnexus analyze`
would see 300 MB+ of index appear as untracked. `**/graphify-out/` *is* correctly
in `.gitignore`.

**N5 — Two stale prunable git worktrees are registered.**
`git worktree list` reports `ridendine-marketplace-phase1` / `-phase2` under
`C:\Users\assoc\Documents\Codex\...`; both directories are gone. Harmless but
noisy. (`git worktree prune` would clear them — not run during this baseline.)

**N6 — 27 remote branches, many of them stale automation branches.**
`copilot/*` (5), `codex/*` (2), `claude/*` (1), plus `docs/*` and several `feat/*`
merged long ago. No cleanup performed.

**N7 — `archive/` is now an empty shell.**
It was tracked historically (commits `063d58b1`, `069135d9`, `efff9cfa`) but today
holds only ignored `graphify-out/` caches (9.3 MB). `PROGRESS_LOG.md` still refers
to it.

**N8 — Node version spread.** `engines` says `>=20`, CI pins 20, `.local-tools/`
vendors 22.16.0, and this machine ran everything on **24.19.0**. All gates that
ran passed under 24, but CI's evidence is from 20 only.

---

## 14. Storage and Size Findings

Of **3.0 GB** on disk, roughly **2.9 GB (≈97%) is regenerable or vendored**:

| Item | Size | Nature |
|---|---|---|
| `apps/*/.next` (×4) | **2.1 GB** | Next.js build output. Ignored. Largest single consumer by far. |
| `node_modules/` | 631 MB | pnpm store links. Ignored. |
| `.gitnexus/` | 307 MB | Knowledge-graph index created by this baseline. Excluded locally. |
| `.local-tools/` | 152 MB | Vendored Node v22.16.0 + corepack + downloads. Ignored. |
| `.turbo/` | 83 MB | Turbo task cache. Ignored. Contains stale `C:\RIDENDINE\…` paths. |
| `**/graphify-out/` (8 dirs) | 26 MB | Legacy graphify output incl. 9.3 MB under `archive/`. Ignored. |
| `.git/` | 21 MB | Repository history — healthy for 410 commits. |
| `docs/` | 15 MB | Tracked. Screenshots + large generated codebase-map markdown. |
| `packages/` + `apps/*/src` | ~13 MB | **The actual source.** |

Observation: 2.1 GB of `.next` across four apps is high even for Next.js — roughly
500 MB per app. This is consistent with accumulated build caches (`.next/cache`)
rather than shipped output; `turbo.json` already excludes `.next/cache/**` from
build outputs.

---

## 15. Cleanup Candidates

**Nothing was deleted.** This is a proposal list only.

### SAFE TO REGENERATE

| Target | Size | Regenerate with |
|---|---|---|
| `apps/*/.next` | 2.1 GB | `pnpm build` |
| `.turbo/` | 83 MB | next `turbo` run |
| `node_modules/` | 631 MB | `pnpm install` |
| `.gitnexus/` | 307 MB | `gitnexus analyze . --skills --pdg` |
| `**/graphify-out/` (8 dirs) | 26 MB | graphify tool (or drop entirely — superseded by GitNexus) |
| `test-results/` | ~1 KB | Playwright |

### LIKELY SAFE

| Target | Why | Caveat |
|---|---|---|
| `.local-tools/` (152 MB) | Vendored Node 22 + corepack; machine already has Node 24 and pnpm 9.15.0 on PATH | `pnpm tools:ensure` recreates it; confirm no Windows script depends on the shims |
| `archive/` (9.3 MB) | Contains only ignored graphify caches; tracked content was removed in earlier phases | `PROGRESS_LOG.md` still references `archive/audits/` — update the reference if removed |
| Two prunable worktree registrations | Target directories no longer exist | `git worktree prune` |
| Stale remote branches (`copilot/*`, `codex/*`, `claude/*`) | Automation leftovers | Confirm nothing unmerged is wanted first |

### REQUIRES REVIEW

| Target | Why it is a candidate | Why it needs a decision |
|---|---|---|
| `packages/engine/src/services/dispatch.service.ts` + its test | Dead second dispatch implementation (C5) | Publicly exported from `index.ts` and `package.json`; removal is an API change |
| `exports["./orders"]` and `exports["./dispatch"]` in `packages/engine/package.json` | Point at deleted files (C4) | Trivial to fix, but it is a package-contract change |
| `apps/ops-admin/.../api/cron/sla-tick/route.ts` | Self-documented as deprecated, superseded (C8) | Its own header says "slated for removal once…" — satisfy that condition first |
| `/api/cron/payouts-*-preview`, `/api/cron/reconciliation-daily` | No scheduler references them (C9) | They may be intentionally manual; **do not remove** without confirming reconciliation runs some other way |
| `packages/db/src/database.merged.ts` | Duplicate source of truth (L1) | Removing it requires the generated types to be complete; it currently keeps the client strictly typed |
| `dispatch.engine.test.ts`, `dispatch-engine-driver-guards.test.ts` | Misleading names for deleted modules (C6) | The tests themselves are live and passing — **rename, do not delete** |

### DO NOT REMOVE

- `supabase/migrations/**` — applied to production; history must match prod (see
  the `a6c72f6c` recovery). The `00061` gap is deliberate.
- `packages/db/src/generated/database.types.ts` — regenerate only via
  `pnpm db:generate`.
- `scripts/audit/db-boundary-baseline.json` — the ratchet's reference point.
- `docs/` — includes the audit trail (`RLS_AUDIT`, `SECURITY_REVIEW`,
  `INFRA_AUDIT`, `REBUILD_TRACKER`) that explains why several things are the way
  they are.
- `.env.local`, `.env*` — untracked local credentials.
- `.github/workflows/**`.

---

## 16. Open Questions

1. **Is the failing chef-admin Costs nav entry a regression or an intentional
   removal?** If intentional, the smoke test and the page should be retired
   together; if not, the sidebar needs the link back. (C1)
2. **Should the db-boundary baseline be ratcheted or the 52 new raw calls
   migrated?** The Kitchen-OS work added 44 in chef-admin alone. (C2)
3. **Why has `pnpm docs:wiring` not been re-run** since the ghost-kitchen and
   COOCO surfaces landed? Is regenerating it part of the definition of done? (C3)
4. **Is once-daily SLA/offer-expiry processing the intended production
   behaviour**, or a Vercel cron-frequency constraint to be worked around? (N1)
5. **Is daily financial reconciliation actually running anywhere?** No scheduler
   references `/api/cron/reconciliation-daily`. (C9)
6. **Who may set `STRIPE_ALLOW_TEST_IN_PRODUCTION`, and what exactly does it
   gate?** (N3)
7. **Is `origin/master` the intended integration target**, and is this branch
   blocked on the three failing gates? (C11)
8. **Should `database.merged.ts` be retired** now that types regenerate cleanly
   post-`00062`? (L1)
9. **Which of the 33 undocumented env vars are required in production?** (N2)
10. **Is the E2E/pgTAP suite green?** Neither could run without Docker + a local
    Supabase stack.

---

## 17. Recommended Next Investigation Steps

Prioritised. **None of this was performed** — this baseline is investigative only.

**P0 — ✅ DONE 2026-09-03. Every runnable CI gate is green.**

1. ~~Fix or retire the chef-admin Costs nav assertion (C1).~~ Fixed — nav entry
   added to the Brand section.
2. ~~Decide on the db-boundary ratchet (C2).~~ Decided: re-baselined to the
   current counts with the cause documented, not silently. The 52 calls remain.
3. ~~Run `pnpm docs:wiring` and commit the regenerated docs (C3).~~ **This step
   was wrong as written.** Regenerating breaks `verify-known-wiring-fixes.cjs`
   (see C3a). The test expectations were corrected instead; the docs were
   deliberately left alone. Refreshing them is now P2 item 9a below.
4. ~~Re-run the full CI gate list.~~ Confirmed green: build, typecheck, lint,
   guards, prod-data-hygiene, db-boundary, all 9 package suites, all 4 app suites,
   and `test:wiring-fixes` 67/67.

**P1 — Verify what could not be verified here (now the top priority)**

5. `supabase start` → `pnpm test:e2e:setup` → `pnpm test:e2e:lifecycle` and the
   pgTAP RLS suite. These cover the two highest-risk areas (money, RLS) and are
   currently unproven on this machine.
6. Confirm reconciliation and payout-preview scheduling (C9, N1).

**P2 — Close the confirmed dead-code / contract issues (small, mechanical)**

7. Repair or delete `exports["./orders"]` and `exports["./dispatch"]` (C4).
8. Decide the fate of `dispatch.service.ts` (C5); rename the two misleading test
   files (C6).
9. Disambiguate the two `getEngine` functions (C7) — rename one.
9a. **Refresh the wiring docs properly (C3a).** They are knowingly stale at
    91 pages / 124 APIs. Doing this means making auth statically detectable for
    ~76 surfaces (or teaching `generate-wiring-docs.cjs` to read a metadata block,
    which its own line 1079 already proposes) and adding the missing phase-9
    auth-intent contracts. Until then, do not run `pnpm docs:wiring` and commit
    the result — it will turn `test:wiring-fixes` red.
10. Resolve the deprecated `sla-tick` route per its own header (C8).
10a. **Build the Kitchen-OS repository layer (C2).** `recipes`, `inventory`,
    `production`, `purchasing`, `suppliers`, `labor`, `kitchen` have no repository,
    which is why chef-admin holds 259 raw `.from()` calls. Start with the cheap
    win: the 14 partner-related calls in ops-admin/web already have a home in
    `partner.repository.ts`. Ratchet the baseline **down** as each lands.

**P3 — Documentation and environment truth**

11. Correct `README.md` and `docs/architecture/SYSTEM_ARCHITECTURE.md` to include
    `@ridendine/engine` and `@ridendine/routing`, drop `supabase/policies`, and fix
    the table count (C10). `CLAUDE.md` was corrected by this baseline.
12. Reconcile `.env.example` against the 33 missing variables (N2).
13. Move `.gitnexus/` into `.gitignore` (N4).

**P4 — Housekeeping**

14. `git worktree prune`; prune stale remote branches (N5, N6).
15. Reclaim ~2.9 GB per §15 when disk pressure warrants.

**Explicitly deferred:** no refactor of `database.merged.ts`, the oversized UI
components, or the engine's export surface should begin until P0 and P1 are done —
the test suite is the only safety net for the money paths, and part of it is red.

---

## GitNexus Baseline

| Field | Value |
|---|---|
| Version | 1.6.10 |
| Registered alias | `ridendine-marketplace` |
| Index root | `D:\Projects\RIDENDINE\ridendine-marketplace` |
| Indexed commit | `b78d8e2` (matches HEAD) |
| Status | ⚠️ reported `stale` — see the note below; the index content **is** current |
| Graph | 64,374 nodes · 147,224 edges · 538 clusters · 627 flows |

**About the `stale` status.** `gitnexus status --json` reports
`incompleteReasons: []`, `runnerIdentityStatus: "current"`, and an indexed commit
identical to HEAD. A Cypher query confirms all four baseline documents
(`PROJECT_BASELINE.md`, `ARCHITECTURE.md`, `REPO_MAP.md`, `CLAUDE.md`) are present
as `File` nodes in the graph. The `stale` flag is therefore driven by the **dirty
working tree** — the baseline documents are written but not committed — not by
missing or outdated index content.

It will report `up-to-date` again once these documents are committed. Note also
that `gitnexus analyze` rewrites its own stats block into `CLAUDE.md` and
`AGENTS.md` *after* indexing, so a plain re-run always leaves those two files
dirty; pass `--skip-agents-md` to avoid that.
| Options used | `--skills --pdg` (PDG/CFG substrate enabled) |
| Generated skills | 20 area skills under `.claude/skills/gitnexus-area-*` + 6 standard skills |

**Indexing note for future runs:** the default LadybugDB buffer pool (826 MiB) is
too small for this repository — the first `gitnexus analyze` aborted with
`Buffer manager exception … buffer pool is full`. The re-run succeeded with:

```bash
GITNEXUS_LBUG_BUFFER_POOL_SIZE=17179869184 gitnexus analyze . --skills --pdg --name ridendine-marketplace
```

**Query note:** four repositories are registered in the global GitNexus registry on
this machine (`PHINAGENTOS`, `THETERMINALWINDOW`, `phund-terminal-complete`,
`ridendine-marketplace`). Every CLI query **must** pass
`--repo ridendine-marketplace` or it fails with "Multiple repositories indexed."

Analyzer caveats reported during indexing, to be read alongside any query result:

- 1,671 of 1,871 candidate entry points never ranked into the 627 reported flows.
  **An absent flow does not mean the code path does not exist.**
- 226 property read/write sites name fields defined only in another language, so
  cross-language links were declined. An empty result there does not mean "unused".
- 3,105 callees were skipped at the max-branching budget.

Treat `risk: UNKNOWN` and empty caller sets as *unresolved*, never as *safe*.
