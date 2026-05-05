# Phase 10 — Performance, rate limits, health, monitoring

## Healthchecks

| App | Path | DB connectivity in payload? |
|-----|------|------------------------------|
| web | `/api/health` | **No** — static `healthPayload('web')` only |
| chef-admin | `/api/health` | Same pattern |
| ops-admin | `/api/health` | Same pattern |
| driver-app | `/api/health` | Same pattern |

**Doc claim vs code:** `docs/HEALTHCHECKS_AND_MONITORING.md` may describe deeper checks — **PARTIAL** if doc promises DB ping (re-read doc on merge). Current code is **liveness** style only (`apps/web/src/app/api/health/route.ts`).

## Ops engine health

`apps/ops-admin/src/app/api/engine/health/route.ts` — likely aggregates engine/DB — **not deep-reviewed** in this pass; treat as **follow-up**.

## Rate limits (production safety)

- **Confirmed:** in-process token bucket — **not** production-safe for global abuse thresholds.  
- **Mitigation path:** Upstash Redis / Vercel KV noted in `rate-limiter.ts` comments.

## Pagination / expensive queries

**Suspected risk:** ops list endpoints — require per-route review (`listOps*` repos). Not measured.

## Driver location throttling

**VERIFIED** — `RATE_LIMITS.driverLocation` + tests.

## Webhook performance

Idempotent fast path returns early on replay — engine tests cover logic; **load not measured** (IRR-024).

## Correlation IDs

**Not verified** — no systematic request-id middleware grep performed.
