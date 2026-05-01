# Phase 7 — Database and state review

## Stack

- **PostgreSQL** via **Supabase**
- **Migrations:** `supabase/migrations/` — **19** `.sql` files observed (including phased security/checkout migrations)
- **ORM:** Supabase JS clients in `@ridendine/db` (`browser.ts`, `server.ts`, `admin.ts`)
- **RLS:** Policies established in migrations (`*_rls*.sql`, hardening migrations dated 20260501 / phase B)

## Package `@ridendine/db`

| Area | Evidence |
|------|----------|
| Client factories | Read `NEXT_PUBLIC_SUPABASE_*` from env |
| Admin client | `SUPABASE_SERVICE_ROLE_KEY` |
| Tests | Vitest — `admin.test.ts`, repositories, realtime |

## Schema alignment

- Single canonical schema referenced across apps (`CLAUDE.md`: chef storefronts as primary listing entity).
- Specific column/table mismatches were **not** flagged because **`pnpm run build` + `pnpm run test` passed**, including DB package tests.

## Operational flags

- Web **`/api/health`** references **`CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED`** — ties deployment health to DB migration state (`00018_phase_c_checkout_idempotency.sql` exists).

## Risks (documentation level)

| Risk | Severity | Mitigation |
|------|----------|------------|
| Local dev without running migrations | High for features needing new tables | Run `pnpm db:migrate` / Supabase CLI per runbook |
| RLS misconfiguration | Security | Already addressed in dedicated migrations; verify on staging |

## Read/write paths

- Customer orders/checkout → `apps/web` API → `@ridendine/db` / `@ridendine/engine`
- Chef operations → `apps/chef-admin` API
- Ops/engine → `apps/ops-admin` + engine processors

**Limitation:** Live reads/writes against a remote project were not executed in this session (would require credentials and network policy).
