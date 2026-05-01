# Ridendine Pre-Launch Repair Plan 01 — Final Execution Plan

## 1) Executive Summary

- Current status from audit: **GO WITH CONDITIONS**, **NO-GO for unrestricted production**, **STAGING ONLY** under conditions.
- Why not production-ready:
  1. IRR-003 incomplete web service-role ownership audit.
  2. IRR-022 checkout RiskEngine not enforced in live route.
  3. Distributed rate limits not implemented (in-memory per-instance).
  4. Browser E2E missing; chef/driver automated testing gaps.
  5. IRR-024 load evidence absent; support RLS depth partial.
- Safe targets after repair:
  - **Staging-ready:** after P0 fixes + baseline CI/E2E smoke.
  - **Limited pilot-ready:** after P0/P1 + load evidence.
  - **Launch candidate:** after P0/P1/P2 + documentation/runbook closure.

## 2) Top 10 Repair Priorities

1. Complete IRR-003 route-by-route web service-role ownership enforcement.
2. Wire `evaluateCheckoutRisk` into checkout route (IRR-022).
3. Add distributed shared rate limiter.
4. Tighten support ticket RLS and sensitive access paths.
5. Add browser E2E critical paths across roles.
6. Add chef-admin and driver-app CI test jobs.
7. Add Stripe environment safety guards (test/live isolation).
8. Add finance reconciliation tests and export parity checks.
9. Execute and archive staging load test evidence (IRR-024).
10. Update runbooks and release baseline with verified evidence.

## 3) Complete Repair Phases

- Phase A: Launch blockers (`03_PHASE_A_LAUNCH_BLOCKERS_PLAN.md`)
- Phase B: Security/auth/RBAC/RLS (`04_PHASE_B_SECURITY_AUTH_RBAC_RLS_PLAN.md`)
- Phase C: API/checkout/Stripe/engine (`05_PHASE_C_API_CHECKOUT_STRIPE_ENGINE_PLAN.md`)
- Phase D: Testing/CI/Playwright (`06_PHASE_D_TESTING_CI_PLAYWRIGHT_PLAN.md`)
- Phase E: Performance/rate limits/load/monitoring (`07_PHASE_E_PERFORMANCE_RATE_LIMIT_LOAD_PLAN.md`)
- Phase F: UI/UX wiring (`08_PHASE_F_UI_UX_WIRING_PLAN.md`)
- Phase G: Docs/runbook/release (`09_PHASE_G_DOCS_RUNBOOK_RELEASE_PLAN.md`)

## 4) Master Issue Table

Use `01_AUDIT_FINDINGS_MASTER_INDEX.md` as canonical issue table (35 indexed findings), with owner phase and verification requirements per finding.

## 5) Exact Execution Sequence

Use `10_EXECUTION_ORDER_AND_DEPENDENCIES.md` (13 ordered steps). No out-of-order payment/auth/RLS work unless explicitly risk-reviewed.

## 6) Exact Verification Commands

From `11_TESTING_AND_ACCEPTANCE_MATRIX.md`:

- `pnpm verify:prod-data-hygiene`
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- new app-specific tests (`chef-admin`, `driver-app`)
- Playwright critical-path suite
- webhook/reconciliation/security integration suites
- staged load test command(s)

## 7) Acceptance Criteria — Staging

1. P0 items complete and verified.
2. Core CI quality gate green.
3. At least one E2E path per role green.
4. Stripe test-mode safety checks enforced.
5. Dirty-tree release process issue resolved by clean repair branch protocol.

## 8) Acceptance Criteria — Limited Pilot

1. P0 + P1 items verified.
2. Distributed limiter enabled in pilot environment.
3. Load test evidence report signed.
4. Support RLS and ownership tests pass.
5. Incident/rollback runbooks complete and reviewed.

## 9) Acceptance Criteria — Production Launch Candidate

1. All P0/P1/P2 items completed and verified.
2. Full CI matrix (including browser E2E) stable for agreed window.
3. No unresolved high-severity security/payment/privacy findings.
4. Docs and tracker fully synchronized with evidence.
5. Final go/no-go signoff recorded.

## 10) Remaining Risks After Plan

- Third-party dependency incidents and provider outages remain residual operational risks.
- Human process failures (misconfigured secrets/promotions) remain unless runbook adherence is enforced.

## 11) Required Human Decisions

1. Distributed limiter provider: Upstash Redis vs Supabase-backed vs Vercel KV.
2. Chef payout launch criticality: launch-day requirement vs post-launch hardening.
3. Support-ticket access model: ops-wide vs assignment-scoped requirement.
4. Promotion strategy after P0/P1: staging-only or limited pilot.

## 12) Final Recommendation

**Repair first, then staging.**  
After P0/P1 completion with evidence, move to **limited pilot**.  
Treat as **production candidate only** after full P0/P1/P2 completion with load/E2E/security evidence and signed human decisions.
