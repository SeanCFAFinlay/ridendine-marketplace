# 21 - Environment, Config, Secrets, and Dependency Audit

**Audit Date**: 2026-04-23
**Verdict**: Several security concerns. Env management needs hardening.

---

## Environment File Inventory

| File | Location | Status | Risk |
|------|----------|--------|------|
| `.env` | Repo root | EXISTS - may contain real secrets | HIGH |
| `.env.local` | Repo root | EXISTS | Medium |
| `.env.vercel` | Repo root | EXISTS | Medium |
| `.env.example` | Repo root | Should exist as template | Check |
| `.gitignore` | Repo root | Must exclude `.env` and `.env.local` | Verify |

**CRITICAL**: The `.env` file at the repo root is potentially committed to git. Run the following immediately:

```bash
git log --all --full-history -- .env
git show HEAD:.env  # Check if it's tracked
git status .env     # Is it currently staged?
```

If `.env` is tracked by git, rotate all secrets immediately (Supabase service role key, Stripe secret key, all webhook secrets).

---

## Required Environment Variables

All four apps share the same environment variables via root-level `.env` files and Turborepo's env propagation.

### Supabase (Required - All Apps)

| Variable | Type | Notes |
|----------|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Supabase anon key (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret | Full DB access - never expose client-side |
| `DATABASE_URL` | Secret | Direct PostgreSQL connection string |

**Risk**: `SUPABASE_SERVICE_ROLE_KEY` must never appear in any `NEXT_PUBLIC_*` variable or client-side bundle. Verify with:
```bash
grep -r "SUPABASE_SERVICE_ROLE_KEY" apps/*/src/app --include="*.tsx" --include="*.ts"
```
Any hits in client components (not route handlers) are a security breach.

### Stripe (Required - web, ops-admin)

| Variable | Type | Notes |
|----------|------|-------|
| `STRIPE_SECRET_KEY` | Secret | Used server-side only for payment intents and refunds |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Public | Used client-side for Stripe.js |
| `STRIPE_WEBHOOK_SECRET` | Secret | Validates incoming webhook signatures |

**Risk**: `STRIPE_SECRET_KEY` must never appear in client-side code. Stripe webhook secret must be used to validate every incoming webhook - failure to validate allows spoofed webhooks that could trigger fraudulent order completions.

Verify webhook validation is in place:
```typescript
// apps/web/src/app/api/webhooks/stripe/route.ts
const event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!)
// If this line is missing or bypassed, webhooks are unauthenticated
```

### App URLs (Required - All Apps)

| Variable | Type | Notes |
|----------|------|-------|
| `NEXT_PUBLIC_APP_URL` | Public | Base URL for web (customer) app |
| `NEXT_PUBLIC_CHEF_APP_URL` | Public | Base URL for chef-admin app |
| `NEXT_PUBLIC_OPS_APP_URL` | Public | Base URL for ops-admin app |
| `NEXT_PUBLIC_DRIVER_APP_URL` | Public | Base URL for driver-app |

These are used for cross-app redirects and CORS configuration.

### Security (Required - All Apps)

| Variable | Type | Notes |
|----------|------|-------|
| `BYPASS_AUTH` | Secret | MUST BE REMOVED - see Risk R1 |

**Action**: Remove this variable entirely from all env files and all code references.

---

## Optional Environment Variables

### Email (Optional - Will Become Required)

| Variable | Type | Notes |
|----------|------|-------|
| `RESEND_API_KEY` | Secret | Currently commented out in env files. Required once email sending is wired. |

### Maps (Optional)

| Variable | Type | Notes |
|----------|------|-------|
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Public | Currently commented out. Required for driver navigation and address autocomplete. |

### Feature Flags

| Variable | Type | Current Value | Notes |
|----------|------|--------------|-------|
| `NEXT_PUBLIC_ENABLE_REVIEWS` | Public | Unknown | Toggles review system |
| `NEXT_PUBLIC_ENABLE_DRIVER_TRACKING` | Public | Unknown | Toggles real-time driver tracking UI |

**Issue**: Feature flags are read-only at build time (baked into the Next.js bundle via `NEXT_PUBLIC_*`). Changing them requires a redeploy. Consider moving to a runtime feature flag system (LaunchDarkly, Unleash, or a simple DB-backed table) for production.

---

## Environment Sharing Model

All apps consume env vars from the same root `.env` files. This means:

- All 4 apps have access to `SUPABASE_SERVICE_ROLE_KEY` (appropriate - all are server-side apps)
- All 4 apps have access to `STRIPE_SECRET_KEY` (partially inappropriate - driver-app does not process payments)
- All 4 apps have access to `STRIPE_WEBHOOK_SECRET` (inappropriate - only web needs this)

**Recommendation**: In production, scope env vars per app. Most hosting platforms (Vercel, Railway) support per-service env vars. This is a defense-in-depth measure.

---

## Secrets Rotation Checklist

If any secret may have been exposed (via git history, logs, or env file leakage):

| Secret | Rotation Steps |
|--------|---------------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Settings → API → Regenerate service role key |
| `SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API → Regenerate anon key |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys → Roll key |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard → Developers → Webhooks → Roll signing secret |
| `DATABASE_URL` | Supabase Dashboard → Settings → Database → Reset database password |
| `RESEND_API_KEY` | Resend Dashboard → API Keys → Delete and recreate |

---

## Dependency Audit

### Node Version

| Concern | Status |
|---------|--------|
| Node version specified | Check `.nvmrc` or `engines` in `package.json` |
| Node version consistency across apps | All apps use same Turborepo, so consistent |

**Action**: Add `"engines": { "node": ">=20.0.0" }` to root `package.json` if missing.

### Key Dependencies

| Package | Version | Concern |
|---------|---------|---------|
| `next` | 14.x | Check for patch updates - Next.js 14 had security patches |
| `@supabase/supabase-js` | Check | Supabase client has had breaking changes between minor versions |
| `stripe` | Check | Pin to major version; Stripe API versions matter |
| `zod` | Check | Should be same version across all packages |
| `react` / `react-dom` | 18.x | Check for 18.3.x updates |

### Monorepo Dependency Consistency

With pnpm workspaces, dependency versions should be consistent across packages. Check for version mismatches:

```bash
pnpm why react
pnpm why zod
pnpm why @supabase/supabase-js
```

Any package with multiple versions installed can cause subtle bugs when types from one version are incompatible with another.

### Lock File

**Action**: Ensure `pnpm-lock.yaml` is committed to the repository. This locks exact dependency versions for reproducible builds. Never add it to `.gitignore`.

---

## Environment Validation at Startup

Currently, no environment variable validation runs at app startup. Missing env vars cause runtime failures deep in request handling rather than failing fast at boot.

**Recommendation**: Add env validation using Zod in each app's `src/env.ts`:

```typescript
// apps/web/src/env.ts
import { z } from 'zod'

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().startsWith('pk_'),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith('whsec_'),
})

export const env = envSchema.parse(process.env)
```

This causes the app to fail at build time (or cold start) with a clear error if any required env var is missing or malformed.

---

## CI/CD Environment Security

When CI/CD is added (see `19-priority-fix-roadmap.md` item 15):

- Store all secrets in GitHub Actions Secrets (not in workflow files)
- Use separate Stripe test mode keys for CI (never production keys)
- Use a separate Supabase project for CI testing
- Never log env var values in CI output
- Use OIDC-based authentication to cloud providers where possible (eliminates long-lived credentials)

---

## Gitignore Verification

The following must be in `.gitignore`:

```
# Environment files - must be present
.env
.env.local
.env.*.local
.env.vercel
.env.production

# NOT ignored - should be committed
.env.example
```

Verify current state:
```bash
git check-ignore -v .env
git check-ignore -v .env.local
```

If these commands return nothing, the files are NOT gitignored and may be committed to the repository.

---

## Summary of Actions

| Priority | Action | Risk Mitigated |
|----------|--------|---------------|
| Immediate | Check if `.env` is tracked by git | Data breach |
| Immediate | Rotate any potentially exposed secrets | Data breach |
| Immediate | Remove BYPASS_AUTH from all env files and code | R1 - Auth bypass |
| Week 1 | Add env validation (Zod) at startup | Runtime failures |
| Week 1 | Add RESEND_API_KEY to env vars and docs | Needed for R10 fix |
| Week 1 | Add `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to docs | Driver app completeness |
| Week 2 | Scope env vars per app in deployment config | Defense in depth |
| Week 2 | Move feature flags to runtime system | Operational flexibility |
| Week 3 | Audit and update stale dependencies | Security patches |
| CI/CD | Use test-mode keys in CI, never production | Financial safety |

---

## Related Files

- `18-risk-register.md` - R1 (BYPASS_AUTH), R6 (rate limiting)
- `19-priority-fix-roadmap.md` - Items 1, 5 address security env issues
