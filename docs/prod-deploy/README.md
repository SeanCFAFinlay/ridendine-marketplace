# Production deploy runbook for the rebuild merge

This folder holds the artifacts you need to apply once before merging
PR #4 (`rebuild/local` → `master`). After these steps complete and the
PR merges, the 4 Vercel projects redeploy from `master` and pick up the
new code. The runbook is split into "must do before merge" and "nice
to do after merge".

## Must do before merge

### 1. Apply the SQL migrations to production Supabase

The new code calls SQL functions that don't exist on prod yet
(`is_platform_staff`, `is_finance_staff`, `is_support_staff`). Without
this step, requests will 500 immediately after deploy.

The migrations are **additive and idempotent**: `ADD COLUMN IF NOT
EXISTS`, `CREATE OR REPLACE FUNCTION`, `DROP POLICY IF EXISTS` +
re-create. No `DROP TABLE`, no destructive UPDATE, no data is lost.

**How to apply:**

1. Open Supabase Studio for the production project:
   <https://supabase.com/dashboard/project/xuxyyxyzaoajajackqtr/sql/new>
2. Copy the entire contents of [`apply-to-prod.sql`](apply-to-prod.sql)
   into the SQL editor.
3. Click **Run**. Expect ~50 lines of `NOTICE` messages — those are the
   `ADD COLUMN IF NOT EXISTS` calls noticing columns that 00012 already
   added. They're not errors.
4. Confirm the verification queries at the bottom return `false`,
   `false`, `false` (the helpers reject NULL uid) and that all three
   function names appear in `pg_proc`.

If anything looks wrong, **stop and don't merge**. Roll back by
dropping the three functions:

```sql
DROP FUNCTION IF EXISTS public.is_platform_staff(uuid);
DROP FUNCTION IF EXISTS public.is_finance_staff(uuid);
DROP FUNCTION IF EXISTS public.is_support_staff(uuid);
```

The `ADD COLUMN IF NOT EXISTS` calls leave no detectable change unless
you actually need to drop columns (which would never be appropriate).

## Should already be done (verify only)

### 2. Vercel env var audit

Should already match this state across all 4 stm-tech projects (we
applied the additions automatically before opening this PR):

| Var | web | chef-admin | ops-admin | driver-app |
|---|:-:|:-:|:-:|:-:|
| NEXT_PUBLIC_SUPABASE_URL | ✓ | ✓ | ✓ | ✓ |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | ✓ | ✓ | ✓ | ✓ |
| SUPABASE_SERVICE_ROLE_KEY | ✓ | ✓ | ✓ | ✓ |
| NEXT_PUBLIC_APP_URL | ✓ | ✓ | ✓ | ✓ |
| NEXT_PUBLIC_CHEF_ADMIN_URL | ✓ (added) | ✓ (added) | ✓ (added) | ✓ (added) |
| NEXT_PUBLIC_OPS_ADMIN_URL | ✓ (added) | ✓ (added) | ✓ (added) | ✓ (added) |
| NEXT_PUBLIC_DRIVER_APP_URL | ✓ (added) | ✓ (added) | ✓ (added) | ✓ (added) |
| NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY | ✓ | — | — | — |
| STRIPE_SECRET_KEY | ✓ | ✓ | ✓ | — |
| STRIPE_WEBHOOK_SECRET | ✓ | — | — | — |
| CRON_SECRET | — | — | ✓ | — |
| ENGINE_PROCESSOR_TOKEN | — | — | ✓ | — |
| BYPASS_AUTH (legacy) | ⚠ leave | ⚠ leave | ⚠ leave | ⚠ leave |

### 3. About `BYPASS_AUTH`

It's set on all 4 projects right now. The current `master` middleware
still reads it; the rebuild branch removes the read entirely (Phase 5).
After merge, the env var becomes dead — Vercel keeps it set but no
code reads it.

**Don't remove `BYPASS_AUTH` before merge.** If its current value is
`true`, removing it would suddenly start enforcing auth on live
ridendine.ca pages that were bypassing it. After merge, both removing
it and leaving it are equivalent.

## Optional / nice to do after merge

| Var | Apps | Why |
|---|---|---|
| RESEND_API_KEY | web, chef-admin | Real email delivery (otherwise DB-only notifications) |
| TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER | ops-admin | Real SMS delivery |
| NEXT_PUBLIC_SENTRY_DSN | all 4 | Production error tracking |
| SENTRY_AUTH_TOKEN | all 4 | Sentry source map upload at build time |

All four are read with graceful no-op fallback — apps don't crash if
they're unset, they just skip the corresponding integration.

## Rollback plan if something breaks after merge

```bash
# Code rollback (preferred, safe, instant)
gh pr revert 4
git pull origin master
# Or click "Redeploy" on the previous successful deploy in each Vercel
# project's deployment list.

# DB rollback (only if needed — usually you don't)
# Migrations are additive; the only undo-able artifact is the three
# new functions. Drop them as shown above. The ADD COLUMN IF NOT
# EXISTS calls don't need to be undone.
```

The `pre-rebuild-snapshot` git tag points at master's HEAD before any
of this work and is the nuclear option for `git reset --hard`.
