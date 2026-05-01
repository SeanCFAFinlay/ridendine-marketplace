# Pre-Launch Repair Plan 01 — Baseline and audit ingestion

## Baseline snapshot

| Field | Value |
|---|---|
| Branch | `master` |
| HEAD SHA | `48447a9036937f02c60f331e25cdb5c95e9760ac` |
| Git tree | **Dirty** (large tracked + untracked set across apps/packages/docs/migrations) |
| Package manager | `pnpm@9.15.0` |
| Node engine | `>=20.0.0` |
| Root scripts | `dev`, `build`, `lint`, `typecheck`, `test`, `db:*`, `verify:prod-data-hygiene` |

## Audit ingestion status

- Audit folder found: `AUDIT_AND_PLANNING/PRE_LAUNCH_AUDIT_02/` (14 files).
- Files read: `00` through `13` (all audit deliverables).
- Missing audit files: **none**.
- Graphify audit context file `graphify-out/GRAPH_REPORT.md`: **not found** in workspace root at planning time.

## Final audit verdict (source of truth)

- From `13_FINAL_PRE_LAUNCH_AUDIT_REPORT.md`:
  - Overall readiness: **GO WITH CONDITIONS**
  - Production: **NO-GO** (unrestricted)
  - Current safe state: **STAGING ONLY** (conditional)

## Current known launch status

1. Not production-ready due to unresolved P0/P1 items (IRR-003, IRR-022 route wiring, distributed rate limiting, missing browser E2E, missing load evidence, support RLS depth).
2. Staging is allowed only after clean merge discipline and explicit risk acceptance.
3. Limited pilot requires completion of specific controls and evidence (defined in this repair plan set).

## Code-change declaration

- During Audit 02: application code was reported unchanged by auditor, but repo already had substantial pre-existing dirty changes.
- During this repair planning task: only files under `AUDIT_AND_PLANNING/PRE_LAUNCH_REPAIR_PLAN_01/` are created/edited.
- No application code changes are planned in this task.

## Uncertainty log

- Dirty tree origin is mixed and predates this planning run; individual change provenance needs owner confirmation before execution.
- Some risks are marked "suspected" in audit and require targeted verification tests during execution phases (not assumed fixed).
