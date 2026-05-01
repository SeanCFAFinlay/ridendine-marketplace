# Phase E — Performance / Rate Limits / Load / Health / Monitoring Plan

Focus findings: F-004, F-009, F-010, F-016, F-021, F-032.

## E1. Distributed rate limiter implementation

Decision required: shared backend provider.

Options to evaluate:
- Upstash Redis (recommended fast path)
- Supabase-backed limiter table
- Vercel KV / Edge store

Selection criteria: multi-instance correctness, latency, cost, ops complexity, failure mode control.

## E2. Rate-limit classes and policies

| Class | Route examples | Policy | Failure mode |
|---|---|---|---|
| Auth | `/api/auth/login`, `/api/auth/signup` | strict burst+window | fail-closed |
| Checkout | `/api/checkout` | strict with penalties | fail-closed |
| Webhook | `/api/webhooks/stripe` | moderate + source-aware | fail-open with alert only if provider down |
| Customer writes | cart/reviews/support | moderate | fail-closed |
| Chef writes | menu/orders/upload | moderate | fail-closed |
| Driver location | `/api/location` | high-frequency tuned | fail-open bounded + telemetry |
| Ops/admin writes | ops engine writes | low volume strict | fail-closed |
| Uploads | web/chef upload routes | strict size + rate | fail-closed |

## E3. Healthcheck depth expansion

- Add health levels:
  1. liveness (app up)
  2. readiness (db connectivity)
  3. dependency checks (Stripe config present, processor token config)
  4. background job/queue heartbeat if present
- Keep response safe (no secrets).

## E4. Pagination/perf controls

- Audit list endpoints (ops/customer lists) and enforce cursor/page limits.
- Add max page size constants in shared validation.
- Validate driver location throttle remains bounded after distributed limiter rollout.

## E5. IRR-024 load evidence execution

- Add script(s): k6/Artillery in `scripts/load/`.
- Define SLOs (p95 latency, error rate, saturation) for checkout and key ops APIs.
- Run staged load using test data and Stripe test mode.
- Store signed report under `docs/load-reports/` and link in `docs/LOAD_TESTING_PLAN.md`.

## E6. Monitoring/logging controls

- Correlation/request IDs across route handlers.
- Structured logs with redaction (`redact-sensitive` utilities).
- No PII/secrets in logs by policy tests.
- Audit trail for admin/payment/order mutations.

## Acceptance criteria

1. In-memory limiter no longer authoritative in production path.
2. Route classes mapped to explicit distributed RL policies.
3. Health endpoints provide actionable readiness checks.
4. At least one signed staging load report exists.
