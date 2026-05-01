# Phase 8 — Frontend review

## Build-time signal

- **`pnpm run build`** completed for **web**, **chef-admin**, **ops-admin**, **driver-app** with Next.js 14.2.35 — indicates no compile errors in pages/layouts for production bundle.

## Lint coverage caveat

- ESLint runs on **explicit subsets** per app (see each app’s `package.json` `lint` script). Files outside those globs are **not** proven clean.

## Test-derived observations (non-blocking)

| Screen / component | File | Issue | Data source | Fix |
|--------------------|------|-------|-------------|-----|
| Ops alerts | `apps/ops-admin/src/components/ops-alerts.tsx` | React `act()` warnings in tests | Fetch-based alerts | Wrap async updates in tests or defer fetch in test env |
| Forgot password | `apps/web/src/app/auth/forgot-password/page.tsx` | React `act()` warnings | Supabase `resetPassword` | Test harness adjustment |

These are **test ergonomics / warnings**, not production crash logs.

## Checkout

- `apps/web/src/app/checkout/page.tsx` uses `loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)` — non-null assertion; if env missing, runtime failure possible. **Mitigation:** ensure `.env.local` per `.env.example`.

## Hydration / mobile / dashboards

- No hydration errors surfaced in **build** output.
- Per-screen UX audit was **not** performed (would require browser session).

## Broken screens table

| Screen | File | Issue | Data source | Fix |
|--------|------|-------|-------------|-----|
| — | — | No compile-time broken screen identified | — | — |

**Residual:** Stripe Connect onboarding URLs for chef payouts — server-side URL bug documented in `09_ROOT_CAUSE_REPORT.md` (not a React rendering bug).
