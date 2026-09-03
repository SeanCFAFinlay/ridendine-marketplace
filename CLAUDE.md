# CLAUDE.md — Ridendine Development Context

## Repository Identity — confirm this first

- **Repo:** `ridendine-marketplace` (`@ridendine/monorepo`)
- **Git root:** `D:\Projects\RIDENDINE\ridendine-marketplace`
- **Remote:** `https://github.com/SeanCFAFinlay/ridendine-marketplace.git`
- **Default branch:** `master`

The parent folder `D:\Projects\RIDENDINE` is **not** this repository — it is an
Obsidian vault of business documents. Sibling folders under `D:\Projects\`
(FXONLY, SIDESCROLLER, HOLPYP, trade-terminal-main, …) are **unrelated projects**.

**Never import architecture, code, conventions, or assumptions from another
repository on this machine.** Similarly named files elsewhere are not this
project's files. If you find yourself reading outside the Git root for project
context, stop.

Baseline documents (read these before large changes):
`PROJECT_BASELINE.md` · `ARCHITECTURE.md` · `REPO_MAP.md`
(baselined 2026-09-02 at commit `b78d8e28`).

## Project Overview

Ridendine is a **chef-first food delivery marketplace** connecting home and
ghost-kitchen chefs with customers, built as a pnpm/Turborepo monorepo with four
Next.js applications backed by Supabase. It has grown a full **Kitchen Operating
System** (recipes, costing, inventory, purchasing, production, labour, P&L) and a
**partner API** for third-party storefronts.

## Architecture

### Apps
- `apps/web` (port 3000) — Customer marketplace **+ the partner API + the customer Stripe webhook**
- `apps/chef-admin` (port 3001) — Chef dashboard + Kitchen OS
- `apps/ops-admin` (port 3002) — Operations admin **+ every scheduled processor + the ops Stripe webhook**
- `apps/driver-app` (port 3003) — Driver PWA

No app imports another app. They share state only through the database.

### Packages
- `@ridendine/engine` — **central business logic; the only sanctioned writer of lifecycle and money state**
- `@ridendine/db` — Supabase clients and 22 repositories
- `@ridendine/auth` — Authentication middleware and helpers
- `@ridendine/routing` — ETA / routing service
- `@ridendine/ui` — Shared React components
- `@ridendine/types` — TypeScript types and capabilities
- `@ridendine/validation` — Zod schemas
- `@ridendine/utils` — Rate limiting (Upstash), processor-token validation, helpers
- `@ridendine/notifications` — Notification templates
- `@ridendine/config` — Shared configs (TS, Tailwind, ESLint incl. the `db-boundary` rule)

## Authoritative directories

| Directory | Treat as |
|---|---|
| `apps/*/src/` | Source |
| `packages/*/src/` | Source |
| `supabase/migrations/` | Source — **forward-only, applied to production** |
| `scripts/` | Dev tooling and CI gates |
| `e2e/` | Playwright tests |
| `docs/` | Documentation (mixed hand-written and generated) |
| `.github/workflows/` | CI |

## Never treat these as source

`apps/*/.next/` · `node_modules/` · `.turbo/` · `.gitnexus/` · `.local-tools/` ·
`**/graphify-out/` (8 copies, all generated) · `archive/` (now an empty shell) ·
`test-results/` · `.claude-flow/` · `packages/db/src/generated/database.types.ts`
(regenerate with `pnpm db:generate`, never hand-edit).

`AGENTS.md` and `.claude/skills/gitnexus-*` are GitNexus-generated.

## Key Design Decisions

1. **Chef-first** — `chef_storefronts` is the primary listing entity.
2. **No parallel models** — single canonical schema for all domains.
3. **Package boundary** — all DB access should go through `@ridendine/db`
   repositories. ⚠ This boundary is currently eroded: ~398 raw
   `supabase.from()` calls exist in app code and `pnpm audit:db-boundary` is
   **failing**. Do not add new raw calls.
4. **Single engine authority** — order, delivery, and payout state transitions
   go through `@ridendine/engine` orchestrators, never direct table writes.
5. **Type safety** — end-to-end TypeScript with Zod validation at route
   boundaries.

## Commands

```bash
pnpm install          # Install all dependencies (Node >= 20, pnpm 9.15.0)
pnpm dev              # Run all apps
pnpm dev:web          # Customer app (also :chef :ops :driver)
pnpm build            # Build all apps
pnpm lint             # Lint all apps
pnpm typecheck        # Type check everything
pnpm test             # All package + app unit tests
pnpm db:generate      # Regenerate Supabase types
pnpm local-cron       # Simulate Vercel cron against localhost:3002
```

To bypass the Turbo cache use `pnpm exec turbo <task> --force`.
`pnpm typecheck -- --force` passes `--force` to `tsc` and fails.

### Required gates before committing

```bash
pnpm typecheck
pnpm lint
pnpm audit:guards            # every API route is auth-guarded
pnpm audit:db-boundary       # no NEW raw .from() calls
pnpm verify:prod-data-hygiene
pnpm test
pnpm test:wiring-fixes       # runtime contract + surface classification
pnpm docs:wiring             # if you added/removed a page or API route
```

**Known red at baseline** (pre-existing, not caused by your change — verify
before "fixing"):
- `@ridendine/chef-admin` test — Costs page has no sidebar nav entry
- `pnpm audit:db-boundary` — +52 raw `.from()` calls over baseline
- `pnpm test:wiring-fixes` — 6 failures; surface counts are 104 pages / 180 API
  routes but the docs assert 101 / 172

## Testing requirements

- New engine logic → Vitest in `packages/engine/src/**/*.test.ts`
- New app route/component → Jest in `apps/*/src/__tests__/` or colocated `__tests__/`
- New API route → must pass `pnpm audit:guards` (it must have an auth guard)
- New page or API route → re-run `pnpm docs:wiring` and commit the regenerated docs
- Money or lifecycle changes → also run `pnpm test:e2e:lifecycle` against a seeded
  local Supabase stack (`supabase start` → `pnpm test:e2e:setup`)
- Schema changes → a **new** forward-only migration, then `pnpm db:generate`.
  Never edit an applied migration in place — that already caused a production
  incident (see commit `a6c72f6c`).

## Database

- PostgreSQL 17 via Supabase; **113 tables** across 62 migrations
- Row Level Security is the enforcement boundary; the admin/service-role client
  bypasses it and is engine/cron-only
- Migrations in `supabase/migrations/` (`00061` is intentionally absent)
- Seeds in `supabase/seeds/`; pgTAP RLS tests in `supabase/tests/rls/`
- Local stack: API 54321, DB 54322, Studio 54323

## Order Flow

1. Customer browses → adds to cart → checkout
   (`apps/web/src/lib/checkout/run-checkout.ts` — server quote, risk, idempotency,
   order creation, Stripe PaymentIntent; **shared with the partner API**)
2. Stripe webhook confirms payment → order `PENDING`
3. Chef accepts → prepares → marks ready
4. `DispatchOrchestrator` creates the delivery and offers it to ranked drivers
5. Driver accepts → picks up → delivers
6. Order `COMPLETED` → payout and ledger writes
7. Customer reviews

Transition tables are authoritative in
`packages/engine/src/orchestrators/order-state-machine.ts`. Invalid transitions
throw `InvalidTransitionError`.

**Dispatch note:** the live path is `DriverMatchingService` →
`OfferManagementService` → `DispatchOrchestrator`.
`packages/engine/src/services/dispatch.service.ts` is a **dead second
implementation** — exported but called by nothing. Do not build on it.

## Runtime paths worth knowing

- **Scheduled work** — Vercel Cron → `apps/ops-admin/src/app/api/engine/processors/{sla,expired-offers,partner-webhooks}`, guarded by
  `validateEngineProcessorHeaders`. `apps/ops-admin/src/app/api/cron/*` is legacy:
  none of its five routes is scheduled. `sla-tick` is deprecated, `expired-offers`
  duplicates the processor, and the two payout-preview routes plus
  `reconciliation-daily` have no processor equivalent — they run nowhere.
- **Two Stripe webhooks** — `apps/web/api/webhooks/stripe` (`STRIPE_WEBHOOK_SECRET`)
  and `apps/ops-admin/api/stripe/webhook` (`STRIPE_WEBHOOK_SECRET_OPS`).
- **Two `getEngine` functions** — `packages/engine/src/core/engine.factory.ts`
  (per-request, takes a client) and `packages/engine/src/server.ts` (module-level
  singleton, no args). Check which one you are importing.
- **Broken package exports** — `@ridendine/engine` still declares `./orders` and
  `./dispatch`, which point at files deleted in Phase 3. Do not import them.

## File Conventions

- Components: `src/components/[domain]/[component].tsx`
- Pages: `src/app/[route]/page.tsx` (App Router)
- API: `src/app/api/[route]/route.ts`
- Repositories: `packages/db/src/repositories/[domain].repository.ts`
- Engine orchestrators: `packages/engine/src/orchestrators/`
- Engine services: `packages/engine/src/services/`

## GitNexus usage expectations

GitNexus is indexed for this repository as **`ridendine-marketplace`**.

- **Every CLI query must pass `--repo ridendine-marketplace`.** Four repositories
  are registered globally on this machine; without the flag the command fails.
- Run `gitnexus status` at the start of a session; re-index after substantial
  structural changes.
- Re-indexing needs a raised buffer pool — the default aborts on this repo:
  ```bash
  GITNEXUS_LBUG_BUFFER_POOL_SIZE=17179869184 gitnexus analyze . --skills --pdg --name ridendine-marketplace
  ```
- Consult the graph (`context`, `impact`, `trace`) before modifying an unfamiliar
  subsystem. `MasterOrderEngine` has a **CRITICAL** blast radius (122 symbols).
- **An empty graph result means "unresolved", never "unused."** 1,671 of 1,871
  entry points did not rank into the indexed flows and 226 cross-language property
  sites were not linked. Confirm with a text search before deleting anything.

## No-drift rules

1. Confirm you are in `D:\Projects\RIDENDINE\ridendine-marketplace` before editing.
2. Consult GitNexus before modifying an unfamiliar subsystem.
3. Search for an existing implementation before creating a new one — this repo
   already carries several duplicated systems.
4. Determine blast radius before changing anything shared (`packages/*`).
5. Preserve subsystem boundaries: apps → engine → db → Supabase. Do not add raw
   `supabase.from()` calls in app code.
6. Never use another repository as an implicit source of truth.
7. Never assume a similarly named file does the same thing (`dispatch.service.ts`
   vs `dispatch-orchestrator.ts`; two different `getEngine`s).
8. Verify execution paths instead of inferring them from filenames.
9. Update `PROJECT_BASELINE.md` / `ARCHITECTURE.md` / `REPO_MAP.md` when the
   architecture materially changes.
10. Re-index GitNexus after substantial structural changes.

## Documentation

For detailed platform information, see:
- `PROJECT_BASELINE.md` — repository baseline, known issues, verification status
- `ARCHITECTURE.md` — subsystems, execution paths, data flows
- `REPO_MAP.md` — annotated directory tree
- `docs/REBUILD_TRACKER.md` — the 12-phase rebuild log; explains why things were deleted
- `docs/business-rules/` — hand-written domain rules
- `docs/PLATFORM_OVERVIEW.md` — page inventory (⚠ says 56 pages; actual is 104)
- `docs/ORDER_FLOW.md` — order lifecycle and status workflow
- `docs/DATABASE_SCHEMA.md` — Supabase tables (⚠ says ~70; migrations create 113)
- `docs/APP_CONNECTIONS.md` — how apps connect and communicate
- `docs/wiring/` — generated route/API/wiring inventories (⚠ stale — regenerate)

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **ridendine-marketplace** (64374 symbols, 147224 relationships, 627 execution flows).

> Index stale? Run `node .gitnexus/run.cjs analyze --index-only` from the project root — it auto-selects an available runner. No `.gitnexus/run.cjs` yet? Bootstrap with `npx`, `bunx`, or `pnpm dlx` — e.g. `bunx gitnexus@latest analyze` (npm 11 npx crash; #1939).

## Always Do

- **MUST run impact analysis before editing.** Use `impact({target: "symbolName", direction: "upstream"})` (MCP) or `node .gitnexus/run.cjs impact "symbolName" --direction upstream --repo .` (CLI fallback); report callers, processes, and risk. Never substitute grep for graph analysis. For unified PDG impact, add `mode: "pdg"` with optional `line: <N>` — it returns statement-level `affectedStatements` over CDG + REACHING_DEF and inter-procedural symbols in `interproceduralByDepth`/`byDepth`; no-layer/degraded PDG results are UNKNOWN-risk notes (`--pdg` layer). CLI equivalent: `node .gitnexus/run.cjs impact "symbolName" --direction upstream --mode pdg --line <N> --repo .`.
- **MUST analyze graph changes before committing.** Use `detect_changes({scope: "all"})` (MCP) or `node .gitnexus/run.cjs detect-changes --scope all --repo .` (CLI fallback). `partial: true` or `truncated: true` is not a clean check — a zero means unseen, not unaffected; re-run it. For regression review: `detect_changes({scope: "compare", base_ref: "master"})` or `node .gitnexus/run.cjs detect-changes --scope compare --base-ref "master" --repo .`.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- **MUST treat `risk: UNKNOWN` as unresolved, not as low.** An empty caller set is not evidence the symbol is unused — it can also mean the callers are not resolvable by the index (plain-object property access, dynamic dispatch, cross-language calls). `impact` pairs `UNKNOWN` with a `riskNote` saying so. Confirm with a text search before treating the symbol as safe to change or delete; do not proceed on the strength of a zero.
- When exploring unfamiliar code, use `query({search_query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `context({name: "symbolName"})`.
- For security review, `explain({target: "fileOrSymbol"})` lists taint findings (source→sink flows; needs `analyze --pdg`).
- For control/data dependence, `pdg_query({mode: "controls", target: "fileOrSymbol"})` answers "under what condition does X run?" (CDG, incl. guard clauses) and `pdg_query({mode: "flows", target, variable})` traces "where does variable Y flow?" (REACHING_DEF). `--pdg` layer.

## Never Do

- NEVER edit a function, class, or method before MCP/CLI impact analysis.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis, and never read `UNKNOWN` as an all-clear — it means the walk could not answer, which is the one verdict that requires confirming by other means.
- NEVER rename symbols with find-and-replace — use `rename` which understands the call graph.
- NEVER commit before MCP/CLI graph change analysis.

## Resources

| Resource | Use for |
| --- | --- |
| `gitnexus://repo/ridendine-marketplace/context` | Codebase overview, check index freshness |
| `gitnexus://repo/ridendine-marketplace/clusters` | All functional areas |
| `gitnexus://repo/ridendine-marketplace/processes` | All execution flows |
| `gitnexus://repo/ridendine-marketplace/process/{name}` | Step-by-step execution trace |

## CLI

| Task | Read this skill file |
| --- | --- |
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus-cli/SKILL.md` |
| Work in the Repositories area (644 symbols) | `.claude/skills/gitnexus-area-repositories/SKILL.md` |
| Work in the [id] area (223 symbols) | `.claude/skills/gitnexus-area-id/SKILL.md` |
| Work in the Smoke area (218 symbols) | `.claude/skills/gitnexus-area-smoke/SKILL.md` |
| Work in the Orchestrators area (182 symbols) | `.claude/skills/gitnexus-area-orchestrators/SKILL.md` |
| Work in the Components area (174 symbols) | `.claude/skills/gitnexus-area-components/SKILL.md` |
| Work in the Wiring area (147 symbols) | `.claude/skills/gitnexus-area-wiring/SKILL.md` |
| Work in the Services area (113 symbols) | `.claude/skills/gitnexus-area-services/SKILL.md` |
| Work in the Audit area (87 symbols) | `.claude/skills/gitnexus-area-audit/SKILL.md` |
| Work in the Orders area (45 symbols) | `.claude/skills/gitnexus-area-orders/SKILL.md` |
| Work in the _components area (41 symbols) | `.claude/skills/gitnexus-area-components-2/SKILL.md` |
| Work in the Exceptions area (39 symbols) | `.claude/skills/gitnexus-area-exceptions/SKILL.md` |
| Work in the Dashboard area (38 symbols) | `.claude/skills/gitnexus-area-dashboard/SKILL.md` |
| Work in the Hooks area (37 symbols) | `.claude/skills/gitnexus-area-hooks/SKILL.md` |
| Work in the Kitchen area (34 symbols) | `.claude/skills/gitnexus-area-kitchen/SKILL.md` |
| Work in the Compliance area (30 symbols) | `.claude/skills/gitnexus-area-compliance/SKILL.md` |
| Work in the Checkout area (29 symbols) | `.claude/skills/gitnexus-area-checkout/SKILL.md` |
| Work in the Domains area (28 symbols) | `.claude/skills/gitnexus-area-domains/SKILL.md` |
| Work in the Health area (27 symbols) | `.claude/skills/gitnexus-area-health/SKILL.md` |
| Work in the Settings area (26 symbols) | `.claude/skills/gitnexus-area-settings/SKILL.md` |
| Work in the Scripts area (25 symbols) | `.claude/skills/gitnexus-area-scripts/SKILL.md` |

<!-- gitnexus:end -->
