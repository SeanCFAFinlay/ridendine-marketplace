# Execution Order and Dependencies

## Step 1. Freeze baseline and protect dirty tree
- Why now: prevents losing traceability.
- Depends on: none.
- Could break: release confidence if skipped.
- Verify: branch/sha/dirty log and protection checklist.
- Do not: reset or discard unrelated local work.

## Step 2. Reconfirm build/typecheck/lint/test baseline
- Why now: establish known-good floor before invasive fixes.
- Depends on: step 1.
- Could break: hidden regressions if stale caches mislead.
- Verify: `pnpm typecheck`, `pnpm lint`, targeted tests, `pnpm build`.
- Do not: combine functional changes in this step.

## Step 3. Fix auth/RBAC/service-role/RLS blockers
- Why now: data/privacy risks are highest.
- Depends on: step 2.
- Could break: access paths and support operations.
- Verify: ownership + role negative tests, RLS tests.
- Do not: weaken policy for temporary convenience.

## Step 4. Fix checkout/order/payment/webhook blockers
- Why now: irreversible money/order integrity.
- Depends on: step 3.
- Could break: checkout conversion if overly strict.
- Verify: checkout integration tests + webhook replay tests.
- Do not: bypass signature/idempotency checks.

## Step 5. Wire checkout RiskEngine hooks
- Why now: fraud gate is explicit launch blocker.
- Depends on: step 4.
- Could break: false-positive blocking.
- Verify: blocked/allowed scenario tests and audit trail.
- Do not: hardcode risk outcomes.

## Step 6. Add route validation and API hardening
- Why now: prevent malformed input and drift.
- Depends on: steps 3-5.
- Could break: clients depending on loose payloads.
- Verify: schema tests + contract snapshots.
- Do not: silently coerce unsafe payloads.

## Step 7. Add distributed rate limits
- Why now: production scale safety.
- Depends on: route inventory and policy matrix.
- Could break: legitimate traffic if thresholds wrong.
- Verify: RL tests + canary telemetry.
- Do not: keep in-memory limiter as production authority.

## Step 8. Add Playwright and missing CI coverage
- Why now: regression confidence for pilot/launch.
- Depends on: stable APIs (steps 3-7).
- Could break: CI runtime/timeouts.
- Verify: CI green + artifact retention.
- Do not: mock core app success paths.

## Step 9. Add load test evidence
- Why now: requires stabilized routes and RL.
- Depends on: step 7 and minimum E2E.
- Could break: noisy staging if uncontrolled.
- Verify: signed load report + SLO outputs.
- Do not: run aggressive load on production.

## Step 10. Fix UI wiring gaps
- Why now: APIs are stable enough for integration.
- Depends on: steps 3-9.
- Could break: UX behavior.
- Verify: component tests + E2E + manual QA.
- Do not: rewrite architecture/UI wholesale.

## Step 11. Update docs/runbooks/release baseline
- Why now: only valid after technical changes verified.
- Depends on: evidence from prior steps.
- Could break: operational response if inaccurate.
- Verify: doc review checklist.
- Do not: pre-claim completion.

## Step 12. Run full verification suite
- Why now: final confidence gate.
- Depends on: all prior steps.
- Could break: expose latent regressions.
- Verify: full command matrix and artifacts.
- Do not: waive failing P0/P1 tests.

## Step 13. Publish post-repair report
- Why now: decision artifact for staging/pilot/launch.
- Depends on: step 12 evidence.
- Could break: governance if incomplete.
- Verify: signoff from engineering/security/QA/release owner.
- Do not: mark production-ready without evidence.
