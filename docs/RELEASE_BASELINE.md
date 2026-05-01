# Release baseline — Phase G

## 1. Baseline metadata

| Field | Value |
|---|---|
| Project | Ridendine monorepo |
| Branch | `ridendine-prelaunch-repair-checkpoint` |
| Commit SHA | `99ad1c9f55a8a92888511d16a0557cb950d226da` |
| Baseline stage | Post Phase F, Phase G documentation/release readiness |
| Working tree | Dirty (expected during phased repair execution) |

## 2. Phase completion summary

| Phase | Status | Notes |
|---|---|---|
| A | Completed | Checkout risk hook + Stripe non-prod safety |
| B | Completed (conditional carry) | Auth/RBAC/RLS/service-role hardening |
| C | Completed (conditional carry) | Checkout/payment/webhook/idempotency hardening |
| D | Completed (conditional carry) | Playwright smoke + chef/driver CI coverage |
| E | Completed (conditional carry) | Distributed-aware RL wiring + health depth + load tooling |
| F | Completed (conditional carry) | UI/UX launch-critical wiring fixes |
| G | In progress in this phase | Docs/runbook/release/tracker/report updates |

## 3. Verification command history (latest local)

Verified as passing in current repair execution sequence:
- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm test:smoke`
- `pnpm test:load:dry-run`

Targeted app tests (latest phase cycle) passed:
- `pnpm --filter @ridendine/web test`
- `pnpm --filter @ridendine/chef-admin test`
- `pnpm --filter @ridendine/ops-admin test`
- `pnpm --filter @ridendine/driver-app test`

## 4. Open conditions (must remain explicit)

- staging migration application pending:
  - `supabase/migrations/00018_phase_c_checkout_idempotency.sql`
- distributed rate-limit provider configuration pending in staging/production
- staged load evidence/sign-off pending (`IRR-024`)
- graphify rebuild tooling repeatedly hangs (known issue; documented)
- remote PR/Vercel check stability still pending final merge gate evidence

## 5. Current readiness classification

**STAGING READY WITH CONDITIONS**

Reason:
- local verification and phased implementation evidence are strong,
- but required staging and remote evidence is still incomplete for production candidate status.

## 6. Production readiness rule

Do not mark production-ready unless all of the following are evidenced:
- remote CI/check suites pass,
- Vercel previews validated,
- distributed limiter configured in production-like environment,
- `00018` migration applied and validated in staging,
- Stripe test webhook validation completed in staging,
- staged load report signed off.
