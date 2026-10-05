# 25 — Evidence Index

Traceability from any claim, diagram node or arrow back to the exact file and symbol. Paths are relative to the repository root (`ridendine-marketplace/`). Symbols and configuration keys are preferred over line numbers because line numbers drift; the two line references given are marked as of commit `c8b9049d`.

---

## Structure and scale

| ID | Claim | Status | Conf. | File | Symbol / key | Used in |
|---|---|---|---|---|---|---|
| EV-001 | pnpm/Turborepo monorepo; workspaces `apps/*`, `packages/*` | VERIFIED | 1.00 | `pnpm-workspace.yaml`, `turbo.json` | `packages`, `tasks` | 01, 03 |
| EV-002 | 4 apps on ports 3000–3003 | VERIFIED | 1.00 | `apps/*/package.json` | `scripts.dev` | 01, 04, 05, 07, 16 |
| EV-003 | 104 pages, 180 API route files | VERIFIED | 1.00 | filesystem | `page.tsx`, `route.ts` counts | 01, 03, 10 |
| EV-004 | 62 migrations, `00061` absent | VERIFIED | 1.00 | `supabase/migrations/` | filenames | 01, 03, 09 |
| EV-005 | 112 tables, all with RLS enabled, 0 dropped | VERIFIED | 1.00 | `supabase/migrations/*.sql` | `CREATE TABLE` / `ENABLE ROW LEVEL SECURITY` / `DROP TABLE` | 01, 09, 13 |
| EV-006 | 316 policies, 34 functions, 37 triggers, 13 `SECURITY DEFINER` | VERIFIED | 0.95 | `supabase/migrations/*.sql` | grep counts | 05, 13 |
| EV-007 | 22 repositories in `@ridendine/db` | VERIFIED | 1.00 | `packages/db/src/repositories/` | `*.repository.ts` | 05, 17 |
| EV-008 | 250 test files; 62 in the engine | VERIFIED | 1.00 | filesystem | `*.test.ts(x)`, `*.spec.ts` | 15 |
| EV-009 | HEAD `c8b9049d`, branch `feat/cooco-partner-webhooks-realtime`, 412 commits, clean tree | VERIFIED | 1.00 | git | `log`, `branch`, `status`, `rev-list` | 00, 01 |
| EV-010 | Production domains `ridendine.ca` / `chef.` / `driver.` / `ops.` | VERIFIED | 0.95 | `scripts/smoke/runtime-contracts.cjs` | `defaultBaseUrl` | 01, 04, 16 |

## Scheduling — the R-01 chain

| ID | Claim | Status | Conf. | File | Symbol / key | Used in |
|---|---|---|---|---|---|---|
| EV-020 | Exactly 3 crons, all on ops-admin: sla `0 2 * * *`, expired-offers `0 3 * * *`, partner-webhooks `* * * * *` | VERIFIED | 1.00 | `apps/ops-admin/vercel.json` | `crons` | 01, 04, 07, 16 |
| **EV-021** | **All three processors implement work in `POST`; `GET` returns a status object and performs no work** | VERIFIED (code) → INFERRED (consequence) | 1.00 / 0.90 | `apps/ops-admin/src/app/api/engine/processors/{sla,expired-offers,partner-webhooks}/route.ts` | `export async function POST`, `export async function GET` | 01, 04, 05, 07, 14, 16, 21, 22 |
| EV-022 | The local cron simulator uses `method: 'POST'` — corroborating the intended contract | VERIFIED | 1.00 | `scripts/local-cron.mjs` | `tick()` | 07, 16, 21 |
| EV-023 | Processor auth accepts `Authorization: Bearer $CRON_SECRET` or `x-processor-token`; fails closed | VERIFIED | 1.00 | `packages/utils/src/processor-auth.ts` | `validateEngineProcessorHeaders` | 07, 12, 13 |
| EV-024 | 5 legacy `/api/cron/*` routes, none in `vercel.json` | VERIFIED | 1.00 | `apps/ops-admin/src/app/api/cron/*/route.ts` vs `vercel.json` | — | 07, 20, 21 |
| EV-025 | `sla-tick` self-documents as deprecated and not invoked by production cron | VERIFIED | 1.00 | `apps/ops-admin/src/app/api/cron/sla-tick/route.ts` | header comment | 20 |
| EV-026 | `reconciliation-daily` has no processor equivalent and no schedule | VERIFIED | 1.00 | `apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts` | `engine.reconciliation.runDaily` | 01, 14, 20, 21, 22 |
| EV-027 | `ops_processor_runs` unique on `(processor_name, idempotency_key)` | VERIFIED | 1.00 | `supabase/migrations/00023_ops_processor_runs.sql` | `unique(...)` | 07, 09, 14 |
| EV-028 | `partner-webhooks` does not claim a processor run | VERIFIED | 1.00 | `apps/ops-admin/src/app/api/engine/processors/partner-webhooks/route.ts` | absence of `claimProcessorRun` | 05, 14, 22 |
| EV-029 | `/api/engine/health` tracks 5 processors, 3 permanently null, and omits `partner-webhooks` | VERIFIED | 1.00 | `apps/ops-admin/src/app/api/engine/health/route.ts` | `TRACKED_PROCESSORS`, `envReadiness` | 07, 17, 21 |
| EV-030 | The SLA route comment says "every minute"; the schedule is daily | CONTRADICTED | 1.00 | route header vs `vercel.json` | — | 21 |

## Checkout and money

| ID | Claim | Status | Conf. | File | Symbol / key | Used in |
|---|---|---|---|---|---|---|
| EV-040 | Single shared checkout path for customer and partner | VERIFIED | 1.00 | `apps/web/src/lib/checkout/run-checkout.ts` | `runCheckout` | 01, 05, 08, 10 |
| EV-041 | Server always recomputes the quote; client values compared, not used | VERIFIED | 1.00 | `apps/web/src/lib/checkout/quote.ts` | `buildCheckoutQuote`, `computeServerQuote` | 08 |
| EV-042 | Idempotency: unique `(customer_id, idempotency_key)`, `23505` handled, 120 s stale reclaim | VERIFIED | 1.00 | `run-checkout.ts`; `supabase/migrations/00018_phase_c_checkout_idempotency.sql` | `IDEMPOTENCY_PROCESSING_STALE_MS`, `reclaimStaleIdempotencyRow`, `UNIQUE(customer_id, idempotency_key)` | 05, 08, 09, 14 |
| EV-043 | Every post-claim failure cancels the order and marks the row failed | VERIFIED | 1.00 | `run-checkout.ts` | `catch (checkoutError)`, `markIdempotencyRecordFailed` | 08, 14 |
| EV-044 | Webhook asserts paid amount equals order total to the cent | VERIFIED | 1.00 | `apps/web/src/app/api/webhooks/stripe/route.ts` | `stripePaymentAmountCents`, `expectedAmountCents` | 05, 08, 13 |
| EV-045 | Live-then-test webhook secret verification; `isPartnerTestEvent` | VERIFIED | 1.00 | same | `constructWebhookEvent` | 05, 08 |
| EV-046 | Ops webhook handles only 3 finance event types and returns early before claiming | VERIFIED | 1.00 | `apps/ops-admin/src/app/api/stripe/webhook/route.ts` | `FINANCE_TYPES` | 04, 05 |
| EV-047 | Pricing: 8% service, 13% HST, $3.99 + $0.50/km capped $9.99, +$2.00 under $15 | VERIFIED | 1.00 | `packages/engine/src/{constants.ts,services/delivery-fee.service.ts}` | `SERVICE_FEE_PERCENT`, `HST_RATE`, `DELIVERY_*` | 02, 08 |
| EV-048 | Tax computed pre-discount; discount subtracted from the gross total | VERIFIED (code) | 1.00 | `quote.ts` | `computeServerQuote` | 08, 22 |
| EV-049 | Split: platform 15% of subtotal, driver 80% of delivery fee — implemented twice | VERIFIED | 1.00 | `constants.ts`; `payout-engine.ts`; `commerce.engine.ts` | `PLATFORM_FEE_PERCENT`, `DRIVER_PAYOUT_PERCENT` | 05, 08, 20, 22 |
| EV-050 | Ledger idempotency key `{entryType}:{sourceId}` + unique index | VERIFIED | 1.00 | `ledger.service.ts`; `supabase/migrations/00019_business_engine.sql` | `makeLedgerIdempotencyKey`, `uq_ledger_entries_idempotency_key` | 05, 09, 14 |
| EV-051 | Ledger duplicate race returns an error, not an idempotent no-op | VERIFIED | 0.90 | `ledger.service.ts` | `insertIdempotent` | 14, 22 |
| EV-052 | One `processing` payout run per type enforced by a partial unique index | VERIFIED | 1.00 | `supabase/migrations/00032_payout_concurrency_guard.sql` | `payout_runs_one_processing_per_type` | 09, 14 |
| EV-053 | Surge tiers 1.0 / 1.25 / 1.5 / 2.0, cap 2.0, ratio thresholds 1.5 / 2 / 3 | VERIFIED | 1.00 | `surge-pricing.service.ts` | `SURGE_TIER_*`, `RATIO_*`, `SURGE_CAP` | 08 |
| EV-054 | Loyalty: bronze 0 / silver 500 / gold 1500; ×1.0 / ×1.25 / ×1.5; 1 pt = 10¢ | VERIFIED | 1.00 | `loyalty.service.ts` | `TIER_THRESHOLDS`, `computeMultiplier`, `CENTS_PER_POINT` | 08 |
| EV-055 | Risk engine is pure; `checkoutAttemptCount` never supplied by `runCheckout` | VERIFIED | 1.00 | `risk.engine.ts`; `run-checkout.ts` | `DEFAULT_RISK_LIMITS`, `evaluateCheckoutRisk` call site | 08, 22 |
| EV-056 | Payout sub-routes have no UI caller | VERIFIED | 0.95 | `apps/ops-admin/src` | `grep "engine/payouts/"` → 0 outside the routes; `finance/payouts/page.tsx` has no `fetch` | 01, 10, 22 |

## Auth, security and configuration

| ID | Claim | Status | Conf. | File | Symbol / key | Used in |
|---|---|---|---|---|---|---|
| EV-060 | All four apps use `getAdminEngine` → service-role client, bypassing RLS | VERIFIED | 1.00 | `apps/*/src/lib/engine.ts`; `packages/engine/src/client-helpers.ts`; `packages/db/src/client/admin.ts` | `getAdminEngine`, `createAdminClient` | 05, 07, 09, 13 |
| EV-061 | Middleware uses `auth.getUser()`, not `getSession()`, with an explanatory comment | VERIFIED | 1.00 | `packages/auth/src/middleware.ts` | `supabase.auth.getUser()` | 07, 13 |
| EV-062 | 30-capability × 8-role matrix, fail-closed | VERIFIED | 1.00 | `packages/engine/src/services/platform-api-guards.ts` | `CAPABILITY_ROLES`, `guardPlatformApi` | 05, 13 |
| EV-063 | Guard audit passes: 179 scanned, 14 allowlisted, 0 unguarded | VERIFIED (executed) | 1.00 | `scripts/audit/check-api-route-guards.mjs` | run output | 00, 13, 15 |
| EV-064 | The guard audit checks text presence only and skips `GET` | VERIFIED | 1.00 | same | `APPROVED_GUARDS`, `STATEFUL_METHODS` | 13, 15, 22 |
| EV-065 | db-boundary ratchet passes at 398 (web 71 · chef 259 · driver 53 · ops 15) | VERIFIED (executed) | 1.00 | `scripts/audit/db-boundary-ratchet.mjs` | run output | 03, 05, 20 |
| EV-066 | CSP with per-request nonce exists **only** in `apps/web` | VERIFIED | 1.00 | four `src/middleware.ts` | `buildCsp`, `cspBuilder` | 12, 13, 21 |
| EV-067 | Identical security headers on all four apps; `eslint.ignoreDuringBuilds: true` on all four | VERIFIED | 1.00 | `apps/*/next.config.js` | `headers()`, `eslint` | 12, 16 |
| EV-068 | `ALLOW_DEV_AUTOLOGIN` requires `NODE_ENV !== 'production'` | VERIFIED | 1.00 | `packages/auth/src/middleware.ts` | dev-autologin block | 12, 13 |
| EV-069 | Fixture reset triple-gated | VERIFIED | 1.00 | `apps/ops-admin/src/app/api/fixtures/reset/route.ts` | `fixtureResetEnabled`, `guardPlatformApi(...,'team_manage')` | 07, 12 |
| EV-070 | Partner keys stored as SHA-256; legacy env key uses `timingSafeEqual`, min 16 chars | VERIFIED | 1.00 | `apps/web/src/lib/partner/auth.ts` | `resolvePartnerContext`, `safeEqual` | 05, 13 |
| EV-071 | `x-brand-id` re-validated against `kitchen_id` | VERIFIED | 1.00 | `packages/engine/src/server.ts` | `getOperatorKitchenContext` | 05, 13 |
| EV-072 | 11 rate-limit policies with explicit fail-open/closed | VERIFIED | 1.00 | `packages/utils/src/rate-limit/policies.ts` | `RATE_LIMIT_POLICIES` | 06, 13 |
| EV-073 | Rate limiting falls back to per-instance memory, flagged `degraded` | VERIFIED | 1.00 | `packages/utils/src/rate-limit/index.ts` | memory fallback branch | 11, 13, 14 |
| EV-074 | A live production `DATABASE_URL` with password sits in an untracked `.env.local` | VERIFIED | 1.00 | `.env.local`; `git ls-files --error-unmatch` | — (value redacted) | 12, 13, 22 |
| EV-075 | `NEXT_PUBLIC_WEB_URL` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` documented but unread; `HEALTH_CHECK_TOKEN` and `NEXT_PUBLIC_SITE_URL` read but undocumented | VERIFIED | 1.00 | `.env.example` vs `process.env` census | — | 12, 21 |
| EV-076 | No `child_process`, `eval`, `new Function`, or concatenated SQL in app code | VERIFIED | 0.95 | `apps/*/src`, `packages/*/src` | grep | 13 |
| EV-077 | `/internal/command-center/docs/*` requires only a session; the sibling API requires `team_manage` | VERIFIED | 1.00 | `apps/ops-admin/src/app/internal/command-center/docs/[...docPath]/route.ts` vs `api/internal/command-center/change-requests/route.ts` | `isEnabled`, `guardCommandCenter` | 10, 13 |

## Dead, broken and half-built

| ID | Claim | Status | Conf. | File | Symbol / key | Used in |
|---|---|---|---|---|---|---|
| EV-080 | `dispatch.service.ts` has no production caller | VERIFIED | 0.95 | `packages/engine/src/services/dispatch.service.ts` | referenced only by `index.ts` barrel + its own test | 05, 20 |
| EV-081 | `exports["./orders"]` and `["./dispatch"]` point at non-existent files | VERIFIED | 1.00 | `packages/engine/package.json` | `exports` | 03, 20 |
| EV-082 | Sentry is never initialised | VERIFIED | 0.95 | `apps/*/next.config.js`; `apps/*/src`; `apps/web/.next` | no `withSentryConfig`, no `instrumentation.ts`, 0 imports, no code in build output | 01, 11, 17, 21, 22 |
| EV-083 | Nothing sends a web push | VERIFIED | 0.95 | `apps`, `packages`, `scripts` | `grep "web-push\|VAPID_PRIVATE"` → 0 | 05, 10, 20 |
| EV-084 | `MapboxProvider` exported but never instantiated | VERIFIED | 1.00 | `packages/routing/src/mapbox.provider.ts` | grep for `new MapboxProvider` → 0 | 11, 20 |
| EV-085 | Neither `core.getEngine(client)` nor `server.getEngine()` has a production caller | VERIFIED | 0.95 | `packages/engine/src/{core/engine.factory.ts,server.ts}` | grep across `apps/` | 03, 20 |
| EV-086 | Referral link uses `https://ridendine.com/signup?ref=` — wrong TLD and non-existent path | VERIFIED | 1.00 | `apps/web/src/components/profile/referral-dashboard.tsx`; `apps/web/src/app/` | `BASE_URL`, `buildReferralLink` | 01, 08, 10, 21, 22 |
| EV-087 | `registerPaymentAdapter` called only in `apps/web` | VERIFIED | 1.00 | `apps/web/src/lib/engine.ts` | grep → 1 hit | 07, 14 |
| EV-088 | `archive/` holds 351 files, all `graphify-out` artifacts | VERIFIED | 1.00 | `archive/` | `find` | 03, 20 |
| EV-089 | No `announcements` table; announcements fan out into `notifications` | VERIFIED | 1.00 | `apps/ops-admin/src/app/api/announcements/route.ts` | `insertNotifications`, `listAnnouncementAudienceUserIds` | 09 |

## External dependencies

| ID | Claim | Status | Conf. | File | Symbol / key | Used in |
|---|---|---|---|---|---|---|
| EV-090 | OSRM public demo server, no key, 12 s timeout, 2 retries | VERIFIED | 1.00 | `packages/routing/src/osrm.provider.ts` | `DEFAULT_BASE`, `DEFAULT_TIMEOUT_MS`, `DEFAULT_RETRIES` | 01, 04, 11, 14, 18 |
| EV-091 | Nominatim public, no key, **no timeout**, unbounded cache | VERIFIED | 1.00 | `packages/engine/src/services/geocoding.service.ts` | `NOMINATIM_BASE_URL`, `geocodingCache` | 04, 11, 14, 18 |
| EV-092 | Delivery zone: Hamilton ON, 25 km | VERIFIED | 1.00 | same | `HAMILTON_CENTER_LAT/LNG`, `DELIVERY_RADIUS_KM` | 01, 08 |
| EV-093 | Resend and Twilio registered unconditionally, inert without credentials | VERIFIED | 1.00 | `packages/engine/src/core/engine.factory.ts` | `registerProvider(createResendProvider())` etc. | 05, 11 |
| EV-094 | `@sentry/nextjs` resolves to 9.47.1 | VERIFIED | 1.00 | `node_modules/.pnpm` | directory name | 11 |
| EV-095 | No dependency scanning of any kind | VERIFIED | 1.00 | `.github/` | absence of Dependabot/Renovate/audit/CodeQL | 11, 13, 22 |

## Dispatch and state

| ID | Claim | Status | Conf. | File | Symbol / key | Used in |
|---|---|---|---|---|---|---|
| EV-100 | Full order transition map, 24 statuses, throws on illegal transitions | VERIFIED | 1.00 | `packages/engine/src/orchestrators/order-state-machine.ts` | `ORDER_TRANSITION_MAP`, `InvalidTransitionError` | 01, 05, 08, 09 |
| EV-101 | Legacy status mirror is lossy | VERIFIED | 1.00 | same | `ENGINE_TO_LEGACY_ORDER_STATUS` | 08, 22 |
| EV-102 | Driver score formula, exact | VERIFIED | 1.00 | `orchestrators/driver-matching.service.ts` | `calculateDriverAssignmentScore` | 02, 05, 08 |
| EV-103 | Presence TTL 90 s, radius 10 km, with an explanatory comment | VERIFIED | 1.00 | same | `PRESENCE_TTL_SECONDS`, `findEligibleDrivers` | 05, 08, 14 |
| EV-104 | Delivery created at "ready", not at payment | VERIFIED | 1.00 | `dispatch-orchestrator.ts`; comment in `run-checkout.ts` | `onOrderReadyForPickup` | 06, 08 |
| EV-105 | SLA thresholds 5 / 10 / 45 minutes | VERIFIED | 1.00 | `apps/ops-admin/src/app/api/engine/processors/sla/route.ts` | `checkChefAcceptanceTimeout(client, 5)` etc. | 08, 14 |
| EV-106 | Inventory on-hand = signed sum of movements; `current_quantity` is a documented cache | VERIFIED | 1.00 | `orchestrators/inventory.engine.ts` | `computeOnHand`, header comment | 05, 08, 09, 14 |

## Documentation drift

| ID | Claim | Status | Conf. | Evidence | Used in |
|---|---|---|---|---|---|
| EV-110 | `docs/PLATFORM_OVERVIEW.md` says 56 pages; actual 104 | CONTRADICTED | 1.00 | `## All Pages (56 Total)` vs filesystem | 03, 21 |
| EV-111 | `docs/DATABASE_SCHEMA.md` says ~70 tables; actual 112 | CONTRADICTED | 1.00 | domain headers vs migrations | 03, 21 |
| EV-112 | `docs/wiring/ROUTE_INVENTORY.md` 90 page rows vs 104; `API_INVENTORY.md` ~104 endpoints vs 180 route files | CONTRADICTED | 1.00 | row counts | 03, 10, 21 |
| EV-113 | `CLAUDE.md` says 113 tables; actual 112 | CONTRADICTED | 1.00 | migration grep | 03, 21 |
| EV-114 | `generate-wiring-docs.cjs:317` marks undetectable-auth surfaces PARTIAL with no allowlist (as of `c8b9049d`) | INFERRED | 0.85 | `CLAUDE.md` §Traps; line reference not independently opened | 21, 23 |

## CI and gates

| ID | Claim | Status | Conf. | Evidence | Used in |
|---|---|---|---|---|---|
| EV-120 | `ci.yml` triggers on `master`/`main` push, PRs to them, and a daily schedule | VERIFIED | 1.00 | `.github/workflows/ci.yml: on` | 15, 16 |
| EV-121 | `ci.yml` runs tests for 8 workspaces; `validation`, `routing`, `types`, `ui`, `notifications` are omitted | VERIFIED | 1.00 | `ci.yml` job steps | 15, 22 |
| EV-122 | pgTAP RLS tests exist and no workflow runs them | VERIFIED | 1.00 | `supabase/tests/rls/`; `.github/workflows/` | 15, 21, 22 |
| EV-123 | PR Playwright runs `@smoke` only; full suite nightly | VERIFIED | 1.00 | `ci.yml: smoke-e2e` | 15 |
| EV-124 | Post-deploy smoke runs on deployment success, every 6 h, and manually | VERIFIED | 1.00 | `.github/workflows/post-deploy-smoke.yml` | 16, 17 |
| EV-125 | Load test is dry-run by default; live mode writes real support requests | VERIFIED | 1.00 | `.github/workflows/load-test.yml` header | 07, 18 |
| EV-126 | `verify:prod-data-hygiene` passes; `e2e.yml` is the only sanctioned seed/reset workflow | VERIFIED (executed) | 1.00 | run output; `e2e.yml` marker | 00, 12, 15 |
| EV-127 | `verify-known-wiring-fixes.cjs` passes 20/20 | VERIFIED (executed) | 1.00 | run output | 00, 15 |

---

## Coverage note

Every diagram node and every labelled arrow in `diagrams/*.mmd` references at least one Evidence ID in the explanation beneath it in documents `04`, `07`, `08`, `09`, `13`, `16`. Nodes drawn with a dashed border and grey fill are UNKNOWN or CONTRADICTED and are labelled as such in the diagram legend — no diagram asserts certainty beyond its evidence.
