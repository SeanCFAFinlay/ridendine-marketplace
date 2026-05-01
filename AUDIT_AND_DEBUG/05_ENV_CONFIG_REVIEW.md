# Phase 6 — Environment and configuration review

**Rule:** Variable **names** only; no secret values printed.

## Source files reviewed

- `.env.example` (repo root)
- `turbo.json` (build env allowlist)
- Grep: `process.env.*` across `*.ts`, `*.tsx`, `*.mjs` (sampled; not every occurrence duplicated here)

## Table — primary variables

| Env variable | Used in (examples) | Required for local dev? | In `.env.example`? | Issue |
|--------------|-------------------|-------------------------|--------------------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | `packages/db` clients, health routes, auth | Yes (data/auth) | Yes | None |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Same | Yes | Yes | None |
| `SUPABASE_SERVICE_ROLE_KEY` | `packages/db` admin, scripts, engine e2e | For privileged server ops | Yes | None |
| `DATABASE_URL` | `packages/db/scripts/generate-types.mjs`, migrations | For CLI / typegen | Yes | None |
| `NEXT_PUBLIC_APP_URL` | Web URLs, sitemap, robots, ops integrations display | Yes (correct links) | Yes | See chef payout fix — must not be the only base for chef-only flows |
| `NEXT_PUBLIC_CHEF_ADMIN_URL` | `apps/web` customer CTAs, `customer-ordering.ts` | Recommended | Yes | Should drive chef-hosted redirects |
| `NEXT_PUBLIC_OPS_ADMIN_URL` | Cross-app links | Optional locally | Yes | — |
| `NEXT_PUBLIC_DRIVER_APP_URL` | Cross-app links | Optional locally | Yes | — |
| `NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL` | Chef signup override | Optional | Commented | — |
| `STRIPE_SECRET_KEY` | Engine Stripe client, webhooks, checkout server paths | For payments | Yes | — |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `apps/web` checkout `loadStripe` | For checkout UI | Yes | — |
| `STRIPE_WEBHOOK_SECRET` | Web app Stripe webhook verification | For webhook integrity | Yes | — |
| `RESEND_API_KEY` | Email provider | Optional | Commented | — |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry configs | Optional | Commented | — |
| `ENGINE_PROCESSOR_TOKEN` | Processor auth, ops integrations page | For cron/processors | Yes | — |
| `CRON_SECRET` | `packages/utils/processor-auth` | Vercel cron | Yes | — |
| `BYPASS_AUTH` | `packages/auth/middleware` | Dev only | Yes (`false`) | Must stay false in production |
| `NEXT_PUBLIC_ENABLE_REVIEWS` | Feature flags | Optional | Yes | — |
| `NEXT_PUBLIC_ENABLE_DRIVER_TRACKING` | Feature flags | Optional | Yes | — |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | `packages/utils/rate-limit` | Prod rate-limit | **Not in `.env.example`** | Document optional Redis |
| `APP_ENV` | Rate limit nuance | Optional | **Missing** | Low priority doc gap |
| `LOG_LEVEL` | `packages/utils/logger` | Optional | **Missing** | Low priority doc gap |
| `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED` | `apps/web/src/app/api/health/route.ts` | Operational flag | **Missing** | Health may show migration unchecked |
| `LOAD_BASE_URL`, `LOAD_ITERATIONS`, `LOAD_CONCURRENCY` | `scripts/load/run-load-smoke.mjs` | Load testing only | **Missing** | Document in load-testing doc |
| `VERCEL_GIT_COMMIT_SHA`, `GITHUB_SHA` | `packages/utils/api-response` metadata | CI/deploy | N/A | Optional |

## `.env.example`

- **Exists** at repo root with placeholders — **no second duplicate created** to avoid drift.
- **Recommended follow-up:** append commented stubs for `UPSTASH_*`, `APP_ENV`, `LOG_LEVEL`, `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED`, and load-test vars (safe blanks).

## Security notes

- `TEST_CREDENTIALS.md` exists — verify it is gitignored or sanitized for public repos (not opened during audit).
