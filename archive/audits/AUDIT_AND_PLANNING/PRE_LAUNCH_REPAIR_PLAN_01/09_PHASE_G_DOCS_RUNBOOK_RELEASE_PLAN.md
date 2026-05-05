# Phase G — Docs / Runbook / Release Plan

Focus findings: F-023, F-024, F-026, F-029, F-035.

## Documentation update sequence (only after code/test evidence)

1. Update `docs/ENVIRONMENT_VARIABLES.md`
   - add Stripe mode guardrails per environment
   - add distributed limiter settings
2. Update `docs/RUNBOOK_DEPLOY.md`
   - include staged rollout gates and E2E/load evidence requirement
3. Update `docs/BACKUP_AND_ROLLBACK.md`
   - fill RPO/RTO, contacts, and rollback owners
4. Update `docs/HEALTHCHECKS_AND_MONITORING.md`
   - reflect readiness-depth health contracts and monitoring hooks
5. Update `docs/LOAD_TESTING_PLAN.md`
   - include actual execution process and report links
6. Update `docs/RELEASE_BASELINE.md`
   - set clean merge SHA and artifact details
7. Update `AUDIT_AND_PLANNING/22_EXECUTION_TRACKER.md`
   - change statuses only when verified by tests/evidence

## Checklist artifacts to add

- Staging release checklist (technical + security + QA gate)
- Production launch checklist (includes human approvals)
- Rollback checklist (db/auth/payment/rate-limiter/ui)
- Go/no-go decision template with explicit risk acceptance

## Required human decisions

1. Distributed limiter provider selection.
2. Whether chef payouts are launch-critical vs post-launch.
3. Whether ops-wide support-ticket access is acceptable or must be assignment-scoped.
4. Promotion target after P0/P1 completion: staging-only vs limited pilot.

## Acceptance criteria

1. Every documentation claim points to validated code/tests.
2. Tracker status changes include command output references.
3. Release baseline points to clean reproducible commit.
