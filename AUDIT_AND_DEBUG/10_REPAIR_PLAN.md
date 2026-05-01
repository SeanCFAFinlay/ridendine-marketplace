# Phase 11 — Repair plan (ordered)

Execution order per user specification, adapted to **evidence from this audit**.

| Step | Action | Status |
|------|--------|--------|
| 1 | App start / build | **Already green** (`pnpm run build` 0) |
| 2 | Fix build/type errors | **None** |
| 3 | Fix broken imports/routes | **None** at compile time |
| 4 | Fix env/config | **Payout URL:** use chef-admin public base for Stripe Connect links; document optional env vars in `.env.example` |
| 5 | Fix backend/API | **Payout route** only (confirmed misconfiguration) |
| 6 | Fix database wiring | **No change** without live repro |
| 7 | Fix frontend data display | **No compile-time issue** |
| 8 | Fix UI broken actions | **None proven** |
| 9 | Isolate mock data | **N/A** — tests only |
| 10 | Validation/logging/tests | Run `pnpm run typecheck` + `pnpm run build` after patch; optional graphify rebuild |

## Rollback

- Single-file change in `apps/chef-admin/.../payouts/setup/route.ts` — revert via git if Stripe behavior regresses.
