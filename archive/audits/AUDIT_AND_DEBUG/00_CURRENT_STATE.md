# Phase 0–1 — Current state and discovery

**Generated:** 2026-05-01  
**Workspace:** `C:\Users\sean\RIDENDINEV1`  
**Git branch:** `ridendine-prelaunch-repair-checkpoint` (clean working tree, synced with origin)

## Phase 0 safety snapshot

| Item | Value |
|------|--------|
| Working directory | `C:\Users\sean\RIDENDINEV1` |
| Package manager | `pnpm@9.15.0` (from root `package.json`) |
| Node engines | `>=20.0.0` |
| `node_modules` | Present at repo root |

## Framework and stack (evidence)

| Layer | Technology |
|-------|------------|
| Monorepo | Turborepo (`turbo.json`, `pnpm-workspace.yaml`) |
| Apps | Four **Next.js 14** apps (`apps/web`, `apps/chef-admin`, `apps/ops-admin`, `apps/driver-app`) |
| UI | React 18 |
| Database | **Supabase** (PostgreSQL), migrations under `supabase/migrations/` |
| Data access | `@ridendine/db` package |
| Validation | `@ridendine/validation` (Zod) |
| Testing | Vitest (packages), Jest (apps), Playwright (e2e) |

**Evidence:** Root `package.json` scripts and `CLAUDE.md`; `pnpm run build` output shows Next.js 14.2.35 for all four apps.

## Entry points and ports (from docs + package scripts)

| App | Script | Documented port |
|-----|--------|-------------------|
| Customer marketplace | `pnpm dev:web` | 3000 |
| Chef dashboard | `pnpm dev:chef` | 3001 |
| Ops admin | `pnpm dev:ops` | 3002 |
| Driver PWA | `pnpm dev:driver` | 3003 |

## Root scripts (verbatim roles)

- `dev` — `turbo dev` (all apps)
- `build` — `turbo build`
- `lint` — `turbo lint`
- `typecheck` — `turbo typecheck`
- `test` — `pnpm -r --if-present test`
- `db:*` — Supabase CLI (`db:generate`, `db:migrate`, `db:seed`, `db:reset`)

## Runtime requirements

| Requirement | Notes |
|-------------|--------|
| Node | ≥ 20 |
| pnpm | 9.x (packageManager field) |
| Supabase | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`; server/admin paths need `SUPABASE_SERVICE_ROLE_KEY` |
| Stripe | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (checkout) |
| Optional | Sentry DSN, Resend, Upstash Redis (rate limiting in prod), `ENGINE_PROCESSOR_TOKEN` / `CRON_SECRET` for processors |

Canonical env matrix: `docs/ENVIRONMENT_VARIABLES.md` (referenced from `.env.example`).

## Graphify / architecture note

`graphify-out/GRAPH_REPORT.md` exists but is **empty** in this workspace snapshot; no god-node summary was available from that file.

## Repository layout (high level)

- `apps/*` — Next.js applications  
- `packages/*` — shared libraries (`db`, `auth`, `ui`, `engine`, `validation`, etc.)  
- `supabase/migrations` — 19 SQL migration files observed  
- `docs/` — platform and runbook documentation  
- `e2e/` — Playwright / lifecycle tests  
- Existing audit-style folders: `AUDIT_AND_PLANNING/`, `audit/` (this session adds **`AUDIT_AND_DEBUG/`** without deleting prior material)
