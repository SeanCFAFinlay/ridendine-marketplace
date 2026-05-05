# Rollback and Risk Control Plan

## Rollback principles

1. Small, isolated commits per repair task.
2. Feature flags for risky runtime behavior (checkout risk gate, distributed RL rollout).
3. Database migrations must ship with rollback SQL notes and data impact analysis.
4. No force reset on shared branches.

## Rollback playbooks

### Database migrations / RLS
- Affected: support-ticket and sensitive-table policies.
- Safe backout: apply reverse migration policy set restoring previous policy names.
- Data impact: access control changes (not data deletion) but could expose/restrict rows.
- Inspect: Postgres logs, denied query counts, support queue behavior.
- Pre-merge tests: SQL policy tests + API authz tests.

### Auth/RBAC changes
- Affected: route guards, role maps, middleware.
- Safe backout: revert guard changes per route group; keep production BYPASS guard.
- Data impact: temporary access denial/allow risks.
- Inspect: 401/403 rates, auth error logs.

### Stripe/payment changes
- Affected: checkout, webhook, refund logic.
- Safe backout: revert to previous stable path **without removing signature/idempotency**.
- Data impact: payment/order mismatch risk if partially rolled back.
- Inspect: webhook processing logs, pending payment intents, reconciliation table.
- Feature flag: risk-engine enforcement toggle (emergency only).

### Rate limiter changes
- Affected: shared limiter provider integration.
- Safe backout: fallback to in-memory limiter with reduced exposure and alert banner.
- Data impact: abuse risk increases.
- Inspect: 429 rate, error spikes, provider latency.

### CI changes
- Affected: new jobs/tests/workflows.
- Safe backout: disable non-critical jobs temporarily, keep core quality gate.
- Data impact: reduced confidence, no runtime data loss.
- Inspect: pipeline duration, flaky test reports.

### UI wiring changes
- Affected: checkout/dashboard/driver/chef screens.
- Safe backout: revert affected pages/components only.
- Data impact: UX degradation, possible stale state behavior.
- Inspect: frontend error telemetry, conversion/task completion.

### Environment-variable changes
- Affected: env docs and startup guards.
- Safe backout: revert strict checks only with signed waiver.
- Data impact: accidental wrong-environment key usage risk.
- Inspect: startup failures and env validation logs.

## Risk controls before merge

- Mandatory reviewer set: security + payments + owning app.
- Required evidence links in PR description (tests, logs, artifacts).
- Rollout strategy: canary/staging first, then pilot, then production candidate.
