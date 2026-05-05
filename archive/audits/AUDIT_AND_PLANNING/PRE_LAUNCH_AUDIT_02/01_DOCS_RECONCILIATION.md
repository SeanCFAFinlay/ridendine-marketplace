# Phase 1 — Documentation vs code reconciliation

Method: Read each release-critical doc, grep/code-spot-check owning paths. Status per **theme** (not every sentence).

## Summary matrix

| Document | Primary claims | Verification | Notes |
|----------|----------------|--------------|--------|
| [docs/CROSS_APP_CONTRACTS.md](../../docs/CROSS_APP_CONTRACTS.md) | Four apps; packages/engine/db/auth; pipeline UI→API→engine→DB; money→ledger | **VERIFIED** | Apps and imports match; `packages/engine` exports Stripe + orchestrators; web uses `@ridendine/engine` in checkout/webhook |
| [docs/AUTH_ROLE_MATRIX.md](../../docs/AUTH_ROLE_MATRIX.md) | Checkout policy; ops roles; `BYPASS_AUTH` prod guard | **VERIFIED** | `packages/auth/src/middleware.test.ts` (9 tests); ops routes use `guardPlatformApi` pattern in `packages/engine/src/services/platform-api-guards.ts` |
| [docs/API_FOUNDATION.md](../../docs/API_FOUNDATION.md) | Stripe singleton, health envelope, error helpers, route ordering | **VERIFIED** | `getStripeClient()` in `packages/engine/src/services/stripe.service.ts`; `healthPayload` + `apps/*/api/health/route.ts`; `apiSuccess`/`api-response` in utils |
| [docs/BUSINESS_ENGINE_FOUNDATION.md](../../docs/BUSINESS_ENGINE_FOUNDATION.md) | Engine owns mutations; RiskEngine pointer | **PARTIAL** | RiskEngine implemented (`risk.engine.ts`) but **not** invoked from `apps/web` checkout route — see **CONFLICTS / OUTDATED** vs “hook checkout” wording in IRR-022 narrative |
| [docs/SECURITY_HARDENING.md](../../docs/SECURITY_HARDENING.md) | IRR-003 web admin client scoping; uploads; logging | **PARTIAL** | Upload MIME/size enforced (`packages/utils/src/image-upload.ts`, web/chef upload routes); **full** per-route `createAdminClient` audit not complete (IRR-003 PARTIAL in tracker) |
| [docs/QA_TESTING_PLAN.md](../../docs/QA_TESTING_PLAN.md) | CI jobs, package tests | **VERIFIED** vs CI | `.github/workflows/ci.yml` matches documented filters; **PARTIAL** for “full E2E” — no Playwright in `apps/web` |
| [docs/ENVIRONMENT_VARIABLES.md](../../docs/ENVIRONMENT_VARIABLES.md) | Required env per app | **PARTIAL** | File exists; spot-check against `turbo.json` `build` env and Next apps — recommend diff pass before prod |
| [docs/HEALTHCHECKS_AND_MONITORING.md](../../docs/HEALTHCHECKS_AND_MONITORING.md) | Four `/api/health` routes, schema | **VERIFIED** | e.g. `apps/web/src/app/api/health/route.ts` uses `healthPayload('web')` |
| [docs/LOAD_TESTING_PLAN.md](../../docs/LOAD_TESTING_PLAN.md) | Staging k6/Artillery; IRR-024 | **VERIFIED** doc; **NOT FOUND** execution | Doc states plan-only; no k6/Artillery scripts in repo |
| [docs/RUNBOOK_DEPLOY.md](../../docs/RUNBOOK_DEPLOY.md) | Deploy steps | **PARTIAL** | Process doc — not executable-verified in this audit |
| [docs/BACKUP_AND_ROLLBACK.md](../../docs/BACKUP_AND_ROLLBACK.md) | RPO/RTO, Supabase | **PARTIAL** | Doc present; human tabletop still PENDING per tracker Phase 18 |
| [docs/RELEASE_BASELINE.md](../../docs/RELEASE_BASELINE.md) | Baseline SHA/tag | **OUTDATED vs working tree** | Tracker references tag on same SHA; current tree has extensive uncommitted changes — baseline must be refreshed at merge |

## Notable conflicts / partials

1. **IRR-022 / RiskEngine:** Docs and `CROSS_APP_CONTRACTS` reference route integration; **code** shows `evaluateCheckoutRisk` / `evaluateOrderRisk` only in `packages/engine` and tests — **no imports in `apps/web/src/app/api/checkout/route.ts`** (grep verified). Mark: **PARTIAL** implementation vs doc expectation for “blocked high-risk checkout.”

2. **Distributed rate limits:** `docs/SECURITY_HARDENING.md` / `DRIVER_DELIVERY_FLOW` align with `packages/utils/src/rate-limiter.ts` comment: **per-instance** — not a doc bug; production scaling risk is **documented**.

3. **Playwright:** `QA_TESTING_PLAN` may describe broader QA; **no** `playwright.config` under `apps/web` — browser E2E gap.

## Verdict

Documentation set is **substantially implemented** for auth, Stripe module, health, CI hygiene, and webhook idempotency. **Gaps** are concentrated in: RiskEngine wiring, full service-role route audit, load-test **execution**, Playwright coverage, and keeping **RELEASE_BASELINE** aligned with a clean merge commit.
