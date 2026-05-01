# Phase 3 — File tree and stale-code review

**Method:** Top-level listing, glob searches for suspicious names, manual review of overlapping audit folders. **No files were deleted.**

## Top-level highlights

| Path | Role |
|------|------|
| `apps/` | Four Next.js applications |
| `packages/` | Shared libraries |
| `supabase/` | Migrations and seeds |
| `docs/` | Documentation |
| `AUDIT_AND_PLANNING/` | Prior audit/planning materials |
| `audit/` | Separate audit folder (legacy naming) |
| `AUDIT_AND_DEBUG/` | **This session’s forensic bundle** |
| `graphify-out/` | Knowledge-graph outputs (`GRAPH_REPORT.md` currently empty) |
| `e2e/` | End-to-end / lifecycle scripts |
| `test-results/` | Playwright output (typically gitignored artifacts) |
| `TEST_CREDENTIALS.md` | Present — treat as **sensitive**; do not expose contents |
| `.env`, `.env.local` | Local secrets — not enumerated |

Approximate file count (includes `node_modules`): **~66,758** files under workspace root (`Get-ChildItem -Recurse -File`).

## Pattern searches (filename/path)

| Pattern | Finding |
|---------|---------|
| `*backup*` | `docs/BACKUP_AND_ROLLBACK.md` only (documentation) |
| `*legacy*` | No matching filenames |
| `mock*` (filename) | No files named mock* at repo root glob scope |
| Duplicate app folders | Single `apps/web`, `chef-admin`, `ops-admin`, `driver-app` |

## Table: notable folders/files

| File/Folder | Issue | Keep / Repair / Quarantine | Reason |
|-------------|-------|------------------------------|--------|
| `AUDIT_AND_PLANNING/` | Parallel to new `AUDIT_AND_DEBUG/` | Keep | Historical planning; user forbids deletion |
| `audit/` | Naming overlap | Keep | Do not merge without owner review |
| `graphify-out/GRAPH_REPORT.md` | Empty file | Repair (optional) | Regenerate graph pipeline when needed |
| `e2e/` | Could be mistaken for “demo” | Keep | Real automation (`packages/engine/src/e2e/*.e2e.ts` etc.) |
| `apps/*/src/__tests__`, `__tests__/` | “test” in path | Keep | Legitimate unit/integration tests |
| `packages/**/*.test.ts` | Test files | Keep | Part of quality gates |
| `Untitled.canvas` | Loose canvas file at root | Quarantine (manual) | Possibly accidental; user may rename/move |
| `TEST_CREDENTIALS.md` | Credential risk | Keep + restrict | Do not commit real prod secrets; rotate if leaked |

## Duplicate dashboards / dead routes

- **Next.js build** enumerated all app routes successfully (see `01_ERROR_LOGS.md` / build logs). No compile-time dead imports surfaced in build.
- Ops-admin has many `/dashboard/*` routes; all appeared in `next build` route manifest — not treated as stale without runtime proof.

## Generated / stale artifacts

- `.turbo/` — Turborepo cache; normal  
- `node_modules/` — dependency tree; normal  

**Verdict:** No mandatory quarantine moves identified by automated naming sweep alone. Overlap between `audit`, `AUDIT_AND_PLANNING`, and `AUDIT_AND_DEBUG` is documentation debt, not a runtime defect.
