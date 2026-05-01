# Phase 4 — Dependency review

**Evidence:** Root `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, per-package `package.json` files, `turbo.json`, `packages/config/*`.

## Package manager and workspace

- **pnpm** workspaces — `pnpm-workspace.yaml` includes `apps/*`, `packages/*`
- Lockfile: **`pnpm-lock.yaml`** present (do not remove packages in this audit phase per instructions)

## Root dependencies

| Dependency | Role |
|------------|------|
| `next`, `react`, `react-dom` | Shared baseline at root |
| `@sentry/nextjs` | Error reporting |
| `turbo` | Monorepo orchestration |
| TypeScript 5.6, ESLint 9 | Tooling |

## Per-package highlights

- **`@ridendine/db`**: Supabase clients, Vitest for repository/realtime tests  
- **`@ridendine/engine`**: Domain orchestration, heavy Vitest coverage  
- **`@ridendine/auth`**: Middleware utilities  
- Apps depend on workspace packages via `workspace:*` patterns (see individual `package.json` files)

## TypeScript / ESLint / Tailwind

- Shared configs live under **`packages/config/`** (`eslint.config.js`, TS bases, Tailwind presets referenced by apps)
- Apps use app-specific `tsconfig.json` / `tsconfig.typecheck.json` where present (e.g. ops-admin, web)

## Turbo pipeline env

`turbo.json` declares `build` `env` allowlist including:

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `ENGINE_PROCESSOR_TOKEN`, `CRON_SECRET`

Vars such as `UPSTASH_REDIS_REST_*`, `CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED`, `LOG_LEVEL`, `APP_ENV` are **used in code** but are **not** in turbo’s build env list — acceptable if inlined at build only where needed; document in env review.

## Findings (no removal performed)

| Finding | Severity | Evidence |
|---------|----------|----------|
| Lint scope is **subset** of each app (explicit paths in package lint scripts) | Medium | Unscoped files may have undetected lint issues |
| Vite CJS deprecation warning in `@ridendine/db` tests | Low | Vitest/Vite upgrade path |
| No missing lockfile | — | `pnpm-lock.yaml` tracked |

## Scripts pointing at missing files

- None identified during this audit; **`pnpm run build` succeeded**, which strongly suggests primary compile graphs resolve.

**Recommendation (future):** Optionally widen ESLint globs or use repo-wide lint incrementally; out of scope unless lint failures appear.
