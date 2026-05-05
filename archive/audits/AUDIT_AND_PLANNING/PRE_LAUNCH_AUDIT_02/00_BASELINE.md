# Pre-Launch Audit 02 — Baseline (Phase 0)

| Field | Value |
|--------|--------|
| **Audit run** | Pre-Launch Audit 02 |
| **Date/time (UTC)** | 2026-05-01 (session; local wall clock aligned with command logs) |
| **Branch** | `master` |
| **Commit SHA (HEAD)** | `48447a9036937f02c60f331e25cdb5c95e9760ac` |
| **Package manager** | `pnpm@9.15.0` (from root `package.json`) |
| **Node engines** | `>=20.0.0` |

## Workspace packages (Turbo scope)

Apps: `@ridendine/web`, `@ridendine/chef-admin`, `@ridendine/ops-admin`, `@ridendine/driver-app`  
Packages: `@ridendine/auth`, `@ridendine/db`, `@ridendine/engine`, `@ridendine/notifications`, `@ridendine/types`, `@ridendine/ui`, `@ridendine/utils`, `@ridendine/validation`, `@ridendine/config`

## Root scripts (`package.json`)

| Script | Purpose |
|--------|---------|
| `pnpm dev` | `turbo dev` — all apps |
| `pnpm dev:web` / `dev:chef` / `dev:ops` / `dev:driver` | Single-app dev |
| `pnpm build` | `turbo build` |
| `pnpm lint` | `turbo lint` |
| `pnpm typecheck` | `turbo typecheck` |
| `pnpm test` | `pnpm -r --if-present test` |
| `pnpm format` / `format:check` | Prettier |
| `pnpm db:generate` / `db:migrate` / `db:seed` / `db:reset` | Supabase |
| `pnpm verify:prod-data-hygiene` | CI guard: no seed in workflows |

## Environment files present (names only — no values)

- `.env.example`, `.env`, `.env.local`, `.env.vercel`
- `apps/web/.env.local`, `apps/chef-admin/.env.local`, `apps/ops-admin/.env.local`, `apps/driver-app/.env.local`

## Git working tree (not discarded)

**State:** Large mixed modification set — many tracked files under `apps/`, `packages/`, `docs/`, `supabase/migrations/`, plus **untracked** `AUDIT_AND_PLANNING/`, `docs/*.md` additions, `graphify-out/`, new migrations `00015`/`00016`, new engine/db utilities, etc.

**Implication:** HEAD SHA does not represent the full working tree. Release tagging should capture **actual** merge commit after commit/stash discipline. `git diff --stat` reported ~139 files changed in the session snapshot.

## Top-level tree map

| Area | Path |
|------|------|
| Apps | `apps/web`, `apps/chef-admin`, `apps/ops-admin`, `apps/driver-app` |
| Packages | `packages/*` |
| Docs | `docs/` |
| DB | `supabase/migrations/`, `supabase/seeds/` |
| CI | `.github/workflows/ci.yml` |
| Scripts | `scripts/` |
| Tests | Per-package `**/*.test.ts`, `apps/web/__tests__/`, `apps/ops-admin/src/**/__tests__/` |
| Engine “e2e” | `packages/engine/src/e2e/*.ts` (Vitest-style, not Playwright) |

## Code changes during this audit

**None.** This session only added/updated files under `AUDIT_AND_PLANNING/PRE_LAUNCH_AUDIT_02/` for reporting.
