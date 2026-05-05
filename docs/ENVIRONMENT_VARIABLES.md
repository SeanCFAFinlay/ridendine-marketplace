# Environment variables

Single source of truth for names, classification, and release guardrails.  
Never commit real secrets. Use safe examples only.

Related: `docs/RUNBOOK_DEPLOY.md`, `docs/HEALTHCHECKS_AND_MONITORING.md`, `docs/RELEASE_BASELINE.md`.

## Environment policy summary

- **Development / local:** test Stripe keys only, memory rate limiter allowed, health may be `degraded` without distributed provider.
- **Staging:** test Stripe keys only, distributed rate-limit provider required for production-like readiness, checkout idempotency migration must be applied before launch gating.
- **Production:** live Stripe secret required, distributed rate-limit provider required, `ALLOW_DEV_AUTOLOGIN` must be absent or false, no preview/test-only values.

## Variable matrix

| Variable | Scope | Local | Staging | Prod | Public/Server | Safe example | Notes |
|---|---|---|---|---|---|---|---|
| `NODE_ENV` | all apps | R | R | R | Server | `development` / `production` | Set by runtime. |
| `NEXT_PUBLIC_SUPABASE_URL` | all apps | R | R | R | Public | `https://project-ref.supabase.co` | Not secret. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | all apps | R | R | R | Public | `eyJhbGci...` | Public anon key only. |
| `SUPABASE_SERVICE_ROLE_KEY` | server APIs/engine | O | R | R | Server | `eyJhbGci...` | Secret; never `NEXT_PUBLIC_*`. |
| `DATABASE_URL` | migration/CLI | O | R | R | Server | `postgresql://user:***@host:5432/db` | Secret. |
| `NEXT_PUBLIC_APP_URL` | per app | R | R | R | Public | `http://localhost:3000` | Must match deployed origin for redirects. |
| `NEXT_PUBLIC_CHEF_ADMIN_URL` | web links | R | R | R | Public | `http://localhost:3001` | Cross-app route links. |
| `NEXT_PUBLIC_OPS_ADMIN_URL` | cross-links | O | O | O | Public | `http://localhost:3002` | Optional. |
| `NEXT_PUBLIC_DRIVER_APP_URL` | cross-links | O | O | O | Public | `http://localhost:3003` | Optional. |
| `STRIPE_SECRET_KEY` | web/engine/chef payouts | R | R | R | Server | `sk_test_example...` / `sk_live_example...` | Secret; mode-guarded at runtime. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | web checkout UI | R | R | R | Public | `pk_test_example...` | Public, environment-specific. |
| `STRIPE_WEBHOOK_SECRET` | web webhook route | R | R | R | Server | `whsec_example...` | Secret; one per endpoint URL. |
| `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED` | health/readiness reporting | O | R | R | Server | `true` | Set true only after `00018` applied in that env. |
| `UPSTASH_REDIS_REST_URL` | server APIs | O | R | R | Server | `https://region-name.upstash.io` | Required distributed rate limiting outside dev/test. |
| `UPSTASH_REDIS_REST_TOKEN` | server APIs | O | R | R | Server | `upstash_token_example` | Secret; never public. |
| `ENGINE_PROCESSOR_TOKEN` | ops processor APIs | O | R | R | Server | `hex_or_uuid_example` | Secret. |
| `CRON_SECRET` | Vercel cron auth | O | R | R | Server | `cron_secret_example` | Secret bearer token for processor calls. |
| `ALLOW_DEV_AUTOLOGIN` | auth middleware | O | Forbidden | Forbidden | Server | `false` | Local dev only. Never honored in production regardless of value. Replaces removed `BYPASS_AUTH`. |
| `RESEND_API_KEY` | email delivery | O | O | O | Server | `re_example...` | Resend API key. Falls back to DB-only notifications when unset. |
| `TWILIO_ACCOUNT_SID` | SMS delivery | O | O | O | Server | `ACexample...` | Twilio account SID for SMS notifications. Falls back to DB-only when unset. |
| `TWILIO_AUTH_TOKEN` | SMS delivery | O | O | O | Server | `twilio_token_example` | Secret; never `NEXT_PUBLIC_*`. |
| `TWILIO_FROM_NUMBER` | SMS delivery | O | O | O | Server | `+15005550006` | E.164 format Twilio sending number. |
| `NEXT_PUBLIC_SENTRY_DSN` | error monitoring | O | O | O | Public | `https://key@o123.ingest.sentry.io/456` | Per-app Sentry DSN. Sentry no-ops when unset. |
| `SENTRY_AUTH_TOKEN` | source maps | O | O | O | Server | `sntrys_example...` | Used by `@sentry/nextjs` Webpack plugin to upload source maps at build time. Optional. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | maps UI | O | O | O | Public | `AIzaSyExample...` | Used by web app delivery tracking map. Optional — map degrades gracefully when unset. |

## Stripe mode guardrails (Phase A/C)

- **Non-production (local + staging):**
  - `STRIPE_SECRET_KEY` must be `sk_test_*`.
  - live key (`sk_live_*`) is rejected.
- **Production:**
  - `STRIPE_SECRET_KEY` must be `sk_live_*`.
  - test key (`sk_test_*`) is rejected.
- **Rule:** never run live money flows in dev/staging.

## Checkout idempotency requirement (Phase C)

- Migration `supabase/migrations/00018_phase_c_checkout_idempotency.sql` is required in staging/production before go/no-go.
- Set `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED=true` only after migration is applied and validated.

## Health/readiness expectations

- `/api/health` readiness depends on:
  - DB probe status,
  - required env presence,
  - Stripe config validity (without exposing secrets),
  - distributed rate-limit provider status,
  - checkout idempotency migration flag.

## Vercel preview requirements

- Preview deployments must use:
  - preview-specific `NEXT_PUBLIC_APP_URL`,
  - Stripe **test** keys only,
  - preview webhook secret only if webhook route is exercised.
- Never copy production live secrets into preview environments.

## Pre-deploy validation checklist

1. Confirm `ALLOW_DEV_AUTOLOGIN` is absent or false.
2. Confirm Stripe key mode matches environment policy above.
3. Confirm distributed rate-limit env vars are set in staging/prod.
4. Confirm `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED=true` only after migration evidence.
5. Confirm no `SUPABASE_SERVICE_ROLE_KEY` appears in public env var names.
