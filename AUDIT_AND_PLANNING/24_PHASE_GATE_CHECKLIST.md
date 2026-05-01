# Ridendine — Phase gate checklist (mandatory)

**When:** Immediately **before** starting any implementation phase (0–18) and immediately **after** completing work for that phase, before marking IRR items `DONE` in [`22_EXECUTION_TRACKER.md`](22_EXECUTION_TRACKER.md).

**Sources:** [`21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md`](21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md), [`25_ERROR_AND_DRIFT_PREVENTION_RULES.md`](25_ERROR_AND_DRIFT_PREVENTION_RULES.md).

---

## Pre-flight checklist (copy into session; every item required)

| # | Gate | Response (fill in) |
|---|------|----------------------|
| 1 | **Current git branch** | `git branch --show-current` = |
| 2 | **Working tree** | `git status --short` → CLEAN / list intentional WIP: |
| 3 | **Phase number** | Executing Phase **\_\_** only (0–18) |
| 4 | **IRR issues targeted** | List IRR-IDs: |
| 5 | **Files to inspect** | List paths (read first): |
| 6 | **Files to edit** | List paths (minimal set): |
| 7 | **Files to avoid** | List paths / globs explicitly out of scope: |
| 8 | **Database migration** | YES / NO — if YES, migration filename intent: |
| 9 | **Tests required** | Commands from `21` + tracker for this phase: |
| 10 | **Rollback plan** | One sentence + git/migration strategy: |
| 11 | **No unrelated refactor** | CONFIRMED — only phase-scoped edits |
| 12 | **Prevention rules** | Re-read [`25_ERROR_AND_DRIFT_PREVENTION_RULES.md`](25_ERROR_AND_DRIFT_PREVENTION_RULES.md); note rule IDs to obey: |

**Blocker rule:** If any item cannot be answered honestly, set affected IRR to `BLOCKED` in the tracker and stop until resolved.

---

## Post-flight checklist (before DONE / before merge)

| # | Gate | Response (fill in) |
|---|------|----------------------|
| 1 | **Files changed** | Bullet list with repo-relative paths: |
| 2 | **Migrations created** | None / list `supabase/migrations/*.sql`: |
| 3 | **APIs changed** | List `apps/*/src/app/api/**` routes touched: |
| 4 | **UI changed** | List `page.tsx` / components touched: |
| 5 | **Security-sensitive changes** | YES/NO — if YES, summarize: |
| 6 | **Tests run** | Exact commands: |
| 7 | **Test results** | PASS / FAIL — if FAIL, link logs; **no DONE** |
| 8 | **Issues closed** | IRR-\_\_\_ set to PASSED/DONE with evidence: |
| 9 | **Issues still open** | IRR-\_\_\_ remaining or partial: |
| 10 | **Tracker updated** | [`22_EXECUTION_TRACKER.md`](22_EXECUTION_TRACKER.md) saved with Status/Owner/Notes |
| 11 | **Completion log updated** | [`23_PHASE_COMPLETION_LOG.md`](23_PHASE_COMPLETION_LOG.md) phase section filled |
| 12 | **Drift prevention** | Confirm no violation of [`25_ERROR_AND_DRIFT_PREVENTION_RULES.md`](25_ERROR_AND_DRIFT_PREVENTION_RULES.md) (duplicate logic, mock prod data, etc.) |
| 13 | **Next phase recommendation** | Phase **\_\_** — YES / NO — reason: |
| 14 | **Unrelated changes** | NONE / list (if any, revert before merge): |

---

## Phase-specific reminders (quick)

| Phase | Extra pre-flight reminder |
|-------|---------------------------|
| 0 | No application logic edits; tag + doc only |
| 1 | Prefer doc-only fixes unless migration is unavoidable |
| 2 | Coordinate DB migration with deploy; feature-flag risky role changes |
| 3 | Backup before `db push` on shared envs |
| 4 | Stripe changes: test mode keys only |
| 5 | Engine changes: expand Vitest before merge |
| 6 | Do not duplicate confirmation URLs after merge |
| 7 | Verify engine rejects checkout when kitchen closed |
| 8 | Do not log raw GPS in application logs |
| 9 | Webhook idempotency must be proven with replay |
| 10 | Finance UI: no hardcoded totals |
| 11 | Realtime: no `as any` reintroduction |
| 12 | RLS policies reviewed on `support_tickets` |
| 13 | CI runs `pnpm verify:prod-data-hygiene` (no `db:seed` / `supabase db seed` / `supabase db reset` in workflows) |
| 14 | No business rules in UI during this phase |
| 15 | Service-role queries: prove scoping in tests |
| 16 | CI change: expect red until lint debt fixed—plan fix scope |
| 17 | Runbook is doc-only but links to real Supabase project refs |
| 18 | Go/no-go is human gate; Cursor fills checklist only |

---

*End of checklist document.*
