# REPO_MAP.md — Ridendine Marketplace

> Annotated directory tree. What each directory **actually** does, verified at
> commit `b78d8e28` on 2026-09-02 — not inferred from names.
>
> Repository root: `D:\Projects\RIDENDINE\ridendine-marketplace`
> (the parent `D:\Projects\RIDENDINE` is a non-Git Obsidian/business-doc folder
> and is **out of scope**).

Legend — **[SRC]** authoritative source · **[ASSET]** runtime asset ·
**[TOOL]** dev tooling · **[GEN]** generated/rebuildable · **[LOCAL]** local data ·
**[IGN]** git-ignored.

---

## Root

```
ridendine-marketplace/
├── package.json                  [SRC]   @ridendine/monorepo. All 60+ scripts.
├── pnpm-workspace.yaml           [SRC]   Workspace globs: apps/*, packages/*
├── pnpm-lock.yaml                [SRC]   The ONLY lockfile. 324 KB.
├── turbo.json                    [SRC]   Task graph + the build `env` allowlist
├── playwright.config.ts          [SRC]   4 browser projects; boots all 4 dev servers
├── .env.example                  [SRC]   20 vars documented — 33 more are read in code (gap)
├── .env.local                    [LOCAL] Untracked. Currently only DATABASE_URL.
├── .gitignore                    [SRC]   Ignores .next, node_modules, .turbo,
│                                         .local-tools, **/graphify-out/, .claude-flow
├── .gitattributes / .prettier*   [SRC]
├── .vercelignore                 [SRC]   Deploy exclusions
├── README.md                     [SRC]   Human overview. Contains drift — see below.
├── CLAUDE.md                     [SRC]   Agent operating instructions (this baseline)
├── AGENTS.md                     [GEN]   GitNexus-generated agent context
├── PROJECT_BASELINE.md           [SRC]   Baseline snapshot (this exercise)
├── ARCHITECTURE.md               [SRC]   System architecture (this exercise)
├── REPO_MAP.md                   [SRC]   This file
├── NEXT_STEPS.md                 [SRC]   Deliberately minimal — points at REBUILD_TRACKER
└── PROGRESS_LOG.md               [SRC]   Stub — points at REBUILD_TRACKER
```

> **README drift:** it documents `supabase/policies/` (does not exist) and omits
> `@ridendine/engine` and `@ridendine/routing` from the package list.

---

## `apps/` — four independently deployed Next.js applications  **[SRC]**

Each app is its own Vercel project. **No app imports another app.** They share
state only through the database.

```
apps/
├── web/                    @ridendine/web        :3000  23 pages · 36 API routes
│   ├── src/app/                    [SRC]  App Router pages + /api routes
│   │   ├── api/checkout/           [SRC]  Customer checkout entry
│   │   ├── api/partner/            [SRC]  ⚠ THIRD-PARTY PARTNER API (COOCO)
│   │   └── api/webhooks/stripe/    [SRC]  Customer-side Stripe webhook
│   ├── src/lib/checkout/           [SRC]  ⚠ runCheckout() + quote() — THE money path,
│   │                                      shared by customer AND partner checkout
│   ├── src/lib/partner/            [SRC]  API-key auth, HMAC signing, rate limit
│   ├── src/components/             [SRC]  30 components
│   ├── src/contexts/ src/hooks/    [SRC]
│   ├── src/middleware.ts           [SRC]  Auth + maintenance-mode gate (132 LOC)
│   ├── src/__tests__/              [TOOL] Jest
│   ├── public/                     [ASSET] Logos + UI screenshots (3.8 MB)
│   ├── sentry.*.config.ts          [SRC]
│   ├── vercel.json                 [SRC]
│   └── .next/                      [GEN][IGN] 528 MB
│
├── chef-admin/             @ridendine/chef-admin :3001  30 pages · 68 API routes
│   ├── src/app/api/                [SRC]  Most API routes of any app. Menu, orders,
│   │                                      inventory, recipes, purchasing, production,
│   │                                      labor, kitchen, costs, packaging, suppliers
│   ├── src/app/dashboard/          [SRC]  Kitchen OS UI. dashboard/page.tsx = 875 LOC
│   │   └── costs/                  [SRC]  ⚠ Page exists but has NO sidebar nav entry
│   ├── src/components/layout/      [SRC]  sidebar.tsx (kitchen/brand navSections),
│   │                                      kitchen-scope-provider.tsx
│   └── .next/                      [GEN][IGN] 485 MB
│
├── ops-admin/              @ridendine/ops-admin  :3002  40 pages · 57 API routes
│   ├── src/app/api/engine/processors/  [SRC] ⚠ THE ONLY SCHEDULED WORK IN THE SYSTEM
│   │                                      sla · expired-offers · partner-webhooks
│   ├── src/app/api/cron/           [SRC]  ⚠ 5 routes, NONE scheduled.
│   │                                      sla-tick — explicitly DEPRECATED
│   │                                      expired-offers — duplicates the processor
│   │                                      payouts-chef-preview   ┐ no processor
│   │                                      payouts-driver-preview │ equivalent —
│   │                                      reconciliation-daily   ┘ run nowhere
│   ├── src/app/api/stripe/webhook/ [SRC]  Second Stripe webhook (ops secret)
│   ├── src/lib/partner-webhooks.ts [SRC]  Outbound HMAC-signed partner webhooks
│   ├── src/app/api/engine/         [SRC]  dashboard, dispatch, finance, payouts,
│   │                                      refunds, reconciliation, rules, settings,
│   │                                      exceptions, health, partner-stats
│   └── .next/                      [GEN][IGN] 597 MB
│
├── driver-app/             @ridendine/driver-app :3003  11 pages · 19 API routes
│   ├── src/app/delivery/[id]/components/DeliveryDetail.tsx  [SRC] ⚠ 1,250 LOC —
│   │                                      largest hand-written file in the repo
│   ├── src/app/components/DriverDashboard.tsx               [SRC] 937 LOC
│   ├── src/components/map/         [SRC]  Leaflet route map
│   └── .next/                      [GEN][IGN] 511 MB
│
└── graphify-out/                   [GEN][IGN] Legacy graph output — NOT an app
```

> `apps/graphify-out/` sits alongside the four apps but is generated output, not a
> workspace member. `pnpm-workspace.yaml` matches `apps/*`, but it has no
> `package.json` so pnpm ignores it.

---

## `packages/` — shared workspace packages  **[SRC]**

```
packages/
├── engine/          @ridendine/engine       ⭐ THE CENTRAL BUSINESS ENGINE (133 files)
│   └── src/
│       ├── core/                   engine.factory.ts (composition root, line 93),
│       │                           event-emitter, public-broadcast-sanitizer,
│       │                           audit-logger, sla-manager + sla-checks,
│       │                           notification-sender + email-provider (Resend)
│       │                           + sms-provider (Twilio, raw fetch),
│       │                           business-rules-engine, health-checks
│       ├── orchestrators/          MasterOrderEngine (939) · DeliveryEngine (636)
│       │                           order-state-machine.ts ⭐ ALL transition tables
│       │                           DispatchOrchestrator · DriverMatchingService
│       │                           OfferManagementService · PayoutEngine
│       │                           facades: kitchen/commerce/support/platform/ops
│       │                           OperationsCommandGateway
│       │                           Kitchen OS: inventory/purchasing/production/labor
│       ├── services/               stripe, payout, ledger, reconciliation, tax,
│       │                           eta, geocoding, costing, payroll, loyalty,
│       │                           referral, surge, risk, permissions,
│       │                           platform-api-guards, kitchen-pnl, …
│       │                           ⚠ dispatch.service.ts is a DEAD second dispatch
│       │                              implementation — exported but never called
│       ├── e2e/                    Engine-level lifecycle + Stripe scenarios
│       ├── types/                  payment-adapter.ts
│       ├── index.ts                Public surface (~20 `export *` + named)
│       └── server.ts               Next.js-only actor context.
│                                   ⚠ has a SECOND getEngine() — module singleton
│
├── db/              @ridendine/db           ⭐ THE ONLY SANCTIONED DB DOOR
│   └── src/
│       ├── client/                 browser.ts (anon) · server.ts (SSR cookie)
│       │                           admin.ts ⚠ service role, BYPASSES RLS
│       ├── repositories/           22 repositories — the intended access path
│       ├── realtime/               channels + events (Supabase Realtime)
│       ├── hooks/use-realtime.ts
│       ├── generated/database.types.ts   [GEN] 7,514 LOC — `pnpm db:generate`
│       ├── database.merged.ts      ⚠ 1,148 LOC hand-written type overlay.
│       │                              Duplicate source of truth; already broke
│       │                              a prod build once (commit a6c72f6c).
│       └── schema/                 Migration-shape tests
│
├── auth/            @ridendine/auth          createAuthMiddleware, session/role helpers
├── routing/         @ridendine/routing       ETA / routing service
├── notifications/   @ridendine/notifications Notification templates
├── validation/      @ridendine/validation    Zod schemas (checkout, partner, …)
├── utils/           @ridendine/utils         ⚠ rate-limit/ (Upstash) and
│                                             validateEngineProcessorHeaders —
│                                             both security-critical
├── types/           @ridendine/types         Engine contracts, ActorContext,
│                                             capabilities.ts. Dependency leaf.
├── ui/              @ridendine/ui            Shared React primitives + tokens
├── config/          @ridendine/config        Shared TS/Tailwind/ESLint.
│                                             ⚠ eslint.config.js defines the custom
│                                                db-boundary/no-raw-supabase-from rule
└── graphify-out/                   [GEN][IGN] Not a package
```

---

## `supabase/` — database  **[SRC] — DO NOT REWRITE HISTORY**

```
supabase/
├── config.toml       [SRC]  Local stack. Postgres 17. API 54321 · DB 54322 ·
│                            shadow 54320 · Studio 54323 · Inbucket 54324
├── migrations/       [SRC]  ⚠ 62 forward-only SQL files, 00001 → 00063.
│                            113 tables. APPLIED TO PRODUCTION — history must
│                            match prod. 00061 is intentionally absent (folded
│                            into 00062; see commit a6c72f6c).
├── seeds/seed.sql    [SRC]  `pnpm db:seed`
└── tests/rls/        [TOOL] pgTAP: kitchen_scope.sql, role_alignment.sql
```

`supabase/policies/` referenced by README **does not exist** — RLS lives inside
the migrations.

---

## `scripts/` — automation, gates, and generators  **[TOOL]**

```
scripts/
├── audit/            ⭐ ARCHITECTURE TESTS — these run in CI
│   ├── check-api-route-guards.mjs      `pnpm audit:guards` — PASSING
│   ├── db-boundary-ratchet.mjs         `pnpm audit:db-boundary` — ⚠ FAILING (+52)
│   ├── db-boundary-baseline.json       ⚠ the ratchet's reference — do not edit casually
│   ├── high-risk-ops-authz-contracts.* positive authz contracts
│   ├── high-risk-ops-negative-authz.*  negative authz contracts
│   ├── sean-super-admin-fixture.*      super-admin fixture check
│   ├── verify-db-hardening.mjs
│   └── generate-production-readiness-audit.cjs
│
├── smoke/            ⭐ RUNTIME CONTRACT SUITE (node --test), 14 *.test.cjs
│   ├── runtime-surface-classification.*  ⚠ FAILING — expects 101 pages/172 APIs;
│   ├── runtime-proof-disposition.*       ⚠ FAILING — actual is 104/180
│   ├── runtime-contract-smoke.*  runtime-coverage-audit.*
│   ├── runtime-proof-action-smoke.*  runtime-sample-fixtures.*
│   ├── live-role-fixture-smoke.*  non-admin-role-fixture-smoke.*
│   ├── driver-shift-mutation-smoke.*  ops-export-audit-smoke.*
│   ├── responsive-production-smoke.*  production-smoke.{ps1,test.cjs}
│   └── README.md
│
├── wiring/           Generates docs/wiring/*. `pnpm docs:wiring`
│   ├── generate-wiring-docs.cjs
│   ├── generate-supabase-diagrams.cjs
│   ├── verify-known-wiring-fixes.cjs
│   └── wiring-contracts.cjs
│
├── ui/               Page registry + screenshots + command-center docs (tsx)
├── e2e/              Fixture validation/reset for the lifecycle suite
├── load/             run-load-smoke.mjs — targets a DEPLOYED url
├── partners/         onboard-partner.mjs — provisions api_partners + keys
├── docs/             PowerShell + cjs doc/diagram generators
├── release/          verify-release.ps1  (Windows)
├── tools/            ensure-node-pnpm.ps1 — creates .local-tools/ (Windows)
├── local-cron.mjs    ⭐ Local Vercel-cron simulator (SLA 60 s, offers 30 s)
├── bootstrap-super-admin.mjs
├── verify-prod-data-hygiene.mjs   `pnpm verify:prod-data-hygiene` — PASSING
├── db-audit.mjs  db-counts.mjs  sla-runner.ts
├── seed-demo-order.mjs  seed-local-dummy-data.sql  seed-sean-super-admin.sql
├── verify-local-dummy-data.sql   load-root-env.cjs
└── graphify-out/     [GEN][IGN]
```

---

## `e2e/` — Playwright  **[TOOL]**

```
e2e/
├── platform-auth.smoke.spec.ts   [TOOL] @smoke — CI PR gate
├── web.smoke.spec.ts             [TOOL] @smoke
├── lifecycle/                    [TOOL] Full journeys: customer, chef, driver, ops,
│                                        negative-paths, smoke.
│                                        Needs a seeded local Supabase stack.
├── fixtures/test-data.ts         [TOOL]
└── graphify-out/                 [GEN][IGN]
```

---

## `docs/` — 258 tracked files, 15 MB  **[SRC]**

```
docs/
├── architecture/         ⭐ SYSTEM_ARCHITECTURE · WORKFLOWS · ROLE_MATRIX
│   │                       PRODUCT_DEFINITION · MERCHANT_PAYMENT_FLOW
│   │                       PAYMENT_WORKFLOW_SCHEMATIC (+ .html/.pdf/assets)
│   ├── codebase-map/       [GEN] EVERY_PAGE_DOCUMENT.md (264 KB)
│   └── supabase/           [GEN] Generated schema diagrams
│
├── wiring/               [GEN] ⚠ STALE — regenerate with `pnpm docs:wiring`
│                               ROUTE_INVENTORY · API_INVENTORY · ACTION_MAP
│                               PAGE_WIRING_MATRIX · DATA_ENGINE_MAP
│                               RUNTIME_SURFACE_CLASSIFICATION (asserts 101/172)
│                               RUNTIME_PROOF_DISPOSITION · HIGH_RISK_OPS_AUTHZ …
│
├── ui/                   [GEN+SRC] DESIGN_SYSTEM · COMMAND_CENTER · PAGE_BLUEPRINTS
│                                   page-registry.json · change-requests.json
│                                   screenshots/ (~230 KB each)
│
├── business-rules/       ⭐ [SRC] Human-authored domain rules — chef-status,
│                                  finance-visibility, order-ownership,
│                                  role-ownership-matrix, storefront-governance
│
├── plans/                [SRC] Dated feature plans (2026-05 → 2026-06)
├── superpowers/          [SRC] 63 files of dated agent plans — historical record
├── partner-integration/  [SRC] hoang-gia-pho (COOCO) kit: README, checkout.html,
│                               api/pay.js, .env.example
├── prod-deploy/          [SRC] README + apply-to-prod.sql
├── obsidian/             [GEN] Obsidian-formatted codebase map
│
├── Root docs (dated audits — the "why" behind current design):
│   REBUILD_TRACKER.md ⭐ 12-phase rebuild log; explains deletions
│   PLATFORM_OVERVIEW · ORDER_FLOW · DATABASE_SCHEMA · APP_CONNECTIONS
│   AUTH_ROLE_MATRIX · CROSS_APP_CONTRACTS · BUSINESS_ENGINE
│   RLS_AUDIT_2026-05-18 · SECURITY_REVIEW_2026-06-17 · INFRA_AUDIT_2026-05-18
│   API_GAP_REVIEW · OPS_LIVE_BOARD_AUDIT · BRANCH_TRIAGE
│   MONITORING_RUNBOOK · RUNBOOK_DEPLOY · BACKUP_AND_ROLLBACK
│   LAUNCH_CHECKLIST · RELEASE_READINESS · KNOWN_ISSUES · TYPING_BACKLOG
│   chef-kitchen-os.md ⭐ + chef-kitchen-{api,data-model,routes}.md
│   ENVIRONMENT_VARIABLES.md · LEGAL_DISCLAIMERS · DESIGN_SYSTEM_*
└── graphify-out/         [GEN][IGN]
```

---

## `.github/workflows/` — CI  **[SRC]**

```
.github/workflows/
├── ci.yml               ⭐ Main gate on master/main + nightly 09:00 UTC.
│                           hygiene → typecheck → lint → audit:guards →
│                           audit:db-boundary → 8 package/app test jobs →
│                           test:wiring-fixes → build → Playwright smoke
├── e2e.yml              Boots a real local Supabase stack, seeds it, runs
│                        pnpm test:e2e:lifecycle. Path-filtered.
├── load-test.yml        Against a deployed URL
└── post-deploy-smoke.yml
```

⚠ CI triggers only on `master`/`main`. The current branch
`feat/cooco-partner-webhooks-realtime` is 4 commits ahead and unmerged.

---

## Generated / ignored — **never treat as source**

| Path | Size | Nature |
|---|---|---|
| `apps/*/.next/` | **2.1 GB** | Next.js build output + cache. `pnpm build`. |
| `node_modules/` | 631 MB | `pnpm install`. |
| `.gitnexus/` | 307 MB | GitNexus index (LadybugDB + caches). ⚠ ignored only via `.git/info/exclude`, **not** `.gitignore`. |
| `.local-tools/` | 152 MB | Vendored Node v22.16.0 + corepack + shims. `pnpm tools:ensure`. |
| `.turbo/` | 83 MB | Turbo cache. Contains stale `C:\RIDENDINE\…` paths from a previous repo location. |
| `**/graphify-out/` (8 dirs) | 26 MB | Legacy graphify output — superseded by GitNexus. |
| `archive/` | 9.3 MB | ⚠ Now an empty shell: tracked content was removed in earlier phases; only ignored graphify caches remain. `PROGRESS_LOG.md` still points here. |
| `.claude/skills/gitnexus-*` | 184 KB | 26 GitNexus-generated skill files. |
| `AGENTS.md` | — | GitNexus-generated agent context. |
| `.claude-flow/` | 40 KB | Claude Flow runtime artifacts. |
| `.superpowers/` | 10 KB | 4 tracked brainstorm HTML artifacts — historical, not runtime. |
| `test-results/` | ~1 KB | Playwright output. |

---

## Quick orientation

| I need to… | Go to |
|---|---|
| Change how an order moves between states | `packages/engine/src/orchestrators/order-state-machine.ts`, then `master-order-engine.ts` |
| Change checkout, pricing, or payment | `apps/web/src/lib/checkout/run-checkout.ts` + `quote.ts` (⚠ shared with the partner API) |
| Change driver assignment | `packages/engine/src/orchestrators/{driver-matching.service,offer-management.service,dispatch-orchestrator}.ts` — **not** `services/dispatch.service.ts` (dead) |
| Add a DB query | A repository in `packages/db/src/repositories/` — not a raw `.from()` |
| Change the schema | A **new** forward-only migration in `supabase/migrations/`, then `pnpm db:generate` |
| Add scheduled work | `apps/ops-admin/src/app/api/engine/processors/` + `apps/ops-admin/vercel.json` `crons[]` |
| Change partner API behaviour | `apps/web/src/app/api/partner/` + `apps/web/src/lib/partner/`; outbound in `apps/ops-admin/src/lib/partner-webhooks.ts` |
| Understand why something is the way it is | `docs/REBUILD_TRACKER.md`, then the dated audits in `docs/` |
| Know the domain rules | `docs/business-rules/` |
| Find every page/route | `docs/wiring/ROUTE_INVENTORY.md` (⚠ stale — regenerate first) |
