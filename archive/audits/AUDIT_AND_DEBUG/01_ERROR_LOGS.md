# Phase 2 — Run failure capture

**Machine:** Windows, commands run from `C:\Users\sean\RIDENDINEV1`  
**Date:** 2026-05-01

## Commands executed and results

| Command | Exit code | Result |
|---------|-----------|--------|
| `pnpm run lint` | 0 | Success — 4 app lint tasks (scoped ESLint paths per app) |
| `pnpm run typecheck` | 0 | Success — all 12 packages typechecked |
| `pnpm run build` | 0 | Success — all four Next.js apps built |
| `pnpm run test` | 0 | Success — Vitest (utils, db, engine, auth) + Jest (all four apps) |

**Conclusion:** No build, typecheck, or lint **failures** were observed in this run. The monorepo is CI-green for these gates.

## Non-failing issues captured from test output (severity: low)

These did **not** fail the suite (`exit code 0`) but produce noise or expected error logs:

| Source | Symptom | Evidence | Severity | Blocks |
|--------|---------|----------|----------|--------|
| `packages/db` Vitest | Vite CJS deprecation warning | Console: `The CJS build of Vite's Node API is deprecated` | Low | No |
| `packages/engine` tests | Intentional stderr from notification tests | `console.error` / `console.warn` from `notification-sender.test.ts`, `notification-triggers.test.ts` | Low | No |
| `apps/web` Jest | `console.error` from `stripe-adapter` when test expects failure | Stack points to `src/lib/stripe-adapter.ts:31` | Low | No |
| `apps/ops-admin` Jest | React `act(...)` warnings | `OpsAlerts` state updates in `ops-alerts.tsx` | Low | No |
| `apps/web` Jest | React `act(...)` warnings | `ForgotPasswordPage` in `auth/forgot-password/page.tsx` | Low | No |

## Errors table (empty for blocking failures)

| Command | Error message | File:line | Root cause | Severity | Blocks |
|---------|---------------|-----------|------------|----------|--------|
| — | *None observed* | — | — | — | — |

## Notes

- Full production/runtime verification (browser, live Supabase, Stripe webhooks) was **not** part of the automated command suite; see `12_VALIDATION_REPORT.md` for build-level and targeted checks.
- If a specific user-facing bug persists, reproduce it and attach logs or HAR; this audit establishes baseline **tooling health**, not every edge-case runtime path.
