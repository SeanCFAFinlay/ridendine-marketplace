# 03 — Repository Inventory

Structural census of `ridendine-marketplace` at `c8b9049d`.

---

## 1. Census

**3,377 files** total excluding `node_modules/`, `.git/`, `graphify-out/`, `.turbo/`, `.local-tools/`, `.gitnexus/`.
**1,107 source files** (`.ts .tsx .cjs .mjs .sql .ps1`) after also excluding `.next/` and `test-results/`.

| Extension | Count | Note |
|---|---|---|
| `.ts` | 947 | includes `.next/types` generated stubs |
| `.js` | 793 | mostly build output and config |
| `.json` | 451 | manifests, build manifests, fixtures |
| `.tsx` | 320 | React components and pages |
| `.md` | 261 | documentation — a very large surface |
| `.sql` | 69 | 62 migrations + seeds + RLS tests + dev fixtures |
| `.cjs` | 39 | smoke/audit/wiring scripts |
| `.mjs` | 15 | audit and dev scripts |
| `.ps1` | 5 | Windows release/smoke tooling |

## 2. Directory-purpose table

| Path | Purpose | Active? | Runtime role | Evidence | Confidence | Notes |
|---|---|---|---|---|---|---|
| `apps/web/` | Customer marketplace | **Yes** | Deployable — `ridendine.ca:3000`. Also hosts the partner API and the customer Stripe webhook. | `apps/web/package.json: scripts.dev "next dev -p 3000"`; `apps/web/vercel.json` | 1.00 | 144 src files, 23 pages, 36 API routes, 70 test files |
| `apps/chef-admin/` | Chef dashboard + Kitchen OS | **Yes** | Deployable — `chef.ridendine.ca:3001` | `apps/chef-admin/package.json`; `vercel.json` | 1.00 | 161 src, 30 pages, 68 API routes, 18 tests |
| `apps/ops-admin/` | Operations console | **Yes** | Deployable — `ops.ridendine.ca:3002`. **Sole host of Vercel Cron and the finance Stripe webhook.** | `apps/ops-admin/vercel.json: crons[]` | 1.00 | 191 src, 40 pages, 57 API routes, 28 tests |
| `apps/driver-app/` | Driver PWA | **Yes** | Deployable — `driver.ridendine.ca:3003` | `apps/driver-app/package.json`; middleware matcher excludes `sw.js`/`manifest.json` | 1.00 | 89 src, 11 pages, 19 API routes, 32 tests |
| `packages/engine/` | **Central business logic.** Orchestrators, services, state machines, SLA, notifications, money. | **Yes** | Library — imported by all 4 apps | `packages/engine/package.json`; every app lists it as a workspace dep | 1.00 | 133 src, 62 tests — the densest tested area |
| `packages/db/` | Supabase clients (browser / server / admin), 22 repositories, generated types, realtime channels, hooks | **Yes** | Library | `packages/db/src/repositories/` (22 `*.repository.ts`) | 1.00 | `src/generated/database.types.ts` is generated — never hand-edit |
| `packages/auth/` | Auth middleware factory, session/role helpers, React auth provider | **Yes** | Library | `packages/auth/src/middleware.ts: createAuthMiddleware`; used by all 4 `src/middleware.ts` | 1.00 | 9 src files, 1 test |
| `packages/routing/` | ETA + routing abstraction; OSRM and Mapbox providers | **Partly** | Library | `packages/routing/src/osrm.provider.ts` used; `mapbox.provider.ts` exported but never instantiated | 1.00 | Mapbox path is INACTIVE |
| `packages/ui/` | Shared React design-system components | **Yes** | Library | imported across all apps (`PageHeader`, `KpiTile`, `StatusBadge`, `EmptyState`) | 1.00 | 25 src, 1 test |
| `packages/types/` | Canonical enums (`ActorRole`, `EngineOrderStatus`, capabilities) | **Yes** | Library | `packages/types` imported by engine, db, apps | 1.00 | The vocabulary of the whole system |
| `packages/validation/` | Zod schemas at route boundaries | **Yes** | Library | `partnerCheckoutSchema`, `bankPayoutCommandSchema` | 1.00 | 25 src, 8 tests — **tests never run in CI** |
| `packages/utils/` | Rate limiting, processor-token auth, correlation IDs, log redaction, Stripe retry, scoring | **Yes** | Library | `validateEngineProcessorHeaders`, `evaluateRateLimit` | 1.00 | 33 src, 9 tests |
| `packages/notifications/` | Email templates | **Yes** | Library | `@ridendine/notifications` dep of engine | 0.90 | 5 src — **tests never run in CI** |
| `packages/config/` | Shared TS / Tailwind / ESLint config incl. the `db-boundary` lint rule | **Yes** | Build-time only | `packages/config/eslint.config.js` referenced by every app's lint script | 1.00 | No `src/` |
| `supabase/migrations/` | **Source.** 62 forward-only SQL migrations, applied to production. | **Yes** | Schema of record | `00001`…`00063`, `00061` absent | 1.00 | Never edit in place |
| `supabase/seeds/` | `seed.sql` — local development data | Yes (local) | Dev only | `package.json: db:seed` | 1.00 | CI is blocked from running it (`verify:prod-data-hygiene`) |
| `supabase/tests/rls/` | pgTAP RLS assertions: `kitchen_scope.sql`, `role_alignment.sql` | **Present but unexecuted** | — | no workflow references them | 0.95 | Real test value, zero CI value |
| `scripts/` | Dev tooling + CI gates: `audit/`, `smoke/`, `wiring/`, `docs/`, `e2e/`, `load/`, `ui/`, `release/`, `partners/`, `tools/` | **Yes** | CI + local | `.github/workflows/ci.yml` runs 4 of them | 1.00 | 26 smoke test files, 10 audit files |
| `e2e/` | Playwright: 6 lifecycle specs + 2 smoke specs, fixtures | **Yes** | CI | `playwright.config.ts`; `ci.yml: smoke-e2e` | 1.00 | PR runs `@smoke` only; full suite nightly |
| `.github/workflows/` | `ci.yml`, `e2e.yml`, `load-test.yml`, `post-deploy-smoke.yml` | **Yes** | CI/CD | read in full | 1.00 | `ci.yml` triggers on `master`/`main` only |
| `docs/` | 261 markdown files, hand-written + generated | Mixed | Documentation | — | 1.00 | Several documents are knowingly stale — see `21` |
| `docs/wiring/` | Generated route/API/wiring inventories | **Stale** | Documentation | 90 pages / ~104 APIs documented vs 104 / 180 actual | 1.00 | Regenerating breaks a gate — see `21` C-05 |
| `archive/` | 351 files, **all** `graphify-out` artifacts | **No** | — | `find archive -type f` → only `graphify-out/**` and one `GRAPH_REPORT.md` | 1.00 | `CLAUDE.md` calls it "an empty shell": empty of *source*, not empty of files |
| `**/graphify-out/` × 8 | Generated knowledge-graph output | **No** | — | `.gitignore: **/graphify-out/` | 1.00 | `apps/`, `packages/`, `docs/`, `e2e/`, `scripts/`, `archive/` ×2, root |
| `.gitnexus/` | GitNexus code-intelligence index — **309 MB** | **No** | Dev tooling | `CLAUDE.md` §GitNexus | 1.00 | Largest directory in the tree |
| `.local-tools/` | Vendored Node 22.16.0 + corepack — **152 MB** | **No** | Dev tooling | `.gitignore: .local-tools/`; `scripts/tools/ensure-node-pnpm.ps1` | 1.00 | Windows bootstrap convenience |
| `apps/*/.next/` | Build output | **No** | — | `.gitignore: .next/` | 1.00 | Present locally; 4 stale builds |
| `.turbo/`, `test-results/`, `.claude-flow/`, `.claude/`, `.superpowers/`, `.obsidian/` | Caches, agent tooling, editor config | **No** | — | `.gitignore` | 1.00 | |

## 3. Language, framework and tooling indicators

| Signal | Value |
|---|---|
| Package manager | pnpm **9.15.0** (`packageManager` field, `pnpm-lock.yaml` 330 KB) |
| Node | `>=20.0.0` engine constraint; CI uses 20; the local vendored runtime is 22.16.0 |
| Monorepo | Turborepo 2.3 |
| Framework | Next.js 14.2 App Router, React 18.3 |
| Language | TypeScript 5.6 |
| Styling | Tailwind 3.4 + PostCSS + `prettier-plugin-tailwindcss` |
| Lint | ESLint 9 flat config + `typescript-eslint` 8 + custom `db-boundary/no-raw-supabase-from` rule |
| Test | Vitest (packages), Jest 29 + Testing Library (apps), Playwright 1.55 (e2e), `node --test` (smoke contracts) |
| Database | Supabase CLI, PostgreSQL 17 |
| Payments | `stripe` 20.4 server SDK, `@stripe/react-stripe-js` 5.6 client |
| Maps | Leaflet 1.9 + react-leaflet 5 (driver + ops) |
| Hosting | Vercel (4 projects, one per app) |

## 4. Duplicate or versioned trees

**None in source.** No `v1/`, `v2/`, `old/`, `backup/`, `legacy/` directories exist under `apps/`, `packages/`, `scripts/` or `supabase/`. The 23 `*.old` files are all webpack cache artifacts inside `apps/*/.next/cache/`.

Duplication that *does* exist is at the module level, not the directory level — see `20-legacy-duplicate-and-dead-code.md`.

## 5. Submodules, nested repositories, vendored code

- No Git submodules (`.gitmodules` absent).
- No nested `.git` directories.
- `.local-tools/node-v22.16.0-win-x64/` is a vendored Node runtime, gitignored.
- `docs/partner-integration/hoang-gia-pho/` is a partner integration kit with its own `.env.example` — documentation, not code. A matching `hoang-gia-pho-ridendine-kit.zip` sits in the parent (non-repo) folder.

## 6. Unusually large files and directories

| Item | Size | Nature |
|---|---|---|
| `.gitnexus/` | 309 MB | Generated index |
| `.local-tools/` | 152 MB | Vendored toolchain |
| `pnpm-lock.yaml` | 330 KB | Lockfile |
| `graphify-out/` (root) | 2.6 MB | Generated (×8 copies across the tree) |
| `packages/db/src/generated/database.types.ts` | >5,000 lines | Generated Supabase types |
| `PROJECT_BASELINE.md` | 53 KB | Hand-written baseline |
| `ARCHITECTURE.md` | 36 KB | Hand-written |
| `REPO_MAP.md` | 20 KB | Hand-written |
| `CLAUDE.md` | 18 KB | Agent context, partly GitNexus-generated |

## 7. Documentation's own claims about the architecture

The repository documents itself heavily. Treated here as **claims**, verified independently:

| Claim source | Claim | Verified? |
|---|---|---|
| `CLAUDE.md` | 4 apps, ports 3000–3003 | ✅ VERIFIED |
| `CLAUDE.md` | 22 repositories in `@ridendine/db` | ✅ VERIFIED (22 `*.repository.ts` excluding `index.ts` and tests) |
| `CLAUDE.md` | 113 tables across 62 migrations | ⚠️ 62 migrations VERIFIED; **112** distinct `CREATE TABLE` names, no `DROP TABLE` anywhere |
| `CLAUDE.md` | `00061` intentionally absent | ✅ VERIFIED |
| `CLAUDE.md` | ~398 raw `supabase.from()` calls, ratchet re-baselined | ✅ VERIFIED — 71 + 259 + 53 + 15 = 398, gate passes at baseline |
| `CLAUDE.md` | `dispatch.service.ts` is a dead second implementation | ✅ VERIFIED — referenced only by the barrel export and its own test |
| `CLAUDE.md` | `@ridendine/engine` exports `./orders` and `./dispatch` pointing at deleted files | ✅ VERIFIED — `order.orchestrator.ts` and `dispatch.engine.ts` do not exist |
| `CLAUDE.md` | 5 legacy `/api/cron/*` routes, none scheduled | ✅ VERIFIED |
| `CLAUDE.md` | Two `getEngine` functions — check which you import | ⚠️ Both exist, but **neither has a production caller**; all four apps use `getAdminEngine` |
| `CLAUDE.md` | Committed wiring docs stale at 91 pages / 124 APIs | ⚠️ Direction correct, numbers differ: **90** page rows / **~104** endpoint rows vs 104 / 180 actual |
| `CLAUDE.md` | `archive/` is now an empty shell | ⚠️ Empty of source; 351 generated files remain |
| `docs/PLATFORM_OVERVIEW.md` | 56 pages | ❌ CONTRADICTED — 104 |
| `docs/DATABASE_SCHEMA.md` | ~70 tables | ❌ CONTRADICTED — 112 |

Full contradiction register: `21-contradictions-and-unknowns.md`.

## 8. Exclusions list

| Excluded | Why | Risk of exclusion |
|---|---|---|
| `node_modules/` | Dependency source, per configuration | None — manifests read instead |
| `.gitnexus/`, `.local-tools/`, `.turbo/` | Generated caches / vendored toolchain | None |
| `**/graphify-out/` (8) | Generated, gitignored | None |
| `archive/` | Contains only generated artifacts | None |
| `apps/*/.next/` | Build output | Low — one targeted grep performed |
| `test-results/`, `playwright-report/` | Test artifacts | None |
| `.claude*/`, `.superpowers/`, `.obsidian/` | Agent/editor tooling | None |
| Parent `D:\Projects\RIDENDINE\` | Business documents, not this system | None |
| Live Supabase / Stripe / Vercel | No credentials; read-only mandate | **Material** — see `21` unknowns U-01…U-05 |
| Individual reads of all 180 route files | Time; enumeration + gate execution used instead | Low-moderate — a route-specific defect could hide. ~25 routes read in full, chosen for money, auth and scheduling relevance. |
