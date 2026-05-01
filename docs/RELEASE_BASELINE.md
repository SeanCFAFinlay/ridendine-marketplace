# Release baseline — pre-production hardening

| Field | Value |
|-------|-------|
| **Project name** | Ridendine (monorepo `@ridendine/monorepo`) |
| **Phase name** | Phase 0 — Safety snapshot and branch setup |
| **Recorded at (UTC)** | 2026-04-30 (local execution; use `git log -1 --format=%ci` for exact commit timestamp) |
| **Git branch** | `master` |
| **Git SHA** | `48447a9036937f02c60f331e25cdb5c95e9760ac` |
| **Git tag created** | `baseline/pre-hardening-20260430` (annotated lightweight tag on this SHA; **do not move** without a new baseline doc) |
| **Working tree status at baseline** | **Not clean:** modified `.claude/settings.local.json`; untracked `AUDIT_AND_PLANNING/` (and any other `??` paths shown by `git status` on your machine). **Interpretation:** baseline SHA is authoritative; uncommitted files are **outside** application source per Phase 0 rules but should be committed or stashed before Phase 1 if you want a clean tree. |

## Rule: application source code

**No application source code was changed in Phase 0.**  
Per execution plan: no edits under `apps/`, `packages/`, API routes, UI, or database migrations. Only documentation and git metadata (tag) plus this file and audit tracker updates.

## Supabase schema dump (manual)

Run from the repository root on a machine with the [Supabase CLI](https://supabase.com/docs/guides/cli) installed and the project linked (`supabase link`), **after** configuring `DATABASE_URL` or project ref as required by your environment.

**Schema-only SQL dump (typical):**

```bash
cd /path/to/RIDENDINEV1
supabase db dump --schema-only -f ./backups/schema-baseline-20260430.sql
```

If your CLI version uses different flags, equivalent goals are:

1. Dump **public** (and other non-auth) schema definitions you version in migrations, **or** full schema per your backup policy.  
2. Store the file **outside** git or in a **private** artifact store (avoid committing secrets).

**Note:** Phase 0 does **not** run this command in automation here; execute manually and attach the artifact to your release record if required.

## Rollback instructions

1. **To abandon work after this baseline:** reset branch to the tagged commit (destructive to uncommitted work):  
   `git checkout master && git reset --hard baseline/pre-hardening-20260430`  
   **Warning:** discards commits and uncommitted changes not saved elsewhere.

2. **To remove only the safety tag** (e.g. typo):  
   `git tag -d baseline/pre-hardening-20260430`  
   then recreate per a new `RELEASE_BASELINE.md` if policy allows.

3. **Database:** no migrations were applied in Phase 0; rollback is N/A for DB. For later phases, use Supabase PITR / migration down per runbook.

## Next allowed phase

**Phase 1 only** — Source-of-truth cleanup (`AUDIT_AND_PLANNING/21_FULL_CORRECTION_AND_UPGRADE_EXECUTION_PLAN.md`, Phase 1).  
Do **not** start Phase 2+ until Phase 1 is executed and logged per `23_PHASE_COMPLETION_LOG.md` and gate checklist `24_PHASE_GATE_CHECKLIST.md`.

---

*Baseline created by Phase 0 execution controller.*
