# Program Map — Complete File-Level Index

**Every source file in `ridendine-marketplace`, individually accounted for.**

Commit `c8b9049d` · branch `feat/cooco-partner-webhooks-realtime` · generated 2026-09-08 by a read-only static extractor.

This is the file-level companion to the architecture analysis in `../`. Where the architecture documents explain *how the system works*, these documents enumerate *what is in it* — every route, page, component, hook, service, repository, migration, script, test and exported symbol.

---

## Totals

| | Count |
|---|--:|
| Source files | **1126** |
| Lines of source | **183,521** |
| Exported symbols | **1960** distinct names |
| Api Route | 179 |
| Page | 104 |
| Layout | 12 |
| Component | 102 |
| Lib | 47 |
| Hook | 9 |
| Orchestrator | 21 |
| Service | 29 |
| Core | 14 |
| Repository | 23 |
| Migration | 62 |
| Script | 50 |
| Test | 258 |
| E2E | 9 |

---

## Documents

| # | Document | Covers |
|---|---|---|
| 01 | [`01-api-routes.md`](01-api-routes.md) | All **180** route files: endpoint, HTTP methods, guard, ownership check, tables, RPCs, package deps, env, purpose |
| 02 | [`02-pages.md`](02-pages.md) | All **104** pages, **12** layouts and **17** special files: URL, client/server, fetch calls, tables |
| 03 | [`03-engine.md`](03-engine.md) | `@ridendine/engine` — every orchestrator, service, core module and test |
| 04 | [`04-db.md`](04-db.md) | `@ridendine/db` — three clients, **23** repositories, realtime, hooks |
| 05 | [`05-shared-packages.md`](05-shared-packages.md) | auth · routing · validation · types · utils · ui · notifications · config |
| 06 | [`06-app-internals.md`](06-app-internals.md) | All **47** lib modules, **102** components, **9** hooks, **4** middleware, **28** config files |
| 07 | [`07-database.md`](07-database.md) | All **62** migrations object by object; table → migration map; every function, trigger, view, index |
| 08 | [`08-scripts.md`](08-scripts.md) | All **50** scripts: CI gates, smoke tests, doc generators, dev tooling |
| 09 | [`09-tests.md`](09-tests.md) | All **267** test files, grouped by area, with CI execution status |
| 10 | [`10-symbol-index.md`](10-symbol-index.md) | Every exported symbol → file. Answers "where is X defined?" |
| 11 | [`11-table-usage-matrix.md`](11-table-usage-matrix.md) | Every database table → every file that reads or writes it |
| 12 | [`12-env-usage-matrix.md`](12-env-usage-matrix.md) | Every environment variable → every file that reads it |
| 13 | [`13-dependency-graph.md`](13-dependency-graph.md) | Package dependency edges, fan-in hotspots, external npm usage |
| 14 | [`14-coverage-and-file-ledger.md`](14-coverage-and-file-ledger.md) | Proof of completeness: every file listed with its classification |
| 15 | [`15-findings-from-the-file-level-pass.md`](15-findings-from-the-file-level-pass.md) | **Six new findings** visible only from complete enumeration — including six schema tables nothing reads or writes |

---

## Start here

If you only read one of these, read **[`15-findings-from-the-file-level-pass.md`](15-findings-from-the-file-level-pass.md)** — the six findings that complete enumeration surfaced and sampling could not.

## How this was produced

A read-only Python extractor walked every `.ts .tsx .js .cjs .mjs .sql .ps1` file outside `node_modules/`, `.next/`, `.git/`, `.turbo/`, `.gitnexus/`, `.local-tools/`, `graphify-out/`, `archive/` and `test-results/`, and parsed:

- exported functions, classes, constants, types and defaults
- imports, split into workspace / external / local
- literal `.from('table')` and `.rpc('fn')` calls
- `fetch()` targets, Supabase storage buckets, realtime channels
- exported HTTP methods on route files
- authorization guard and ownership-check calls
- `process.env.X` references
- for SQL: created/altered tables, RLS statements, policies, functions, triggers, indexes, views
- each file's own header comment, used verbatim as the Purpose column

### What this is, and what it is not

**Reliable:** file inventory, exports, imports, HTTP methods, literal table names, env references, SQL object inventory. These are read directly out of the source.

**Approximate by construction:** the extractor uses regular expressions, not a TypeScript compiler. It will miss a table name built from a variable or template literal, an export produced by an unusual pattern, and a `fetch` whose URL is assembled at runtime. A blank cell therefore means *"no literal match found"*, **never** *"this does not happen"*. Where that distinction mattered for a conclusion in the architecture analysis, the file was opened and read.

**The Purpose column is the file's own words**, not an assessment. Some header comments are stale; several say so themselves.

---

## Cross-references

Findings, risks and interpretation live in the architecture set one level up:

- [`../01-executive-summary.md`](../01-executive-summary.md) — findings and top risks
- [`../22-risk-and-improvement-register.md`](../22-risk-and-improvement-register.md) — 60 findings
- [`../25-evidence-index.md`](../25-evidence-index.md) — claim → file traceability
- [`../codebase-map.html`](../codebase-map.html) — the 10 diagrams
