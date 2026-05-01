# Environment variables

Single source for **names and classification** only. Store **real values** in Vercel / Supabase / Stripe dashboards or a private secret manager — never commit them.

Related: [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md), [`docs/RUNBOOK_DEPLOY.md`](RUNBOOK_DEPLOY.md), [`.env.example`](../.env.example).

---

## Legend

| Column | Meaning |
|--------|---------|
| **Scope** | Where the variable is read (all Next apps share patterns unless noted). |
| **Public** | `NEXT_PUBLIC_*` — embedded in client bundles; must not be secrets. |
| **Server** | Available only on server/runtime for API routes and SSR. |

**Local / Staging / Prod:** `R` = required for meaningful behavior, `O` = optional.

---

## Core platform

| Variable | Scope | Local | Staging | Prod | Public / Server | Example (non-secret) | Security / notes |
|----------|-------|-------|---------|------|-----------------|----------------------|-------------------|
| `NODE_ENV` | All | R | R | R | Server | `development` / `production` | Set by host; **`BYPASS_AUTH` is forbidden when `production`** (see `packages/auth`). |
| `NEXT_PUBLIC_SUPABASE_URL` | All apps | R | R | R | Public | `https://xxx.supabase.co` | Project URL; not a secret but identifies project. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | All apps | R | R | R | Public | `eyJ...` (anon) | RLS applies; still not a service role. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server APIs, engine, scripts | R* | R | R | Server | `eyJ...` (service role) | **Secret.** Bypasses RLS — use only in trusted server contexts. *Local optional if not hitting admin APIs.* |
| `DATABASE_URL` | Migrations, `db:generate`, CLI | O | R | R | Server | `postgresql://...` | **Secret.** For `supabase link` / dumps; not required for Vercel runtime if apps use Supabase HTTP only. |

## URLs (cross-app)

| Variable | Scope | Local | Staging | Prod | Public / Server | Example | Notes |
|----------|-------|-------|---------|------|-----------------|---------|-------|
| `NEXT_PUBLIC_APP_URL` | Each app’s “self” base URL | R | R | R | Public | `http://localhost:3000` | Web: canonical origin for redirects and Stripe return URLs. |
| `NEXT_PUBLIC_CHEF_ADMIN_URL` | Web (links) | R | R | R | Public | `http://localhost:3001` | Chef portal sign-up/login CTAs. |
| `NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL` | Web | O | O | O | Public | — | Overrides default chef signup URL. |
| `NEXT_PUBLIC_OPS_ADMIN_URL` | Optional cross-links | O | O | O | Public | `http://localhost:3002` | |
| `NEXT_PUBLIC_DRIVER_APP_URL` | Optional cross-links | O | O | O | Public | `http://localhost:3003` | |

## Stripe

| Variable | Scope | Local | Staging | Prod | Public / Server | Example | Notes |
|----------|-------|-------|---------|------|-----------------|---------|-------|
| `STRIPE_SECRET_KEY` | Web (API), chef payouts, engine | R | R | R | Server | `sk_test_...` / `sk_live_...` | **Secret.** Single module: `packages/engine` `getStripeClient()`. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Web checkout UI | R | R | R | Public | `pk_test_...` | Not a secret; still environment-specific. |
| `STRIPE_WEBHOOK_SECRET` | Web `POST /api/webhooks/stripe` | R | R | R | Server | `whsec_...` | **Secret.** One endpoint per deployed web URL. |
| `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED` | Web health readiness note | O | O | O | Server | `true` | Set to `true` after `00018_phase_c_checkout_idempotency.sql` is applied in the target environment. |

## Distributed rate limiting

| Variable | Scope | Local | Staging | Prod | Public / Server | Example | Notes |
|----------|-------|-------|---------|------|-----------------|---------|-------|
| `UPSTASH_REDIS_REST_URL` | Server APIs | O | R | R | Server | `https://...upstash.io` | Required for distributed rate limiting in production-like environments. |
| `UPSTASH_REDIS_REST_TOKEN` | Server APIs | O | R | R | Server | `A...` | **Secret.** Do not expose via `NEXT_PUBLIC_*`. |

## Processors / cron (ops-admin)

| Variable | Scope | Local | Staging | Prod | Public / Server | Example | Notes |
|----------|-------|-------|---------|------|-----------------|---------|-------|
| `ENGINE_PROCESSOR_TOKEN` | `apps/ops-admin` processor routes | O | R | R | Server | random hex | **Secret.** `x-processor-token` OR pair with `CRON_SECRET`. |
| `CRON_SECRET` | Vercel Cron `Authorization: Bearer` | O | R | R | Server | random | **Secret.** Validated by `validateEngineProcessorHeaders` in `@ridendine/utils`. |

## Email / observability / feature flags

| Variable | Scope | Local | Staging | Prod | Public / Server | Example | Notes |
|----------|-------|-------|---------|------|-----------------|---------|-------|
| `RESEND_API_KEY` | Engine email adapter | O | O | O | Server | `re_...` | **Secret** if set. |
| `NEXT_PUBLIC_SENTRY_DSN` | Client + server Sentry | O | O | O | Public | DSN URL | DSN is sensitive; treat as non-public in docs if policy requires separate client keys. |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps UI | O | O | O | Public | — | Restrict by HTTP referrer in Google Cloud. |
| `NEXT_PUBLIC_ENABLE_REVIEWS` | Web | O | O | O | Public | `true` | |
| `NEXT_PUBLIC_ENABLE_DRIVER_TRACKING` | Web | O | O | O | Public | `true` | |

## Dangerous / dev-only

| Variable | Scope | Local | Staging | Prod | Notes |
|----------|-------|-------|---------|------|-------|
| `BYPASS_AUTH` | `packages/auth` middleware | O | **Never true** | **Never true** | App **throws at startup** if `NODE_ENV===production` and `BYPASS_AUTH=true`. |

---

## Per-app minimum (production)

| App | Port (local) | Minimum env |
|-----|----------------|------------|
| **web** | 3000 | Supabase URL + anon + service role (for admin API paths), `NEXT_PUBLIC_APP_URL`, Stripe keys + webhook secret, feature flags as needed |
| **chef-admin** | 3001 | Supabase, `NEXT_PUBLIC_APP_URL` (chef origin), Stripe for Connect |
| **ops-admin** | 3002 | Supabase, processor/cron secrets if cron jobs call processors |
| **driver-app** | 3003 | Supabase |

---

## Validation checklist (pre-deploy)

1. No `BYPASS_AUTH=true` in production projects.  
2. `STRIPE_SECRET_KEY` mode (`test` vs `live`) matches environment.  
3. Stripe webhook URL and signing secret match **only** the deployed web URL.  
4. `SUPABASE_SERVICE_ROLE_KEY` never exposed in `NEXT_PUBLIC_*`.  
5. Re-read [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md) for logging and processor rules.
