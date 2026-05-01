# Phase 12 — Changes made

All edits justified by audit evidence (static analysis + successful CI gates before/after).

| File changed | What changed | Why | Evidence |
|--------------|--------------|-----|----------|
| `apps/chef-admin/src/app/api/payouts/setup/route.ts` | Compute `chefPublicBase` from `NEXT_PUBLIC_CHEF_ADMIN_URL` first, then `NEXT_PUBLIC_APP_URL`; strip trailing slash; return **500** with explicit JSON error if neither set; use base for Stripe Connect `refresh_url` / `return_url` | Stripe Connect onboarding must return chefs to **chef-admin** origin (`localhost:3001` per `.env.example`), not customer web (`3000`). Previous code used only `NEXT_PUBLIC_APP_URL`. | `.env.example` lines 24–25; route previously at 77–78; `CLAUDE.md` ports |
| `.env.example` | Comment on `NEXT_PUBLIC_CHEF_ADMIN_URL`; optional section for `UPSTASH_*`, `APP_ENV`, `LOG_LEVEL`, `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED`, load-test vars | Variables referenced in code/health but undocumented | `05_ENV_CONFIG_REVIEW.md`; grep of `process.env` |

**Files not deleted** (per instructions).
