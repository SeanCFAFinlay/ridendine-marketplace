# Phase A — Launch Blockers Plan

Goal: remove blockers for safe staging and pilot gate evaluation without broad architectural churn.

## A1. Freeze baseline and protect dirty tree

- Findings: F-001, F-022
- Files: `docs/RELEASE_BASELINE.md`, `AUDIT_AND_PLANNING/22_EXECUTION_TRACKER.md`, release checklist docs
- Implementation:
  1. Snapshot current branch/sha/dirty stats in new execution log entry.
  2. Require execution on dedicated repair branch; no direct work on mixed dirty tree.
  3. Add pre-merge checklist item: “clean `git status` and signed diff summary.”
- Tests/commands: `git status --short`, `git rev-parse HEAD`, `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
- Acceptance: branch and artifact provenance reproducible.
- Rollback: no code rollback needed; process-only.

## A2. Wire RiskEngine into checkout before payment side effects

- Findings: F-003, F-031
- Files: `apps/web/src/app/api/checkout/route.ts`, `packages/engine/src/orchestrators/risk.engine.ts`, checkout tests
- Implementation:
  1. Compute risk score immediately after actor/cart validation.
  2. Block high-risk checkout before Stripe intent/session creation.
  3. Return deterministic error shape (`RISK_BLOCKED`, reason list).
  4. Ensure no order/payment rows are created on blocked flow.
- Tests:
  - unit: `risk.engine.test.ts` add checkout edge cases used by route.
  - integration: route test with mocked high-risk payload.
  - regression: successful low-risk checkout still works.
- Acceptance: blocked checkouts never create payment intent/order records.
- Rollback: feature-flag route hook (fail-open toggle only for emergency staging).

## A3. Complete IRR-003 web service-role audit

- Findings: F-005
- Files: `apps/web/src/app/api/**/*.ts` (cart, favorites, reviews, addresses, orders, support, notifications, profile)
- Implementation:
  1. Build route matrix with ownership rule per endpoint.
  2. Enforce actor-derived ids in every query path.
  3. Remove any request-body/customer-id trust.
  4. Add shared helper if repetition is high.
- Tests:
  - negative cross-customer reads/writes for each route class.
  - ownership mutation tests.
- Acceptance: no route permits customer A to read/write customer B data.
- Rollback: per-route commits; revert only offending route patch.

## A4. Stripe live safety and irreversible movement controls

- Findings: F-028, F-012
- Files: `apps/web/src/app/api/checkout/route.ts`, `apps/web/src/app/api/webhooks/stripe/route.ts`, env validation utilities/docs
- Implementation:
  1. Add startup/runtime guardrails for env consistency per environment.
  2. Enforce test-mode keys in dev/staging execution contexts.
  3. Confirm webhook remains signature-first, idempotent claim-first.
  4. Add explicit reconciliation marker fields for finance exports.
- Tests:
  - env guard tests (reject mixed live/test configs).
  - webhook duplicate replay tests.
  - failed payment does not advance confirmed order state.
- Acceptance: dev/staging cannot process live money by misconfiguration.
- Rollback: config flag fallback documented; no signature/idempotency rollback allowed.

## A5. RLS blocker decision and patch design for support tickets

- Findings: F-006
- Files: `supabase/migrations/*` (new migration), support repositories/routes
- Implementation:
  1. Define role claim mapping (`platform_users`) for support access.
  2. Add scoped `SELECT/UPDATE` policies (assignment-based where required).
  3. Preserve ops escalation path explicitly.
- Tests:
  - SQL policy tests (allowed/denied).
  - API tests for support queue assignment and isolation.
- Acceptance: support data access least-privilege by role/assignment.
- Rollback: reversible migration script included in phase rollback package.

## A6. Browser E2E minimum gate for staging promotion

- Findings: F-002
- Files: new Playwright workspace under `apps/web/e2e` (or monorepo e2e package), CI workflow
- Implementation:
  1. Add minimal smoke per role path (customer checkout, chef order update, ops order view, driver delivery step).
  2. Gate staging promotion on smoke pass.
- Tests: Playwright suite + CI job.
- Acceptance: at least one end-to-end path per role green in CI.
- Rollback: temporarily downgrade to non-blocking only with signed risk waiver.
