# Phase 9 — Backend review

## Scope

- Next.js **Route Handlers** (`route.ts`) across four apps
- Shared **`@ridendine/engine`** (business rules, Stripe wrapper, notifications)
- **`@ridendine/utils`** (rate limiting, processor auth, API response helpers)

## Evidence of health

| Check | Result |
|-------|--------|
| `pnpm run build` | All API routes compiled |
| `pnpm run test` | Engine (407 tests), auth (9), db (17), utils (36) passed |

## Patterns observed

| Topic | Assessment |
|-------|------------|
| Stripe webhook (`apps/web`) | Secret required — returns explicit failure path if misconfigured (see route + tests) |
| Processor/cron auth | `ENGINE_PROCESSOR_TOKEN` / `CRON_SECRET` in `packages/utils/processor-auth.ts` |
| Rate limiting | Upstash optional — degrades behavior documented in `packages/utils/rate-limit` |
| Error surfacing | Engine notification sender logs errors rather than silent swallow in several paths |

## Issues with evidence

| Issue | File | Evidence | Severity |
|-------|------|----------|----------|
| Chef Stripe Connect redirect hosts | `apps/chef-admin/src/app/api/payouts/setup/route.ts` | Lines 77–78 use `NEXT_PUBLIC_APP_URL`; `.env.example` defaults that to `http://localhost:3000` while chef-admin is **3001** | **High** for Connect onboarding in dev/staging if chef URL not overloaded |

## Logging

- Structured logging exists in engine (`stdout`/`stderr` in tests reflects configured logger behavior).

## CORS

- Next.js same-origin API routes — typical pattern; cross-origin APIs not primary pattern here.
