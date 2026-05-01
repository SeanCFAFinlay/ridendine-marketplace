# Deployment runbook — Ridendine

Scope: staging and production deploy procedures with evidence gates.

Related:
- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/BACKUP_AND_ROLLBACK.md`
- `docs/HEALTHCHECKS_AND_MONITORING.md`
- `docs/LOAD_TESTING_PLAN.md`

## 1. Staging deployment sequence (required)

1. Confirm branch and commit in `docs/RELEASE_BASELINE.md`.
2. Confirm all required env vars are present in staging projects.
3. Run migration phase in staging (see section 2).
4. Deploy all four apps to Vercel Preview/Staging targets.
5. Run verification command set (section 3).
6. Run health/readiness checks (section 4).
7. Run browser smoke checks (section 5).
8. Validate Stripe test-mode webhook flow (section 6).
9. Execute staged load test + sign-off (section 7).
10. Record results in Phase G reports before any production promotion decision.

## 2. Migration order (staging first, then production by change control)

Precondition: backup strategy confirmed per `docs/BACKUP_AND_ROLLBACK.md`.

Required migration for current release gates:
- `supabase/migrations/00018_phase_c_checkout_idempotency.sql`

Recommended order:
1. Apply earlier unapplied security migrations (including Phase B hardening) if target env is behind.
2. Apply `00018_phase_c_checkout_idempotency.sql`.
3. Validate schema and idempotency table behavior.
4. Set `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED=true` only after validation.

Example command (operator-run, not automated here):
- `supabase db push`

## 3. Required verification commands

Run in repository root:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. `pnpm build`
5. `pnpm test:smoke`
6. `pnpm test:load:dry-run`

All must pass before advancing staging readiness status.

## 4. Healthcheck validation

Validate each app:
- `GET /api/health` for `web`, `chef-admin`, `ops-admin`, `driver-app`

Expectations:
- `ready` or explicitly understood `degraded` with documented reason.
- No secrets in response payload.
- If rate-limit provider missing in production-like env, readiness should not be treated as launch-ready.

## 5. Vercel preview validation

For each app preview deployment:
- confirm app boots and protected route redirects still work;
- confirm cross-app URLs resolve (`web` to chef/ops/driver links where applicable);
- confirm build output and route health endpoint are reachable;
- confirm no production Stripe live secrets are used in preview.

## 6. Stripe test-mode webhook validation (staging)

1. Configure staging webhook endpoint:
   - `https://<staging-web-domain>/api/webhooks/stripe`
2. Use Stripe test mode and test signing secret only.
3. Replay representative events (`payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`).
4. Confirm:
   - signature validation behavior,
   - idempotent replay behavior,
   - safe status handling in logs and order state.

## 7. Staging load evidence validation

Use `docs/LOAD_TESTING_PLAN.md` and run:
- `pnpm test:load:staging`

Then complete:
- `AUDIT_AND_PLANNING/PRE_LAUNCH_REPAIR_EXECUTION_01/LOAD_TEST_STAGING_REPORT_TEMPLATE.md`

Release cannot be marked production-candidate without signed staging load evidence.

## 8. Production promotion gate (must all be true)

- remote CI/checks green;
- Vercel previews validated;
- distributed rate-limit provider configured in production;
- staging migration `00018` applied and validated;
- Stripe test-mode webhook validation complete in staging;
- staged load report signed off;
- latest local verification command set passing.

If any item is missing, do not label production-ready.

## 9. Rollback reference

Use `docs/BACKUP_AND_ROLLBACK.md` for rollback decisions and sequencing.
Do not perform ad-hoc destructive DB rollback without approved recovery path.
