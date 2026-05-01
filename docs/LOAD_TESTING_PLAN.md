# Load testing plan (IRR-024)

Current status: tooling and template are in place; staged evidence sign-off is still required for release elevation.

## 1. Commands

- Dry run (configuration validation only):
  - `pnpm test:load:dry-run`
- Local smoke (default base URL):
  - `pnpm test:load`
- Staging execution:
  - `pnpm test:load:staging`

`pnpm test:load:staging` requires `LOAD_BASE_URL` and staging auth/test data setup as applicable.

## 2. Target endpoints/scenarios

Current script-backed scenarios:
- Health endpoint latency/error behavior.
- Support-write endpoint under load including 429 observation.

Additional launch-critical scenarios (operator-run):
- Checkout API under authenticated staging sessions.
- Driver location update route under realistic update cadence.

## 3. Throughput/concurrency targets

Minimum staging run settings must be explicitly recorded in report:
- total iterations,
- concurrency level,
- request rate (effective RPS),
- scenario duration.

Target bands (owner-adjustable by environment capacity):
- baseline concurrency: 10–25
- elevated concurrency: 25–50
- stress burst: >50 (only with explicit approval)

## 4. Required metrics in report

- `p50`, `p95`, `p99` latency
- total request count
- success count/failure count
- error-rate percentage
- 429 rate-limited count

## 5. Threshold expectations (staging gate)

- 5xx error rate should remain below agreed launch threshold (default guidance: `< 0.1%` excluding intentional failure tests).
- p95/p99 latency must remain within owner-approved service targets.
- 429 behavior must align with configured policy expectations (not random/unbounded failures).

## 6. Rate-limit behavior expectations

- In distributed-configured environments, limits should behave consistently across instances.
- In environments without distributed provider, readiness is degraded and high-risk policies may fail-closed.
- Any observed mismatch must be recorded as blocking or conditional in release baseline.

## 7. Sign-off artifact

Use:
- `AUDIT_AND_PLANNING/PRE_LAUNCH_REPAIR_EXECUTION_01/LOAD_TEST_STAGING_REPORT_TEMPLATE.md`

Sign-off required fields:
- environment/date/build
- command(s) and parameters
- metric table
- pass/fail against thresholds
- owner approval

## 8. Release rule

Do not classify production readiness without a signed staged load evidence report.
IRR-024 remains conditional until staged evidence is executed and approved.
