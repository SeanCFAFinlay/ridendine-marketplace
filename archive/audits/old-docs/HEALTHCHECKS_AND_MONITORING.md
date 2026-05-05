# Health checks and monitoring

This document reflects the current operational health contract from Phase E.

## 1. Endpoint model

Each app exposes:
- `GET /api/health`

Apps:
- `web` (`:3000`)
- `chef-admin` (`:3001`)
- `ops-admin` (`:3002`)
- `driver-app` (`:3003`)

Ops deep health remains authenticated (`/api/engine/health`) and is not a public liveness endpoint.

## 2. Liveness vs readiness

- **Liveness:** route responds and process is running.
- **Readiness:** dependencies and configuration are valid for safe traffic.

Response status behavior:
- `200` for `ready` and `degraded`
- `503` for `not_ready`

## 3. Readiness signals

Health payload includes checks similar to:
- `app`
- `db`
- `env`
- `stripe`
- `rateLimit`
- `checkoutIdempotencyMigration`

`details` may include non-secret metadata (for example provider type/build SHA).

No secrets may appear in health payloads.

## 4. Degraded and not-ready semantics

### degraded (traffic may continue with caution)

Examples:
- production-like env missing distributed rate-limit provider where fallback behavior exists for lower-risk paths;
- non-critical dependency checks in warning state.

### not_ready (do not promote or accept normal traffic)

Examples:
- DB probe failure,
- missing critical env vars,
- invalid Stripe configuration,
- hard fail readiness dependency unavailable.

## 5. Stripe/rate-limit readiness expectations

- Stripe status should indicate config validity only; never return key values.
- Rate-limit status should report provider readiness (distributed vs degraded/fallback).
- Production-like readiness is conditional if distributed provider is absent.

## 6. Correlation IDs and logging

- Critical API paths should include correlation IDs in responses/log context where implemented.
- Logs must remain redacted (no secret tokens, payment sensitive values, or full PII dumps).

## 7. Staging validation checklist

Run after staging deploy:

1. Hit each app `GET /api/health`.
2. Confirm `service` identity is correct per app.
3. Confirm readiness state is expected (`ready` or documented `degraded`).
4. Confirm no secret leakage in payload.
5. Confirm DB/env/Stripe/rate-limit checks reflect known environment setup.
6. Record results in Phase G execution reports and release baseline.

## 8. Monitoring minimums

- Alert on:
  - `not_ready` responses,
  - sustained health degradation,
  - Stripe webhook error spikes,
  - DB connectivity failures,
  - processor auth failure spikes.
- Review alerts during staging sign-off and go/no-go.
