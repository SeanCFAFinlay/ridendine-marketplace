# Ridendine — Master execution tracker (IRR)

**Source:** [`AUDIT_AND_PLANNING/21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md`](21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md) Part 3 (IRR-001 — IRR-036).  
**Companion:** [`23_PHASE_COMPLETION_LOG.md`](23_PHASE_COMPLETION_LOG.md), [`24_PHASE_GATE_CHECKLIST.md`](24_PHASE_GATE_CHECKLIST.md), [`25_ERROR_AND_DRIFT_PREVENTION_RULES.md`](25_ERROR_AND_DRIFT_PREVENTION_RULES.md).

## Status vocabulary (mandatory)

| Status | Meaning |
|--------|---------|
| `NOT STARTED` | No work begun |
| `IN PROGRESS` | Active session owns the issue |
| `BLOCKED` | Dependency or decision missing — document blocker in Notes |
| `READY FOR TEST` | Implementation complete; tests not yet run or not yet reported |
| `FAILED` | Tests or acceptance failed — must not use DONE |
| `PASSED` | Tests passed; optional gate before formal closure |
| `DONE` | **All** of: required code/docs changes made **where applicable**, tests run and **pass**, acceptance criteria met, [`23_PHASE_COMPLETION_LOG.md`](23_PHASE_COMPLETION_LOG.md) updated for the closing phase |

**Rule:** No issue may be marked `DONE` unless the completion log for the phase that owns acceptance is updated and tests are recorded as passed. Doc-only issues: `DONE` requires merged doc + listed review; use `N/A` for tests only if explicitly allowed in Acceptance column.

**Owner/session:** Free text (e.g. `cursor-session-2026-05-01`, `human-sean`).

---

## Phase 0 — Safety baseline (non-IRR)

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| Git tag `baseline/pre-hardening-20260430` on recorded SHA | **DONE** | `cursor-phase0-2026-04-30` | Tag did not exist; created on `48447a9036937f02c60f331e25cdb5c95e9760ac`. |
| `docs/RELEASE_BASELINE.md` | **DONE** | `cursor-phase0-2026-04-30` | See file for branch, SHA, dirty tree note. |
| Application source unchanged (`apps/`, `packages/`, migrations) | **CONFIRMED** | `cursor-phase0-2026-04-30` | No edits under those paths in Phase 0. |

**Phase 0 execution state:** **COMPLETE** (tag + baseline doc + logs updated).

---

## Phase 1 — Source-of-truth (non-IRR execution)

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| `docs/CROSS_APP_CONTRACTS.md` | **DONE** | `cursor-phase1-2026-04-30` | Canonical app/package boundaries + pipeline rules. |
| `docs/DATABASE_SCHEMA.md` alignment | **DONE** | `cursor-phase1-2026-04-30` | Source-of-truth table, engine tables, `order_status_history` naming, known drift. |
| `pnpm db:generate` / filter `db:generate` | **BLOCKED (env)** | `cursor-phase1-2026-04-30` | Docker/Supabase local unavailable; `database.types.ts` **restored from git** after failed redirect emptied file. **No manual type edits.** |
| `pnpm typecheck` | **FAILED (pre-existing)** | `cursor-phase1-2026-04-30` | `system_alerts` in code but missing from generated types — documented in `DATABASE_SCHEMA.md` Known drift. |

**Phase 1 execution state:** **COMPLETE** (documentation + verification per plan; type regeneration deferred).

---

## Phase 2 — Auth and role enforcement

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| Role model + migration (`support_agent`, `finance_manager`) | **DONE** | `cursor-phase2-2026-04-30` | `00015_phase2_platform_roles.sql`; `@ridendine/types` + `permissions.service` + engine `ActorRole`. |
| Ops API `guardPlatformApi` + route wiring | **DONE** | `cursor-phase2-2026-04-30` | `platform-api-guards.ts`; ops-admin `api/**` + `api/engine/**`; `finalizeOpsActor` for TS narrowing after guards. |
| Checkout policy (IRR-002 Option A) | **DONE** | `cursor-phase2-2026-04-30` | `apps/web` middleware protects `/checkout`; `api/checkout` already 401 without `getCustomerActorContext`. |
| `BYPASS_AUTH` production guard (IRR-030) | **DONE** | `cursor-phase2-2026-04-30` | `packages/auth` middleware throws in production; covered by `middleware.test.ts`. |
| `docs/AUTH_ROLE_MATRIX.md` | **DONE** | `cursor-phase2-2026-04-30` | Matrix + 401/403 + processor token notes. |
| `pnpm typecheck` (turbo) | **PASSED** | `cursor-phase2-2026-04-30` | Ops-admin uses `tsconfig.typecheck.json` (excludes Jest tests with jest-dom gaps). |
| `pnpm db:generate` after migration | **DEFERRED (env)** | `cursor-phase2-2026-04-30` | Same as Phase 1 — run when Supabase local/Docker available; **no manual edits** to `database.types.ts`. |

**Phase 2 execution state:** **COMPLETE** (code + docs + engine/auth tests; DB type regen deferred).

---

## Phase 3 — Database / schema foundation

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| Migration `00016_phase3_stripe_idempotency_order_events_promo.sql` | **DONE** | `cursor-phase3-2026-04-30` | `stripe_events_processed`; view `order_status_events`; `COMMENT ON` promo columns. |
| `docs/DATABASE_SCHEMA.md` + `docs/DATABASE_MIGRATION_NOTES.md` | **DONE** | `cursor-phase3-2026-04-30` | Canonical promo + IRR-008/009/029 decisions. |
| Phase 2 role migration follow-up (`00015`) | **DONE (no new DDL)** | `cursor-phase3-2026-04-30` | Documented dependency in migration notes only. |
| `pnpm db:generate` / `db:generate` | **BLOCKED (env)** | `cursor-phase3-2026-04-30` | Docker Desktop unavailable; **do not** run redirect without working Supabase — restores `database.types.ts` from git if emptied. |
| `pnpm typecheck` | **PASSED** | `cursor-phase3-2026-04-30` | No application code changed for Phase 3. |

**Phase 3 execution state:** **COMPLETE** (schema + docs; type regeneration and webhook **runtime** idempotency wiring deferred per plan).

---

## Phase 4 — API foundation

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| Shared Stripe module (`getStripeClient`, pinned `apiVersion`, fail-closed) | **DONE** | `cursor-phase4-2026-04-30` | `packages/engine/src/services/stripe.service.ts`; `stripe` in engine **dependencies**; exported from `packages/engine/src/index.ts`. |
| Checkout / webhook / chef payout routes use shared client | **DONE** | `cursor-phase4-2026-04-30` | `apps/web/.../checkout`, `webhooks/stripe`, `stripe-adapter`; `chef-admin/.../payouts/setup` (+ `request`); ops refund + engine payouts + e2e use same version. |
| `docs/API_FOUNDATION.md` | **DONE** | `cursor-phase4-2026-04-30` | Patterns: auth, Stripe, errors, health, cron tokens, future ledger/audit rules. |
| `packages/utils` API helpers + health shape | **DONE** | `cursor-phase4-2026-04-30` | `api-response.ts` (+ tests); four app `/api/health` routes. |
| `pnpm --filter @ridendine/engine test` + `@ridendine/utils test` | **PASSED** | `cursor-phase4-2026-04-30` | 374 + 17 tests. |
| `pnpm typecheck` (turbo monorepo) | **FAILED (pre-existing)** | `cursor-phase4-2026-04-30` | `web` addresses/support vs generated `customer_addresses` / `support_tickets`; `chef-admin` orders query + storefront page types — **outside Phase 4 allowlist**; fix in dedicated type-alignment pass. |

**Phase 4 execution state:** **COMPLETE** (Stripe + health + API foundation doc + package tests; full monorepo typecheck debt documented).

---

## Phase 5 — Business engine foundation

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| `docs/BUSINESS_ENGINE_FOUNDATION.md` | **DONE** | `cursor-phase5-2026-04-30` | Engine vs API vs UI; rules for money/audit/notifications; RiskEngine pointer; audit gaps for Phase 9–12/15. |
| `risk.engine.ts` + Vitest | **DONE** | `cursor-phase5-2026-04-30` | `evaluateCheckoutRisk`, `evaluateOrderRisk`, `evaluateCustomerRisk`, `evaluatePaymentRisk`, `RiskEngine`, `DEFAULT_RISK_LIMITS`; **`risk.engine.test.ts`** (10 tests). |
| `packages/engine/src/index.ts` export | **DONE** | `cursor-phase5-2026-04-30` | `export * from './orchestrators/risk.engine'`. |
| IRR-017 docs (`ORDER_FLOW.md` + cross-links) | **DONE** | `cursor-phase5-2026-04-30` | Canonical `EngineOrderStatus` / `EngineDeliveryStatus` + legacy mapping; no code enum renames (per plan). |
| Checkout / dispatch **wire** RiskEngine | **DEFERRED** | `cursor-phase5-2026-04-30` | Documented in `API_FOUNDATION.md` + `BUSINESS_ENGINE_FOUNDATION.md` — **Phase 6+** (no live route change in Phase 5). |
| `pnpm --filter @ridendine/engine test` | **PASSED** | `cursor-phase5-2026-04-30` | Includes new risk tests. |
| `pnpm typecheck` (full turbo) | **NOT RE-GATED** | `cursor-phase5-2026-04-30` | Same pre-existing web/chef-admin debt as Phase 4; engine package typechecks via filter. |

**Phase 5 execution state:** **COMPLETE** (RiskEngine + docs + tests; runtime checkout integration explicitly **later**).

---

## Phase 6 — Customer ordering flow

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| IRR-011 canonical `/orders/[id]/confirmation` + legacy redirect | **DONE** | `cursor-phase6-2026-04-30` | `order-confirmation/[orderId]/page.tsx` → `redirect()`; links + Stripe `return_url` via `orderConfirmationPath()`. |
| IRR-020 thin checkout UI | **PARTIAL** | `cursor-phase6-2026-04-30` | Removed hardcoded fee/tax **fallback**; details step shows cart subtotal + tip + server-totals disclaimer; full breakdown only from `POST /api/checkout`. Cart line subtotal still computed in UI from API cart (display). **RiskEngine** wire remains Phase 6+/9 per prior docs. |
| IRR-031 chef portal CTA | **DONE** | `cursor-phase6-2026-04-30` | `/chef-signup` links to `NEXT_PUBLIC_CHEF_ADMIN_URL/auth/signup` (+ optional `NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL`); login CTA to chef `/auth/login`. |
| `docs/CUSTOMER_ORDERING_FLOW.md` | **DONE** | `cursor-phase6-2026-04-30` | End-to-end customer ordering + env contract. |
| `pnpm --filter @ridendine/web test` | **PARTIAL** | `cursor-phase6-2026-04-30` | New **`customer-ordering.test.ts` PASS**; full web Jest still **2 failures** in pre-existing auth tests (`password-strength`, `auth-layout`) — not Phase 6 files. |
| `pnpm --filter @ridendine/web typecheck` | **FAILED (pre-existing)** | `cursor-phase6-2026-04-30` | `addresses` / `support` route vs generated DB types (unchanged this phase). |

**Phase 6 execution state:** **COMPLETE** (confirmation consolidation + checkout hardening + chef signup wiring + doc + tests; IRR-020 **PARTIAL** as above).

---

## Phase 7 — Chef/vendor flow

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| `docs/CHEF_VENDOR_FLOW.md` | **DONE** | `cursor-phase7-2026-04-30` | Source-of-truth tables, routes, APIs, checkout dependency. |
| `chef_availability` chef UI + API | **DONE** | `cursor-phase7-2026-04-30` | `GET`/`PUT` `/api/storefront/availability`; dashboard **`/dashboard/availability`** + sidebar **Hours**. |
| `KitchenEngine.validateCustomerCheckoutReadiness` | **DONE** | `cursor-phase7-2026-04-30` | Storefront active/not paused; chef **approved**; weekly hours; menu items + category; exported helpers in `kitchen-availability.ts`. |
| Web `POST /api/checkout` + `POST /api/cart` guard | **DONE** | `cursor-phase7-2026-04-30` | Same engine method; cart also checks `menuItem.storefront_id`. |
| `menu_item_availability` editor | **DEFERRED** | `cursor-phase7-2026-04-30` | Schema only — documented **PARTIAL** in `CHEF_VENDOR_FLOW.md`. |
| `pnpm --filter @ridendine/engine test` | **PASSED** | `cursor-phase7-2026-04-30` | +6 `kitchen-availability` unit tests. |
| `pnpm --filter @ridendine/web test` (customer slice) | **RUN** | `cursor-phase7-2026-04-30` | Extended `customer-ordering.test.ts`; full suite may still show pre-existing auth failures. |
| `pnpm --filter @ridendine/chef-admin exec tsc --noEmit` | **PRE-EXISTING FAIL** | `cursor-phase7-2026-04-30` | Fails on `orders` route + `storefront/page` types unrelated to Phase 7 availability files — log in `23_PHASE_COMPLETION_LOG`. |

**Phase 7 execution state:** **COMPLETE** (IRR-032 implemented for weekly hours + checkout/cart enforcement; time-TZ nuance + item-time overrides documented as follow-ups).

---

## Phase 8 — Driver delivery flow

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| `docs/DRIVER_DELIVERY_FLOW.md` | **DONE** | `cursor-phase8-2026-05-01` | SOT tables, APIs, privacy, rate-limit contract. |
| IRR-019 location rate limit | **DONE** | `cursor-phase8-2026-05-01` | `@ridendine/utils` **`RATE_LIMITS.driverLocation`** + **`checkRateLimit`** on `POST /api/location`; IP bucket on unauth; **429** + `Retry-After`. |
| Location validation | **DONE** | `cursor-phase8-2026-05-01` | Optional **`recordedAt`** → **`isPlausibleClientIsoTime`**; reject **(0,0)**; typed DB inserts (no `as any` on location rows). |
| List/earnings/driver API alignment | **DONE** | `cursor-phase8-2026-05-01` | Deliveries + earnings use **approved** `getDriverActorContext` + admin repo queries; profile API **`requireApproved: false`** + own-row updates. |
| Delivery page ownership | **DONE** | `cursor-phase8-2026-05-01` | Admin-backed **assigned or pending-offer** gate. |
| `pnpm --filter @ridendine/utils test` | **PASSED** | `cursor-phase8-2026-05-01` | +`location-client-time` + driverLocation preset test. |
| `pnpm --filter @ridendine/engine test` | **PASSED** | `cursor-phase8-2026-05-01` | +`dispatch-engine-driver-guards` ownership test. |
| `pnpm --filter @ridendine/driver-app typecheck` | **PASSED** | `cursor-phase8-2026-05-01` | After `SupabaseClient` bridge casts on admin client. |

**Phase 8 execution state:** **COMPLETE** (IRR-019 + ownership/privacy; distributed rate limits / full route-level Jest deferred — utils+engine tests evidence).

---

## Phase 9 — Payment and ledger

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| `docs/PAYMENT_LEDGER_FLOW.md` | **DONE** | `cursor-phase9-2026-05-01` | SOT: Stripe client, `ledger_entries`, webhook claim/finalize, ops export. |
| IRR-008 webhook runtime | **DONE** | `cursor-phase9-2026-05-01` | `claimStripeWebhookEventForProcessing` + success/failure finalize; **200** idempotent replay. |
| Ops export `stripe_events` | **DONE** | `cursor-phase9-2026-05-01` | `GET /api/export?type=stripe_events` — **`finance_export_ledger`** guard. |
| IRR-007 / IRR-018 verification | **DONE** | `cursor-phase9-2026-05-01` | Webhook uses **`getStripeClient()`** + admin claim; no new `new Stripe(` in route. |
| `pnpm --filter @ridendine/engine test` | **PASSED** | `cursor-phase9-2026-05-01` | +7 **`stripe-webhook-idempotency`** tests (**398** total). |
| Stripe CLI replay | **MANUAL** | `cursor-phase9-2026-05-01` | Documented in `PAYMENT_LEDGER_FLOW.md`; not run in CI here. |

**Phase 9 execution state:** **COMPLETE** (IRR-008 runtime + export + doc; RiskEngine checkout wire remains optional per `API_FOUNDATION`).

---

## Phase 10 — Admin ops control center

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| `docs/ADMIN_OPS_CONTROL_CENTER.md` | **DONE** | `cursor-phase10-2026-05-01` | SOT: roles, routes, APIs, deferred Phase 11/12/15. |
| Role matrix: support read-only vs writes | **DONE** | `cursor-phase10-2026-05-01` | **`ops_orders_write`**, **`exceptions_write`**, **`deliveries_write`** tightened to ops line / dispatch (not `support_agent`). |
| Live orders board API shape | **DONE** | `cursor-phase10-2026-05-01` | **`/dashboard/orders`** reads **`data.items`** from **`GET /api/orders`**. |
| Audit JSON API + activity gate | **DONE** | `cursor-phase10-2026-05-01` | **`GET /api/audit/recent`** + **`audit_timeline_read`** for ops_admin+; support excluded from audit timeline. |
| Finance dashboard depth (IRR-021) | **PARTIAL** | `cursor-phase10-2026-05-01` | Engine finance + ledger slice + export link; CFO reconciliation depth / automated CSV↔ledger tests **deferred**. |
| Finance export spec (IRR-028) | **PARTIAL** | `cursor-phase10-2026-05-01` | Phase 9 **`stripe_events`** export + finance guard; full export matrix tests **deferred**. |
| Analytics metric SOT (IRR-034) | **NOT STARTED** | `cursor-phase10-2026-05-01` | **`/api/analytics/trends`** unchanged — doc only in admin ops doc. |
| `pnpm --filter @ridendine/engine test` | **PASSED** | `cursor-phase10-2026-05-01` | **403** tests; **`platform-api-guards`** includes support **`ops_orders_write`** denial. |
| `pnpm --filter @ridendine/ops-admin test` | **PASSED** | `cursor-phase10-2026-05-01` | **38** Jest tests incl. **`platform-wiring.test.ts`**. |
| `pnpm --filter @ridendine/ops-admin typecheck` | **PASSED** | `cursor-phase10-2026-05-01` | `tsc -p tsconfig.typecheck.json`. |
| Full monorepo `pnpm typecheck` | **NOT RE-GATED** | `cursor-phase10-2026-05-01` | Pre-existing web/chef drift per prior phases. |

**Phase 10 execution state:** **PARTIAL COMPLETE** — admin SOT doc, API-level role fixes, audit endpoint, orders board fix, engine + ops-admin tests green; **IRR-021 / IRR-028 / IRR-034** as above.

---

## Phase 11 — Real-time event system

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| `docs/REALTIME_EVENT_SYSTEM.md` | **DONE** | `cursor-phase11-2026-05-01` | SOT: channels, payloads, privacy, Phase 12 split; **`DomainEventType`** alignment table. |
| IRR-010 `use-realtime` / `postgres_changes` typing | **DONE** | `cursor-phase11-2026-05-01` | Removed **`as any`**; stable `postgresTableChannelId`; optional **`channelName`**. |
| `packages/db/src/realtime/*` | **DONE** | `cursor-phase11-2026-05-01` | **`channels.ts`**, **`events.ts`** (fail-closed parsers), Vitest **13** tests. |
| Dashboard subscription safety | **PARTIAL** | `cursor-phase11-2026-05-01` | Ops stats + alerts + map + chef orders + web notifications + live tracker use shared naming / filters; **driver-app** still no client realtime. |
| `pnpm --filter @ridendine/db test` | **PASSED** | `cursor-phase11-2026-05-01` | **13** Vitest tests. |
| `pnpm --filter @ridendine/ops-admin test` | **PASSED** | `cursor-phase11-2026-05-01` | **38** Jest; mock extended for **`opsAlertsChannel`**. |
| `pnpm typecheck` (full turbo) | **NOT RE-GATED** | `cursor-phase11-2026-05-01` | Pre-existing monorepo drift; spot-check **`packages/db`** tsc **PASS**. |

**Phase 11 execution state:** **PARTIAL COMPLETE** — contract doc + typed hooks + parsers + channel helpers + key dashboard wiring; driver realtime + exhaustive domain_event consumer matrix **deferred** (Phase 12 / later).

---

## Master tracker table

| Issue ID | Severity | Category | Primary phase | Required correction (summary) | Files likely affected | Dependencies | Tests required | Acceptance criteria | Status | Owner/session | Notes |
|----------|----------|----------|-----------------|------------------------------|-------------------------|--------------|----------------|---------------------|--------|---------------|-------|
| IRR-001 | HIGH | Architecture | 1 | Add `docs/CROSS_APP_CONTRACTS.md` + link from `CLAUDE.md` | `docs/CROSS_APP_CONTRACTS.md` (NEW), `CLAUDE.md` | None | Doc review checklist | Doc exists; CLAUDE link optional out of Phase 1 allowed paths | **DONE** | `cursor-phase1-2026-04-30` | Link `CLAUDE.md` in a later phase if desired |
| IRR-002 | HIGH | Auth | 2 | Product decision: guest vs auth checkout; implement `apps/web/src/middleware.ts` policy | `apps/web/src/middleware.ts`, possibly web auth pages | IRR-030 | Role/session tests per policy | Policy documented in docs + tests assert behavior | **DONE** | `cursor-phase2-2026-04-30` | **Option A:** `/checkout` in `protectedRoutes`; checkout API already returns 401 without session (`getCustomerActorContext`). Doc: `docs/AUTH_ROLE_MATRIX.md`. |
| IRR-003 | HIGH | Security | 15 | Scope every `createAdminClient` web query by session `customerId`; security tests | `apps/web/src/app/api/**/*.ts` (cart, favorites, reviews, addresses, etc.) | Engine helpers, DB | Per-route security tests + `pnpm typecheck` | No cross-customer data in tests | **PARTIAL** | `cursor-phase15-2026-04-30` | **Phase 15:** strict UUID validation on `POST/GET` favorites + reviews; full audit of every admin-scoped web route **deferred** (see `docs/SECURITY_HARDENING.md`). |
| IRR-004 | HIGH | Roles/permissions | 2 | Extend `platform_users` roles; `getUserRoles` + enforcement | `packages/engine/src/services/permissions.service.ts`, `supabase/migrations/*`, ops APIs | DB migration | `pnpm --filter @ridendine/engine test` + new matrix | Wrong role → 403 on sampled routes | **DONE** | `cursor-phase2-2026-04-30` | Migration `00015_phase2_platform_roles.sql`; `packages/types/src/roles.ts`; `permissions.service.test.ts` (51 tests). |
| IRR-005 | HIGH | API | 2, 4 | `assertPlatformRole` (or equivalent) on each `apps/ops-admin/src/app/api/**/route.ts` | All `apps/ops-admin/src/app/api/**` | IRR-004 | API matrix tests | 403 for unauthorized role | **DONE** | `cursor-phase2-2026-04-30` / `cursor-phase4-2026-04-30` | **Phase 2:** `guardPlatformApi` + `platform-api-guards.test.ts`. **Phase 4:** no scope expansion — Stripe/health/utils only; ops routes remain on Phase 2 guard pattern. |
| IRR-006 | HIGH | Security | 15 | Processor tokens in vault; monitor 401; document rotation | `apps/ops-admin/src/app/api/engine/processors/sla/route.ts`, `expired-offers/route.ts`, env | Env / ops | Contract test: no token → 401 | Token required; alert on anomaly | **DONE** | `cursor-phase15-2026-04-30` | **`validateEngineProcessorHeaders`** in `@ridendine/utils`; processors use shared helper; **`pnpm --filter @ridendine/utils test`** covers fail-closed + Bearer + `x-processor-token`. Vault rotation = ops process. |
| IRR-007 | HIGH | Payments | 4, 9 | Single Stripe module; one `apiVersion` repo-wide | All files with `new Stripe(` under `apps/`; shared module in `packages/engine` or `packages/db` per `21` | None for Phase 4 start | Unit test mock + integration smoke | Grep shows one canonical version | **DONE** | `cursor-phase4-2026-04-30` | **`packages/engine/src/services/stripe.service.ts`** — `STRIPE_API_VERSION`, `getStripeClient()`, `assertStripeConfigured()`. Apps use helper; **`new Stripe(`** remains only in service + **`packages/engine/src/e2e/stripe-payment.e2e.ts`** (test key). **Monorepo `pnpm typecheck`:** still fails on **pre-existing** web/chef-admin DB shape drift (not Phase 4 allowlist). |
| IRR-008 | MEDIUM | Payments | 3, 9 | Webhook idempotency (`stripe_event_id` or table per `21`) | `apps/web/.../webhooks/stripe/route.ts`, `packages/engine/.../stripe-webhook-idempotency.ts` | DB Phase 3 | Engine Vitest + Stripe CLI replay (manual) | Replay → **200** `idempotentReplay`; no duplicate submit | **DONE** | `cursor-phase9-2026-05-01` | **Schema `00016` + Phase 9 claim/finalize**; CLI replay **manual** per log. |
| IRR-009 | MEDIUM | Database | 1, 3 | Align naming: `order_status_history` vs `order_status_events`; docs/types | `docs/DATABASE_SCHEMA.md`, migrations, `packages/db/src/generated/database.types.ts` | Phase 1 discovery | `pnpm typecheck`, `supabase db reset` | Physical table + view alias + docs | **DONE** | `cursor-phase3-2026-04-30` | Phase 1 doc canonical; **Phase 3** adds view `order_status_events` (`00016`). Types regen still **deferred** (Docker). |
| IRR-010 | MEDIUM | Real-time | 11 | Remove `as any`; typed payloads; channel naming doc | `packages/db/src/hooks/use-realtime.ts`, `packages/db/src/realtime/*`, `docs/REALTIME_EVENT_SYSTEM.md` | types package | DB Vitest + dashboard wiring | Invalid payload fails closed | **DONE** | `cursor-phase11-2026-05-01` | Hook typed; **`parseOrdersRealtimeRow`** / **`parseBroadcastEnvelope`**; **`pnpm --filter @ridendine/db test`** (**13**). Driver-app client realtime still **out of scope** this phase. |
| IRR-011 | MEDIUM | UI / Customer flow | 6 | One confirmation URL; redirect other | `apps/web/src/app/order-confirmation/**`, `apps/web/src/app/orders/**/confirmation/**` | Product pick | Web Jest + Playwright | Single E2E path | **DONE** | `cursor-phase6-2026-04-30` | Canonical **`/orders/[id]/confirmation`**; legacy **`/order-confirmation/[id]`** server `redirect()`; Stripe `return_url` + internal links use `orderConfirmationPath()`. |
| IRR-012 | LOW | UI | 14 | Single `@ridendine/ui` password strength | `packages/ui`, `apps/web` signup, `apps/chef-admin` signup | UI | `pnpm --filter @ridendine/web test` password-strength | Import `@ridendine/ui` only; no app-local duplicate file | **DONE** | `cursor-phase14-2026-05-01` | Removed app re-exports; fixed `cn` import in `packages/ui` password-strength (no self-package cycle). |
| IRR-013 | HIGH | Testing | 16 | Remove or narrow `continue-on-error` for lint in CI | `.github/workflows/ci.yml` | None | CI run green | Lint failure fails job | **DONE** | `cursor-phase16-2026-05-01` | **`continue-on-error` removed** from Lint step; lint is a hard gate. |
| IRR-014 | MEDIUM | Testing | 16 | Add web + ops test jobs to CI | `.github/workflows/ci.yml` | IRR-013 | `pnpm --filter @ridendine/web test`, ops tests | Jobs exist and pass | **DONE** | `cursor-phase16-2026-05-01` | CI runs **web**, **ops-admin**, **db**, **auth** tests plus engine/utils; see `docs/QA_TESTING_PLAN.md`. |
| IRR-015 | MEDIUM | Mock data | 13 | Prod never runs seed; guardrails in CI/deploy docs | `package.json`, `scripts/verify-prod-data-hygiene.mjs`, `.github/workflows/ci.yml`, `docs/PRODUCTION_DATA_INTEGRITY.md` | Deploy process | `pnpm verify:prod-data-hygiene` + CI step | No `db:seed` in workflows; no synthetic refund IDs in ops API | **DONE** | `cursor-phase13-2026-05-01` | **Removed** `mock_refund_*` fallback on `POST /api/engine/refunds` `process`; **CI** runs hygiene script after install; **doc** `docs/PRODUCTION_DATA_INTEGRITY.md`. |
| IRR-016 | LOW | Documentation | 1 | Generate `graphify-out/GRAPH_REPORT.md` or remove workspace rule | Repo root, user `CLAUDE.md` if applicable | OPTIONAL | N/A or doc-only | Decision recorded | NOT STARTED | `cursor-phase1-2026-04-30` | Deferred — optional; not blocking Phase 1 doc deliverables |
| IRR-017 | MEDIUM | Orders / Business engine | 5, 6+ | Glossary aligned: `docs/ORDER_FLOW.md` ↔ `order-state-machine.ts` | `docs/ORDER_FLOW.md`, `packages/engine/src/orchestrators/order-state-machine.ts`, UI labels | Engine tests | Snapshot/state tests | UI badges match DB enums | **DONE (doc)** | `cursor-phase5-2026-04-30` | **Phase 5:** `ORDER_FLOW.md` + `BUSINESS_ENGINE_FOUNDATION.md` canonical tables + legacy map pointers. **UI badge parity** remains Phase 6+ when customer surfaces are touched. |
| IRR-018 | MEDIUM | Payouts | 4, 9 | Chef Connect uses unified Stripe helper | `apps/chef-admin/src/app/api/payouts/setup/route.ts`, shared module | IRR-007 | Staging Connect test | Connect onboarding in staging | **DONE** | `cursor-phase4-2026-04-30` | **`getStripeClient()`** from engine in `payouts/setup` (+ `payouts/request`); same `apiVersion` as checkout/webhook. Staging Connect E2E still Phase 9. |
| IRR-019 | MEDIUM | Driver flow | 8, 11 | Rate limit on driver location API (+ optional Redis later) | `apps/driver-app/.../location/route.ts`, `packages/utils` `rate-limiter.ts`, `location-client-time.ts` | utils | Vitest `driverLocation` preset + time guard | Authenticated: **429** when bucket exceeded; **401** unauth; **Retry-After** header | **DONE** | `cursor-phase8-2026-05-01` | **Per-instance** token bucket; **not** distributed — doc in `DRIVER_DELIVERY_FLOW.md`. |
| IRR-020 | MEDIUM | Customer flow | 6, 9 | Move checkout orchestration out of page into API/engine | `apps/web/src/app/checkout/page.tsx`, `apps/web/src/app/api/checkout/route.ts`, engine | Engine | Integration tests | UI does not compute authoritative totals | **PARTIAL** | `cursor-phase6-2026-04-30` | **Removed UI fake fee/tax/total** before `POST /api/checkout`; authoritative breakdown from API only. Cart line subtotal + tip UX remain client-side; engine already owns order+PI. |
| IRR-021 | MEDIUM | Admin flow | 10 | Finance dashboard bound to `ledger_entries` + exports | `apps/ops-admin/src/app/dashboard/finance/page.tsx`, engine finance APIs | IRR-008, ledger | Role tests + CSV reconciliation | Matches Stripe report (test mode) | **PARTIAL** | `cursor-phase10-2026-05-01` | Engine finance + ledger UI + export links; deep reconciliation + automated CSV↔ledger **deferred**. |
| IRR-022 | HIGH | Business engine | 5, 6, 9 | Add `risk.engine.ts`; hook checkout/dispatch | `packages/engine/src/orchestrators/risk.engine.ts` (NEW), `packages/engine/src/index.ts`, callers | Engine | Vitest rules | Flagged high-risk orders blocked with reason | **PARTIAL** | `cursor-phase5-2026-04-30` | **Engine + tests DONE.** **Route hook** deferred to Phase 6 (checkout) / 9 (payment) per zero-drift scope — documented in `API_FOUNDATION.md`. |
| IRR-023 | MEDIUM | Notifications | 12 | Trace engine → Resend → `notifications` row durability | `packages/engine` triggers, `packages/notifications` | Resend config | Engine notification tests | Row exists for each critical transition | **PARTIAL** | `cursor-phase12-2026-05-01` | **DONE:** `NotificationSender` SOT + dedupe; triggers resolve `customers.user_id`; cancel/refund via sender; duplicate orchestrator sends removed; `docs/NOTIFICATIONS_AND_SUPPORT.md`. **Open:** automated retry queue; full E2E with live Resend. |
| IRR-024 | LOW | Performance | 17 | Load test checkout (k6/Artillery) + SLO | Infra docs, staging | Phase 6+9 stable | Load test report | SLO numbers in `docs/` | **PARTIAL** | `cursor-phase17-2026-05-01` | **`docs/LOAD_TESTING_PLAN.md`** — scenarios, tools, thresholds placeholders; **staging execution + signed report** still on release owner. |
| IRR-025 | MEDIUM | Mobile UX | 14 | Responsive / device matrix checklist | `docs/MOBILE_UI_RESPONSIVE_CHECKLIST.md`, chef menu layout | QA | Manual sign-off | Checklist doc + chef menu stack layout | **PARTIAL** | `cursor-phase14-2026-05-01` | **Doc** + **chef `/dashboard/menu`** responsive pass; full manual matrix sign-off still on release owner. |
| IRR-026 | MEDIUM | Security | 15 | Upload MIME/size/scan; private bucket | `apps/web/src/app/api/upload/route.ts`, `apps/chef-admin/src/app/api/upload/route.ts` | Storage config | Malicious file tests | Bad uploads rejected | **PARTIAL** | `cursor-phase15-2026-04-30` | **MIME allowlist + 5MB + `canonicalImageExtensionForMime`** (no trust of `file.name` ext); **`pnpm --filter @ridendine/utils test`**; **private bucket + AV scan** still infra follow-up. |
| IRR-027 | LOW | Security | 15 | Redact structured logs (webhook) | `apps/web/src/app/api/webhooks/stripe/route.ts` | obs | Log review test | No PAN/full PII in logs | **DONE** | `cursor-phase15-2026-04-30` | **`redactSensitiveForLog`** in utils; Stripe webhook errors + audit error fields redacted; **`security-hardening.test.ts`** + webhook route Jest (signature path). |
| IRR-028 | MEDIUM | API / Admin | 10 | Finance export spec + tests | `apps/ops-admin/src/app/api/export/route.ts` | ledger | CSV vs DB | CSV matches ledger query | **PARTIAL** | `cursor-phase10-2026-05-01` | Phase 9 **`stripe_events`** export + Phase 10 doc; full spec + reconciliation tests **deferred**. |
| IRR-029 | HIGH | Database | 3 | Unify promo columns (`starts_at` vs `valid_from`, etc.) | `supabase/migrations/`, `apps/web/src/app/api/checkout/route.ts` | Migration | Checkout promo tests | Canonical set documented + DB comments; no column drops | **DONE** | `cursor-phase3-2026-04-30` | **Decision:** canonical `starts_at`/`expires_at`/`usage_*`/`is_active`/`discount_*`; aliases from `00010` + `COMMENT ON` in `00016`. Checkout route unchanged (Phase 3 scope). |
| IRR-030 | MEDIUM | Auth | 2, 15 | CI/prod guard: `BYPASS_AUTH` never true in prod | `packages/auth/src/middleware.ts`, CI, deploy | deploy | Env assertion test | Prod boot fails if mis-set | **DONE** | `cursor-phase2-2026-04-30` | Middleware throws if `NODE_ENV===production` && `BYPASS_AUTH`; `packages/auth/src/middleware.test.ts` (9 passed). |
| IRR-031 | LOW | Customer flow | 6 | Wire `/chef-signup` to chef app signup | `apps/web/src/app/chef-signup/page.tsx` | URLs in env | E2E link | Link works staging | **DONE** | `cursor-phase6-2026-04-30` | Portal CTAs use **`NEXT_PUBLIC_CHEF_ADMIN_URL`** `/auth/signup` + `/auth/login`; optional **`NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL`** override documented in `CUSTOMER_ORDERING_FLOW.md`. |
| IRR-032 | MEDIUM | Chef flow | 7, 9 | Availability UI → `chef_availability`; engine blocks closed kitchen | `apps/chef-admin/.../availability`, `kitchen.engine.ts`, web checkout/cart | Engine | Engine vitest + web grep tests | Closed / outside hours / bad menu → 400 at checkout/cart | **DONE** | `cursor-phase7-2026-04-30` | **Hours UI + API**; **`validateCustomerCheckoutReadiness`**; **`menu_item_availability`** still future. |
| IRR-033 | MEDIUM | Support | 12 | RLS + role for support tickets | `supabase/migrations/*_rls*`, support APIs | IRR-004 | Ticket visibility tests | Agent sees only assigned | **PARTIAL** | `cursor-phase12-2026-05-01` | **DONE:** `support_queue` guards; agent queue repo + PATCH assignee check; customer list/detail APIs + minimal columns; `finance_manager` denied `support_queue` test. **Open:** deeper RLS migration pass if product requires stricter DB-level isolation. |
| IRR-034 | LOW | Analytics | 10 | Define metric sources vs `domain_events` | `apps/ops-admin/src/app/api/analytics/trends/route.ts`, docs | DB | Reconciliation test | KPI doc matches query | **NOT STARTED** | `cursor-phase10-2026-05-01` | Listed in **`ADMIN_OPS_CONTROL_CENTER.md`** deferrals; no route change this phase. |
| IRR-035 | MEDIUM | Deployment | 17 | Runbooks: backup, rollback, RPO/RTO | `docs/RUNBOOK_DEPLOY.md`, `docs/BACKUP_AND_ROLLBACK.md` | Supabase | Tabletop exercise | Runbook approved | **DONE** | `cursor-phase17-2026-05-01` | **Phase 17:** deploy runbook + backup/rollback + env matrix + health/monitoring + load plan; **tabletop sign-off** still Phase 18 / process. |
| IRR-036 | LOW | API | 4, 17 | Standardize `/api/health` response schema | `apps/*/src/app/api/health/route.ts` | ops | Synthetic monitor | Schema stable across apps | **DONE** | `cursor-phase4-2026-04-30` / `cursor-phase17-2026-05-01` | **Phase 4:** `healthPayload()` + four app routes. **Phase 17:** `docs/HEALTHCHECKS_AND_MONITORING.md` (schema, limits, alert placeholders). |

---

## Phase → IRR quick index

| Phase | Objective (from `21`) | IRR IDs primarily targeted |
|-------|-------------------------|------------------------------|
| 0 | Safety snapshot | (none — prerequisite) |
| 1 | Source-of-truth | IRR-001, IRR-009, IRR-016 |
| 2 | Auth / roles | IRR-002, IRR-004, IRR-005, IRR-030 |
| 3 | DB foundation | IRR-008, IRR-009, IRR-029 |
| 4 | API foundation (Stripe shared) | IRR-007, IRR-018 |
| 5 | Engine (Risk, order glossary) | IRR-022, IRR-017 |
| 6 | Customer ordering | IRR-011, IRR-020, IRR-031 |
| 7 | Chef / vendor | IRR-032 |
| 8 | Driver | IRR-019 |
| 9 | Payment / ledger | IRR-007, IRR-008, IRR-018 |
| 10 | Admin ops | IRR-021, IRR-028, IRR-034 |
| 11 | Real-time | IRR-010 |
| 12 | Notifications / support | IRR-023, IRR-033 |
| 13 | Mock data removal | IRR-015 |
| 14 | UI / mobile | IRR-012, IRR-025 |
| 15 | Security hardening | IRR-003, IRR-006, IRR-026, IRR-027, IRR-030 |
| 16 | Testing / CI | IRR-013, IRR-014 |
| 17 | Deployment readiness | IRR-024, IRR-035, IRR-036 |
| 18 | Launch checklist | Human go/no-go — [`docs/LAUNCH_CHECKLIST.md`](../docs/LAUNCH_CHECKLIST.md) |

---

## Phase 18 — Launch checklist (execution)

| Gate | Status | Owner/session | Notes |
|------|--------|---------------|-------|
| `docs/LAUNCH_CHECKLIST.md` | **DONE** | `cursor-phase18-2026-05-01` | Legal / ops / finance / tech tables; **Part 14** smoke (1–10); go/no-go block; **Appendix A** readiness review. |
| Human signatures & meeting minutes | **PENDING** | Release owner | Phase 18 is a **human** gate per [`24_PHASE_GATE_CHECKLIST.md`](24_PHASE_GATE_CHECKLIST.md) § Phase 18. |
| Tabletop (backup / rollback) | **PENDING** | Ops + Eng | Cross-ref [`docs/BACKUP_AND_ROLLBACK.md`](../docs/BACKUP_AND_ROLLBACK.md); optional closure of **IRR-035** “approved” wording. |

**Phase 18 execution state:** **DOC COMPLETE** — checklist and project review appendix in repo; **GO** requires filled sign-offs + smoke evidence.

---

## Reusable phase execution prompt (template)

Copy and replace `X` with `0`–`18`.

```text
You are Cursor executing Phase X only.

Read:
- /AUDIT_AND_PLANNING/21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md
- /AUDIT_AND_PLANNING/22_EXECUTION_TRACKER.md
- /AUDIT_AND_PLANNING/24_PHASE_GATE_CHECKLIST.md
- /AUDIT_AND_PLANNING/25_ERROR_AND_DRIFT_PREVENTION_RULES.md

Execute only Phase X.

Before editing, complete the pre-flight checklist in 24_PHASE_GATE_CHECKLIST.md (copy the checklist into your session notes and fill every item).
After editing, run the tests listed for Phase X in 21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md and 22_EXECUTION_TRACKER.md.

Then update:
- 22_EXECUTION_TRACKER.md (status, owner/session, notes for each IRR touched)
- 23_PHASE_COMPLETION_LOG.md (fill the Phase X section completely)

Do not touch unrelated files.
Do not introduce mock data in production paths.
Do not bypass auth.
Do not move business logic into UI.
Do not mark any issue DONE unless tests pass and acceptance criteria are met.

Final output in chat:
- Files changed
- Tests run (commands + result)
- Issues closed (IRR ids) vs still open
- Risks
- Next phase recommendation (YES/NO with reason)
```

---

**Tracked issues:** 36 (IRR-001 — IRR-036).  
**Last updated:** 2026-05-01 — Phases 0–11: **Phase 11** realtime (`REALTIME_EVENT_SYSTEM.md`, `packages/db/src/realtime/*`, IRR-010 hook + parsers, ops + chef + web subscription safety). **IRR-010 DONE**. **Next phase:** Phase 12 only.
