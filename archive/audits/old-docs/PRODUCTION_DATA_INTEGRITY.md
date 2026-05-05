# Production data integrity (Phase 13 / IRR-015)

## Objective

No **mock**, **demo**, or **synthetic** business identifiers in production code paths. **Supabase seeds** stay **local/dev only**; **CI and deploy pipelines** must not run `db:seed` or `db reset`.

See also: [`docs/RELEASE_BASELINE.md`](RELEASE_BASELINE.md), [`AUDIT_AND_PLANNING/25_ERROR_AND_DRIFT_PREVENTION_RULES.md`](../AUDIT_AND_PLANNING/25_ERROR_AND_DRIFT_PREVENTION_RULES.md) (R7.1).

---

## Seeds (`supabase/seeds/`)

| Rule | Detail |
|------|--------|
| **Purpose** | Local development and automated tests that explicitly target a disposable DB. |
| **Production** | **Never** run `pnpm db:seed`, `supabase db seed`, or `supabase db reset` against production or staging “real” databases. |
| **Files** | Do not delete seed SQL; keep it out of deploy automation only. |

Root scripts (developer machines):

- `pnpm db:seed` → `supabase db seed`
- `pnpm db:reset` → `supabase db reset`

These are **not** invoked from `.github/workflows/*.yml` (enforced by `pnpm verify:prod-data-hygiene` in CI).

---

## Refund processing (ops-admin)

`POST /api/engine/refunds` with `action: "process"` **requires** a real **`stripeRefundId`** returned by the Stripe API (IDs match `re_[A-Za-z0-9]+`). Placeholder values such as `mock_*` are **rejected** with **400** so finance cannot mark a case completed with fake Stripe correlation.

Prefer the same contract as `POST /api/engine/finance` + `financeActionSchema` (`process_refund`), which already requires `stripeRefundId`.

---

## CI guard

After `pnpm install`, CI runs:

```bash
pnpm verify:prod-data-hygiene
```

This fails the job if any workflow under `.github/workflows/` contains `db:seed`, `supabase db seed`, or `supabase db reset`.

---

## Manual verification

```bash
pnpm verify:prod-data-hygiene
rg "mock_" apps --glob "*.ts" --glob "*.tsx" --glob "!**/*test*"
```

Test-only mocks under `**/__tests__/**`, `*.test.ts`, and Vitest/Jest `vi.mock` / `jest.mock` are expected and **not** production paths.

---

## Deferred (later phases)

- **Phase 14+:** UI placeholder strings (form hints) remain; they are not business data.
- **Phase 17:** Runbook lines for each host’s deploy pipeline (Vercel, Supabase) stating “no seed step.”
