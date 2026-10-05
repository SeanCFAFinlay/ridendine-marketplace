# 12 — Configuration, Environments and Secrets

**No secret value appears in this document.** Where a secret was found, only its location, type and remediation urgency are recorded.

---

## 1. Configuration dictionary

Compiled from `.env.example`, `turbo.json: build.env`, a full `process.env.*` census across `apps/*/src`, `packages/*/src`, `scripts/`, `next.config.js` and `sentry.*.config.ts`, and `.github/workflows/`.

### 1.1 Required — the system does not work without these

| Key | Purpose | Source | Envs | Default | Sensitive | Consumers | Failure if missing |
|---|---|---|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project endpoint | Vercel / `.env.local` | all | none | No (public) | all apps, middleware, all clients (18 sites) | `createAdminClient()` throws on first request |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public key, RLS-enforced | Vercel | all | none | No (public) | browser + middleware clients (7) | Middleware auth fails |
| `SUPABASE_SERVICE_ROLE_KEY` | **Full DB access, bypasses RLS** | Vercel | all | none | **CRITICAL** | `createAdminClient`, `apps/web` middleware maintenance lookup (9) | Every privileged route 500s |
| `STRIPE_SECRET_KEY` | Stripe server API | Vercel | all | none | **CRITICAL** | checkout, webhooks, payouts, refunds, Connect (33 sites) | `PAYMENT_CONFIG_ERROR` |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe.js init | Vercel | all | none | No (public) | checkout client (4) | Card form cannot render |
| `STRIPE_WEBHOOK_SECRET` | Verify `payment_intent.*` | Vercel (web) | all | none | **CRITICAL** | `apps/web` webhook (8) | Webhook 400s; **paid orders never reach the kitchen** |
| `CRON_SECRET` | Vercel Cron bearer | Vercel (ops) | all | none | **HIGH** | `validateEngineProcessorHeaders` (8) | Processors 401 (fails closed — correct) |
| `NEXT_PUBLIC_APP_URL` | Customer base URL | Vercel | all | `http://localhost:3000` | No | cross-app links, Stripe return URLs (11) | Broken links, broken Connect returns |

### 1.2 Conditionally required

| Key | Purpose | Required when | Sensitive | Failure if missing |
|---|---|---|---|---|
| `STRIPE_WEBHOOK_SECRET_OPS` | Verify finance webhook | The ops webhook endpoint is registered at Stripe | **CRITICAL** | Falls back to `STRIPE_WEBHOOK_SECRET`; throws if both absent |
| `ENGINE_PROCESSOR_TOKEN` | Alternative processor auth (`x-processor-token`) | Manual/external triggering | **HIGH** | Only `CRON_SECRET` works |
| `PARTNER_API_KEY` | Legacy shared partner key | Legacy partners still in flight | **HIGH** | DB-backed keys still work; fails closed if <16 chars |
| `NEXT_PUBLIC_CHEF_ADMIN_URL` | Chef portal links + Connect return URLs | Always in practice | No | `getChefPortalSignupUrl()` returns `''` — dead CTAs |
| `NEXT_PUBLIC_DRIVER_APP_URL` | Cross-app link | Always in practice | No | Dead link |
| `DATABASE_URL` | Direct Postgres for migrations/scripts | Migrations, `db:generate`, audit scripts | **CRITICAL** | Migrations cannot run |
| `STRIPE_TEST_SECRET_KEY` | Partner test-mode PaymentIntents | Any partner key has `test_mode` | **HIGH** | **503 `STRIPE_TEST_MODE_UNAVAILABLE` — never a silent live-key fallback** |
| `NEXT_PUBLIC_STRIPE_TEST_PUBLISHABLE_KEY` | Confirm test `clientSecret` | With the above | No | Test cards cannot be confirmed |
| `STRIPE_WEBHOOK_SECRET_TEST` | Verify test-mode events | With the above | **CRITICAL** | Test payments never marked paid |

### 1.3 Optional — graceful degradation

| Key | Purpose | Behaviour when unset |
|---|---|---|
| `RESEND_API_KEY` | Email | Provider inert → DB notifications only |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | SMS | Provider inert → DB notifications only |
| `UPSTASH_REDIS_REST_URL` / `_TOKEN` | Distributed rate limiting | **Per-instance memory + `degraded` flag** |
| `NEXT_PUBLIC_SENTRY_DSN` | Error monitoring | **No effect either way — Sentry is not wired (R-03)** |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Push subscription | Subscribe button inert. **Nothing sends pushes regardless.** |
| `HEALTH_CHECK_TOKEN` | Full health payload via `x-health-token` | Health returns the minimal payload only |
| `NEXT_PUBLIC_CHEF_PORTAL_SIGNUP_URL` | Override chef signup CTA | Derived from `NEXT_PUBLIC_CHEF_ADMIN_URL` + `/auth/signup` |
| `APP_ENV`, `LOG_LEVEL` | Deployment labels | Defaults |
| `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED` | Migration feature flag | Default path |
| `VERCEL_ENV`, `VERCEL_URL`, `VERCEL_GIT_COMMIT_SHA` | Injected by Vercel | Local defaults |

### 1.4 Dangerous — must be false or unset in production

| Key | Effect | Production guard | Verdict |
|---|---|---|---|
| `ALLOW_DEV_AUTOLOGIN` | **Bypasses authentication entirely in the middleware** | `process.env.NODE_ENV !== 'production' && ALLOW_DEV_AUTOLOGIN === 'true'` — **both** required | ✅ Correctly guarded |
| `E2E_FIXTURE_RESET_ENABLED` | Enables `POST /api/fixtures/reset`, which deletes fixture orders | `NODE_ENV !== 'production'` **and** the flag **and** the `team_manage` capability | ✅ Triple-guarded |
| `INTERNAL_COMMAND_CENTER_ENABLED` | Exposes `/internal/command-center` and its docs reader in production | Flag only — no capability check on the docs route | ⚠️ See UI-06 |
| `STRIPE_ALLOW_TEST_IN_PRODUCTION` | Permits an `sk_test_` key while `NODE_ENV=production` | Explicit opt-in; comment says "staging/smoke only — never enable on real prod" | ⚠️ Documented, unenforced |
| `BOOTSTRAP_SUPER_ADMIN_PASSWORD` | Creates a super-admin | Script-only (`scripts/bootstrap-super-admin.mjs`) | ⚠️ Rotate after use |
| `RIDENDINE_SMOKE_EMAIL` / `_PASSWORD` | Live smoke-test credentials against **production** | GitHub secrets | ⚠️ A real production account with a stored password |

### 1.5 Load-test and tooling

`LOAD_BASE_URL`, `LOAD_ITERATIONS`, `LOAD_CONCURRENCY`, `OPS_ADMIN_URL`, `UI_BLUEPRINT_BASE_URL`, `RIDENDINE_OBSIDIAN_VAULT`, `NEXT_PUBLIC_SITE_URL`, `GITHUB_SHA`, `NODE_ENV`.

## 2. Precedence

```
process defaults in code
  → scripts/load-root-env.cjs: loadRootEnv(__dirname)   ← called from every next.config.js
    → per-app .env.local
      → repository-root .env / .env.local
        → shell environment
          → Vercel project environment variables (production authority)
```

`loadRootEnv` is invoked at the top of all four `next.config.js` files, which is how a single root `.env.local` reaches four separate Next.js apps in development. On Vercel, the platform's own environment variables take precedence and no `.env` file is deployed (`.vercelignore`, `.gitignore`).

`turbo.json: build.env` declares 16 variables as part of the build cache key. **`DATABASE_URL`, `PARTNER_API_KEY`, `RESEND_API_KEY`, `TWILIO_*`, `UPSTASH_*`, `HEALTH_CHECK_TOKEN`, `INTERNAL_COMMAND_CENTER_ENABLED` and the three `STRIPE_*_TEST` variables are absent from that list.** A change to any of them does not invalidate the Turbo build cache. For runtime-read variables this is harmless; for anything inlined at build time it would serve a stale value. Flagged C-09.

## 3. Environment matrix

| Environment | Where | Database | Stripe | Cron | Notes |
|---|---|---|---|---|---|
| **Local dev** | `pnpm dev`, ports 3000–3003 | Supabase local (API 54321, DB 54322, Studio 54323, mail 54324) | test keys | `pnpm local-cron` (**POST**) | `ALLOW_DEV_AUTOLOGIN` available |
| **CI** | GitHub Actions | none — placeholder env values | `sk_test_placeholder` | none | `verify:prod-data-hygiene` blocks any seed/reset against a non-local stack |
| **CI e2e** | GitHub Actions | runner-local Supabase (Docker) | test | none | The only workflow allowed to seed/reset, gated by the `# prod-data-hygiene: allow-local-supabase` marker **and** an actual `supabase start` |
| **Preview** | Vercel preview | UNKNOWN — likely shares production | UNKNOWN | **Vercel Cron does not run on preview deployments** | U-06 |
| **Production** | Vercel, 4 projects | Supabase cloud | live keys | 3 crons on ops-admin (**GET** — R-01) | |

**A significant unknown:** nothing in the repository states whether preview deployments point at the production database. If they do, a preview build could write production data. Flagged U-06.

## 4. Configuration drift

| ID | Finding | Status |
|---|---|---|
| C-01 | **Documented but unused:** `NEXT_PUBLIC_WEB_URL` and `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` appear in `.env.example` but are read nowhere in the codebase. | VERIFIED |
| C-02 | **Used but undocumented:** `HEALTH_CHECK_TOKEN` (gates the full health payload in `apps/web`) and `NEXT_PUBLIC_SITE_URL` (`scripts/bootstrap-super-admin.mjs`) are read by code and absent from `.env.example`. | VERIFIED |
| C-03 | **Naming inconsistency:** `NEXT_PUBLIC_APP_URL` means the customer app, but `.env.example` also offers `NEXT_PUBLIC_WEB_URL` "for cross-app links (defaults to NEXT_PUBLIC_APP_URL semantics)" — a second name for the same concept that nothing reads. | VERIFIED |
| C-04 | **Unsafe default (documentation):** `.env.example` ships `CRON_SECRET=` empty. With `ENGINE_PROCESSOR_TOKEN` also empty, `validateEngineProcessorHeaders` returns `false` for everything — which fails closed and is therefore *safe*, but silently makes every processor unreachable in a fresh environment. | VERIFIED |
| C-05 | **Hard-coded environment values in source:** `https://ridendine.com` in `referral-dashboard.tsx` (R-05); `ridendine.com/chefs/{slug}` in `storefront-form.tsx`; the four production domains baked into `scripts/smoke/runtime-contracts.cjs` (acceptable — they are overridable by workflow vars). | VERIFIED |
| C-06 | **Late reads:** `createAdminClient()` reads its variables on first call, not at boot. A missing variable surfaces as a runtime 500, not a startup failure. | VERIFIED |
| C-07 | **Config that changes authorization:** `ALLOW_DEV_AUTOLOGIN`, `INTERNAL_COMMAND_CENTER_ENABLED`, `E2E_FIXTURE_RESET_ENABLED`, `STRIPE_ALLOW_TEST_IN_PRODUCTION`, `PARTNER_API_KEY`. All are guarded; `INTERNAL_COMMAND_CENTER_ENABLED` is the weakest (UI-06). | VERIFIED |
| C-08 | **Production behaviour depending on a developer-local file:** `loadRootEnv` reads the repository root in development only; Vercel supplies variables directly. No production path depends on a local file. | VERIFIED — **no issue** |
| C-09 | **Incomplete Turbo cache key:** 10+ build-relevant variables are missing from `turbo.json: build.env`. | VERIFIED |
| C-10 | `/api/engine/health` `envReadiness()` checks 7 variables and omits `PARTNER_API_KEY`, `UPSTASH_*`, `RESEND_API_KEY`, `TWILIO_*` and `STRIPE_WEBHOOK_SECRET_OPS` — so a deployment can report "ready" while messaging and distributed rate limiting are both off. | VERIFIED |

## 5. Secret exposure — locations only, no values

| # | Location | Secret type | In Git? | Urgency | Remediation |
|---|---|---|---|---|---|
| **S-01** | `.env.local` at the repository root | **Live PostgreSQL connection string for a hosted Supabase project, including the password, pointing at an `aws-1-us-east-1` pooler** | **No** — untracked, matched by `.gitignore: .env.local` and `.env*.local`; `git ls-files` confirms it is unknown to Git | **HIGH** | Treat this credential as exposed to anything with read access to this machine (including every local agent, backup and sync tool). **Rotate the database password**, then keep the value only in a secret manager or Vercel's environment settings. Do not leave a production credential in a developer working tree. |
| S-02 | GitHub repository secrets `RIDENDINE_SMOKE_EMAIL` / `RIDENDINE_SMOKE_PASSWORD` | Live production account credentials, used by `post-deploy-smoke.yml` every 6 hours | No — GitHub secret store | MEDIUM | Correct storage. Ensure the account is least-privileged and its actions are distinguishable in the audit log. |
| S-03 | `BOOTSTRAP_SUPER_ADMIN_PASSWORD` | Super-admin bootstrap password read from the environment | No | MEDIUM | Rotate immediately after each bootstrap. |
| S-04 | `docs/partner-integration/**/partner-vercel.env`, `*-vercel.env` | Partner secrets in handoff files | No — explicitly gitignored | LOW | The `.gitignore` entries show this was anticipated. Good. |
| S-05 | `.env.example` | **No real values.** Every entry is a placeholder. | Yes (intentionally) | NONE | Correct. |

**Positive findings on secret handling:**
- `.gitignore` covers `.env`, `.env.local`, `.env.*`, `*.pem`, `*.key`, `*-vercel.env`, and even a legacy `TEST_CREDENTIALS.md` filename kept listed so an accidental re-paste is blocked.
- Partner API keys are stored as **SHA-256 hashes**, never plaintext, and compared with a constant-time path for the legacy key.
- `packages/utils/src/redact-sensitive.ts` is applied on webhook and error log paths (`redactSensitiveForLog`).
- No secret value was found in any tracked file during this analysis.

## 6. Deployment configuration

All four `vercel.json` files are identical apart from the crons:

```json
{ "framework": "nextjs",
  "installCommand": "cd ../.. && pnpm install --frozen-lockfile",
  "buildCommand": "pnpm build" }
```

Security headers are set in each `next.config.js` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, HSTS `max-age=63072000; includeSubDomains; preload`, `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`, `poweredByHeader: false`). CSP is set **per request** in `apps/web/src/middleware.ts` so it can carry a nonce.

**`eslint: { ignoreDuringBuilds: true }` in `next.config.js`** — lint never blocks a Vercel build. CI runs `pnpm lint` separately, but a direct Vercel deploy from a branch bypasses that.
