# QA and testing plan (Phase 16)

Companion docs: [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md), [`docs/RELEASE_BASELINE.md`](RELEASE_BASELINE.md), [`docs/PRODUCTION_DATA_INTEGRITY.md`](PRODUCTION_DATA_INTEGRITY.md).

---

## 1. CI commands (GitHub Actions)

Workflow: `.github/workflows/ci.yml` on `push` / `pull_request` to `master` or `main`.

| Step | Command | Gate |
|------|---------|------|
| Install | `pnpm install --frozen-lockfile` | Required |
| Data hygiene (IRR-015) | `pnpm verify:prod-data-hygiene` | Required |
| Typecheck | `pnpm typecheck` | **Required** — fails job on TS errors |
| Lint | `pnpm lint` | **Required** — lint failures fail the job (IRR-013: no `continue-on-error`) |
| Tests | See §2 | **Required** |
| Build | `pnpm build` | Required |

Dummy env vars for Next/Stripe are set in the workflow `env` block (placeholders only).

---

## 2. Automated tests in CI

| Package / app | Command | Framework |
|---------------|---------|-----------|
| `@ridendine/engine` | `pnpm --filter @ridendine/engine test` | Vitest |
| `@ridendine/db` | `pnpm --filter @ridendine/db test` | Vitest |
| `@ridendine/auth` | `pnpm --filter @ridendine/auth test` | Vitest |
| `@ridendine/utils` | `pnpm --filter @ridendine/utils test` | Vitest |
| `@ridendine/web` | `pnpm --filter @ridendine/web test` | Jest |
| `@ridendine/ops-admin` | `pnpm --filter @ridendine/ops-admin test` | Jest |

**Not in CI yet (no `test` script):** `apps/chef-admin`, `apps/driver-app`. Track as gap until minimal smoke tests are added (Phase 17+ optional).

---

## 3. Local commands (developer)

```bash
pnpm install
pnpm verify:prod-data-hygiene
pnpm typecheck
pnpm lint
pnpm test                    # all workspaces that define "test"
pnpm --filter @ridendine/web test
pnpm --filter @ridendine/ops-admin test
pnpm --filter @ridendine/engine test
```

Single-file / pattern (web Jest):

```bash
cd apps/web && pnpm exec jest --testPathPattern=stripe-webhook-route
```

---

## 4. Recommended pre-push checks

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test` (or at minimum the package you changed)
4. For API changes: run the relevant `pnpm --filter … test` plus manual smoke for that surface (§5)

---

## 5. Smoke tests (manual / staging)

Run in **staging** with real auth and test Stripe keys where applicable. Goal: confirm documented behavior, not exhaustive E2E.

| Actor | Path | Expect |
|-------|------|--------|
| Customer (web) | Browse storefronts → cart → checkout | Checkout page loads; **payment** stops at Stripe test boundary; no console errors |
| Customer | `POST /api/checkout` without session | **401** (see `AUTH_ROLE_MATRIX.md`) |
| Chef | Availability + menu + orders dashboard | Data loads; accept/reject flows match `ORDER_FLOW.md` |
| Driver | Presence + location API (authenticated) | **200** with valid body; rate limit returns **429** when exceeded (IRR-019) |
| Ops | Orders / finance / settings (platform role) | **200** for permitted capabilities |
| Ops / wrong role | Protected API without capability | **403** |
| Any | Unauthenticated protected API | **401** |
| Prod hygiene | No seed in deploy pipelines | `pnpm verify:prod-data-hygiene` passes |

---

## 6. Security regression tests (automated pointers)

| Area | Where verified |
|------|----------------|
| Stripe webhook signature | `apps/web/.../stripe-webhook-route.test.ts` |
| Log redaction / processor token / upload MIME | `packages/utils/src/security-hardening.test.ts` |
| `BYPASS_AUTH` in production | `packages/auth/src/middleware.test.ts` |
| Ops platform guards | `packages/engine/src/services/platform-api-guards.test.ts` (and ops route tests where present) |

See [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md) for the full model.

---

## 7. Manual QA checklist (release owner)

- [ ] All smoke rows in §5 on staging
- [ ] Order lifecycle: pending → delivered matches `docs/ORDER_FLOW.md`
- [ ] Webhook replay idempotency (Stripe CLI) per `docs/API_FOUNDATION.md` / engine docs
- [ ] Mobile spot-check (`docs/MOBILE_UI_RESPONSIVE_CHECKLIST.md` where applicable)
- [ ] Confirm **no** `BYPASS_AUTH=true` in production env

---

## 8. Known gaps

| Gap | Notes |
|-----|--------|
| No Playwright/Cypress in repo | Manual / external E2E for now |
| chef-admin / driver-app | No Jest/Vitest scripts; rely on typecheck + manual smoke |
| `pnpm test` at root | Runs `pnpm -r --if-present test`; failures in any workspace fail the recursive run |
| Distributed rate limits | Per-instance only — see `SECURITY_HARDENING.md` |

---

## 9. Definition of done (Phase 16)

- [x] `QA_TESTING_PLAN.md` exists (this file)
- [x] CI runs typecheck, lint, and package/app tests without hiding lint failures
- [x] Web + ops-admin tests are part of the CI matrix
- [ ] Full monorepo always green: depends on fixing drift and expanding coverage over time

**Next phase:** Phase 17 — deployment readiness only.
