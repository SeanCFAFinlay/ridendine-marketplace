# Backup and rollback

Companion documents:
- `docs/RUNBOOK_DEPLOY.md`
- `docs/RELEASE_BASELINE.md`

This runbook is release-oriented and explicitly covers rollback for Phase A-F changes.

## 1. Core backup policy

- Before production migration or release promotion:
  - confirm Supabase backup/PITR capability,
  - confirm operator access to restore path,
  - confirm rollback owner and approval chain.
- Use migration history in `supabase/migrations/` as schema source of truth.
- Do not run unreviewed ad-hoc SQL in production.

## 2. Rollback by change area

### 2.1 Checkout idempotency migration (`00018`)

- Risk: checkout flow disruption if schema mismatch.
- Preferred rollback:
  1. pause promotion and route new traffic to last known-good deploy;
  2. apply forward-fix migration if possible;
  3. if not recoverable quickly, execute DB restore/PITR per approved ops process.
- Notes:
  - do not mark migration applied flags true after rollback;
  - reconcile idempotency ledger behavior post-recovery.

### 2.2 RLS/security migration (Phase B hardening)

- Risk: over-restrictive or permissive access behavior.
- Preferred rollback:
  - forward-fix policy migration with explicit tests;
  - DB restore only for catastrophic break.
- Mandatory validation after rollback/fix:
  - cross-tenant denial checks,
  - support ticket visibility checks,
  - platform role guard checks.

### 2.3 Rate-limit provider config (Phase E)

- Risk: production-like readiness degraded or fail-closed on high-risk routes when provider is missing.
- Rollback approach:
  - revert env config to last known-good configuration set;
  - if provider outage occurs, document degraded mode and apply emergency traffic controls;
  - avoid code rollback unless config rollback fails.

### 2.4 Stripe/payment/webhook hardening (Phase A/C)

- Risk: key mode mismatch, webhook validation issues, idempotency processing interruptions.
- Rollback approach:
  - revert Vercel deploy to last known-good artifact;
  - verify Stripe secret key mode for environment (`test` vs `live`);
  - rotate/reapply webhook secret if endpoint mismatch.
- Constraint:
  - money movement is not rolled back by code deploy; reconcile in Stripe/finance process.

### 2.5 UI wiring changes (Phase F)

- Risk: user flow regressions on customer/chef/ops/driver surfaces.
- Rollback approach:
  - Vercel rollback to previous deployment;
  - verify route/API contracts and smoke tests after rollback.

### 2.6 CI/Playwright changes (Phase D+)

- Risk: blocked PR merges due to gate instability.
- Rollback approach:
  - revert workflow/config commit in branch, keep security checks intact;
  - do not disable critical quality gates without owner approval.

### 2.7 Staging deploy rollback

- If staging validation fails:
  - stop promotion,
  - rollback app deploy first,
  - rollback DB only if required and approved,
  - rerun staging verification set before resuming.

## 3. Vercel rollback quick steps

1. Open project deployments.
2. Identify last known-good deployment.
3. Promote/redeploy previous artifact.
4. Re-run:
   - health endpoint checks,
   - smoke tests,
   - critical payment/checkout sanity checks.

## 4. RPO/RTO and contacts

These values are required for launch but not provided in-repo yet.

| Item | Status |
|---|---|
| RPO target | **OWNER REQUIRED** |
| RTO target | **OWNER REQUIRED** |
| Engineering on-call contact | **OWNER REQUIRED** |
| Supabase recovery owner | **OWNER REQUIRED** |
| Stripe/finance incident owner | **OWNER REQUIRED** |
| Customer communications owner | **OWNER REQUIRED** |

## 5. Tabletop recommendation

Run a tabletop before production cut:
- migration fails in staging,
- rollback app deploy,
- decide forward-fix vs PITR,
- reconcile payment/event state.
