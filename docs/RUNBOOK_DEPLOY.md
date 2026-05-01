# Deployment runbook — Ridendine

**Scope:** Procedures and checks only. This document does **not** perform deploys or migrations.

Cross-references: [`docs/ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md), [`docs/QA_TESTING_PLAN.md`](QA_TESTING_PLAN.md), [`docs/BACKUP_AND_ROLLBACK.md`](BACKUP_AND_ROLLBACK.md), [`docs/HEALTHCHECKS_AND_MONITORING.md`](HEALTHCHECKS_AND_MONITORING.md).

---

## 1. What gets deployed

| Surface | App package | Typical host | Local port |
|---------|-------------|--------------|------------|
| Customer marketplace | `@ridendine/web` | Vercel project | 3000 |
| Chef dashboard | `@ridendine/chef-admin` | Vercel project | 3001 |
| Ops admin | `@ridendine/ops-admin` | Vercel project | 3002 |
| Driver PWA | `@ridendine/driver-app` | Vercel project | 3003 |
| Database | Supabase Postgres | Supabase project | — |

Monorepo root: `pnpm-workspace.yaml` includes `apps/*` and `packages/*`. Builds are orchestrated by **Turborepo** (`turbo.json`).

---

## 2. Local pre-checks (before any deploy)

1. `pnpm install --frozen-lockfile`  
2. `pnpm verify:prod-data-hygiene` (CI parity)  
3. `pnpm typecheck`  
4. `pnpm lint`  
5. `pnpm test` (or package-scoped tests per [`docs/QA_TESTING_PLAN.md`](QA_TESTING_PLAN.md))  
6. Confirm branch matches release policy (e.g. `main` / `master` only for production).  
7. Confirm **no** production database seed or reset in pipelines ([`docs/PRODUCTION_DATA_INTEGRITY.md`](PRODUCTION_DATA_INTEGRITY.md) if present).

---

## 3. CI requirements

GitHub Actions: `.github/workflows/ci.yml` — install, hygiene, typecheck, lint, package tests, build. **Merge only when CI is green** unless an explicit waiver is recorded.

---

## 4. Build commands

| Goal | Command |
|------|---------|
| All apps (Turbo) | `pnpm build` |
| Single app | `pnpm turbo build --filter=@ridendine/web` (substitute app name) |

**Vercel + pnpm monorepo:** Configure each Vercel project with:

- **Root directory:** repository root **or** app directory per [Vercel monorepo docs](https://vercel.com/docs/monorepos).  
- **Install:** `pnpm install --frozen-lockfile` (often from root).  
- **Build:** If root is repo root, use e.g. `pnpm turbo build --filter=@ridendine/web` instead of plain `pnpm build` when only one app should build for that project.

Repo `apps/*/vercel.json` may list generic `buildCommand`; **override in the Vercel UI** if it does not match your root layout.

---

## 5. Supabase migration procedure (staging / production)

**Preconditions:** Migrations live in `supabase/migrations/`. No migration commands are executed from this doc in automation.

1. **Backup:** See [`docs/BACKUP_AND_ROLLBACK.md`](BACKUP_AND_ROLLBACK.md).  
2. **Staging first:** Apply migrations to a staging Supabase project; run app smoke tests.  
3. **CLI (example):** With CLI linked to the target project: `supabase db push` (or your org’s approved equivalent). **Do not** run against production without change control.  
4. **Regenerate types (optional but recommended):** `pnpm db:generate` when `DATABASE_URL` / Docker setup is available.  
5. **Verify:** RLS, critical paths (checkout, webhooks, ops processors).

---

## 6. Vercel deployment procedure

1. Set **all** environment variables per [`docs/ENVIRONMENT_VARIABLES.md`](ENVIRONMENT_VARIABLES.md) for each Vercel project.  
2. Promote **Preview** → **Production** only after staging sign-off.  
3. Confirm **four** app URLs match `NEXT_PUBLIC_*` cross-links.  
4. After web deploy, re-verify **Stripe webhook** URL (see below).

---

## 7. Stripe webhook setup

1. Stripe Dashboard → Developers → Webhooks → Add endpoint.  
2. URL: `https://<your-production-web-domain>/api/webhooks/stripe`  
3. Events: at minimum those handled in `apps/web/src/app/api/webhooks/stripe/route.ts` (e.g. `payment_intent.*`, `charge.refunded` per current code).  
4. Copy **signing secret** → `STRIPE_WEBHOOK_SECRET` on the **web** Vercel project only.  
5. Replay / idempotency: engine claim path — manual replay with Stripe CLI on staging is documented in payment/engine docs.

---

## 8. Smoke test sequence (post-deploy)

Follow **§5** in [`docs/QA_TESTING_PLAN.md`](QA_TESTING_PLAN.md) on **staging first**, then production with read-only checks where possible.

Add:

- Hit each app `GET /api/health` — see [`docs/HEALTHCHECKS_AND_MONITORING.md`](HEALTHCHECKS_AND_MONITORING.md).  
- One authenticated flow per role (customer, chef, driver, ops).

---

## 9. Rollback sequence

High level: [`docs/BACKUP_AND_ROLLBACK.md`](BACKUP_AND_ROLLBACK.md).

**Vercel:** Redeploy previous production deployment from the Vercel deployment list.

**Database:** Prefer **forward-fix** migration; PITR or restore only per org policy (Supabase dashboard).

**Stripe:** Webhook configuration versioned in Stripe; rollback of **processed money** is not reversible via deploy — use Stripe Dashboard and support process.

---

## 10. No production seed

Never run `supabase db seed` or synthetic reset scripts against **production**. CI enforces hygiene where configured (`pnpm verify:prod-data-hygiene`).

---

## 11. Emergency contacts (placeholders)

| Role | Contact | Notes |
|------|---------|-------|
| On-call engineering | _TBD_ | Pager / Slack |
| Supabase / billing admin | _TBD_ | Project owner |
| Stripe account owner | _TBD_ | Live mode access |

Update this table before first production launch (Phase 18 launch checklist).
