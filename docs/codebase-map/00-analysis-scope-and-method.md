# 00 — Analysis Scope and Method

**Analysis date:** 2026-09-08
**Analyst:** automated architecture/documentation pass (read-only)
**Repository:** `ridendine-marketplace` (`@ridendine/monorepo`)

---

## 1. Run configuration (as executed)

| Setting | Configured | Actual value used | Adjustment reason |
|---|---|---|---|
| `repository_root` | current working directory | `D:\Projects\RIDENDINE\ridendine-marketplace` | The invocation directory was `D:\Projects\RIDENDINE`, which is **not** a Git repository — it is an Obsidian vault of business documents (`.pptx`, `.docx`, `.pdf`, `.xlsx`, `Ridendine_Business_Bible_Obsidian_Vault/`). The only Git root and the only source tree is the `ridendine-marketplace/` subdirectory. Scope was narrowed to that, not broadened. |
| `output_directory` | `docs/codebase-map` | `ridendine-marketplace/docs/codebase-map` | Placed inside the repository being documented. |
| `analysis_mode` | `READ_ONLY` | READ_ONLY | No product code, migration, config, or remote state was modified. Files were written **only** inside `docs/codebase-map/`. |
| `include_generated_files` | false | false | 8 `graphify-out/` trees, `.gitnexus/` (309 MB), `.local-tools/` (152 MB), `.turbo/`, `apps/*/.next/`, `test-results/` excluded from source analysis. `.next/` was read once, non-destructively, purely to confirm whether the Sentry SDK is bundled (see 13). |
| `include_dependency_source` | false | false | `node_modules/` excluded except two metadata reads (installed `@sentry/nextjs` version). |
| `include_git_history` | true | partial | Commit count, HEAD, branch, tracked-file status and remote were read. Full history mining was not performed — it is not needed for any claim made here and the repository is only 412 commits deep. |
| `include_tests` | true | true | |
| `include_deployment` | true | true | `vercel.json` × 4, `.github/workflows/` × 4, `supabase/config.toml`. |
| `include_security_review` | true | true | Static, repository-evidence only. |
| `include_cost_review` | true | true | **Cost drivers only. No prices.** See §19 — no vendor pricing was verified from an authorized current source, so every figure is marked *pricing not verified*. |
| `include_legacy_code` | true | true | |
| `diagram_formats` | mermaid, svg, html | **mermaid + html** | SVG rendering requires executing `mmdc`/Puppeteer, which downloads a Chromium binary and was outside the read-only envelope. `diagrams/rendered/` is present but empty; `codebase-map.html` renders the same Mermaid sources natively in the browser. **Adjustment recorded.** |
| `optional_export_formats` | pdf | **omitted** | No PDF toolchain available without installing software. `codebase-map.html` prints to PDF from any browser (Ctrl+P → Save as PDF), one diagram per section. |
| `maximum_file_size_to_read_fully_mb` | 5 | 5 | No source file approaches this. |
| `maximum_binary_inspection` | metadata_only | metadata_only | Logos, `.pptx`, `.pdf`, `.xlsx`, fonts: name/size only. |
| `confidence_threshold_for_verified_claim` | 0.85 | 0.85 | |

---

## 2. Repository classification

**Monorepo — a service-oriented system delivered as four deployable Next.js applications over one shared PostgreSQL database, plus eleven shared TypeScript packages.**

- pnpm workspace (`pnpm-workspace.yaml`: `apps/*`, `packages/*`), Turborepo task graph (`turbo.json`).
- 4 deployable units: `apps/web`, `apps/chef-admin`, `apps/ops-admin`, `apps/driver-app`.
- 11 library packages: `engine`, `db`, `auth`, `routing`, `ui`, `types`, `validation`, `utils`, `notifications`, `config`.
  (10 with source; `config` is build configuration only.)
- 1 database: Supabase/PostgreSQL 17, 62 forward-only migrations, 112 tables.

Depth was adapted to that shape: packages and deployable units were mapped first, then each active unit traced separately. Standards were not relaxed.

---

## 3. What was inspected

| Area | Method | Coverage |
|---|---|---|
| Structure | full filesystem walk, extension census | 100% |
| Workspace manifests | read in full | 15/15 |
| API routes | enumerated (180 `route.ts`); guard gate executed over all | 100% enumerated, ~25 read in full |
| Pages | enumerated (104 `page.tsx`) | 100% enumerated, ~10 read in full |
| Engine | file listing + full read of state machine, factory, server, client-helpers, dispatch orchestrator, driver matching, ledger, fees, tax, constants | 73 source files listed; 12 read fully |
| Database | all 62 migrations grep-analysed for DDL, RLS, policies, functions, triggers; 5 read in part | 100% analysed |
| Config/env | `.env.example`, `.env.local`, `turbo.json`, `next.config.js` ×4, `middleware.ts` ×5, full `process.env` census | 100% |
| Deployment | `vercel.json` ×4, all 4 CI workflows | 100% |
| Tests | enumerated (250 files) and mapped to CI job list | 100% enumerated |
| Gates | 4 executed locally, read-only | see §5 |
| **Complete file enumeration** | **second pass** — a read-only extractor walked all 1,126 source files and parsed exports, imports, `.from()`/`.rpc()` targets, `fetch()` calls, HTTP methods, guards, env references and SQL DDL | **100% of files, 0 sampled** — output in `program-map/` |

## 4. What was NOT inspected, and why

| Excluded | Reason |
|---|---|
| `node_modules/`, `.pnpm-store` | Dependency source; out of scope by configuration. |
| `.gitnexus/` (309 MB), `.local-tools/` (152 MB), `.turbo/` | Generated tool caches and a vendored Node runtime; not source. |
| `**/graphify-out/` (8 copies) | Generated knowledge-graph output; not source, gitignored. |
| `archive/` (351 files) | Contains **only** `graphify-out` artifacts — no source. (`CLAUDE.md` calls this "an empty shell"; it is empty *of source*, not empty.) |
| `apps/*/.next/` | Build output. One targeted grep only (Sentry presence check). |
| `test-results/`, `.claude-flow/`, `.claude/`, `.superpowers/`, `.obsidian/` | Runtime artifacts and agent tooling. |
| Parent directory `D:\Projects\RIDENDINE\` | Business documents, not this system. Explicitly out of the Git root per `CLAUDE.md`. |
| Production runtime | No credentials, no network writes, no deploys. **This is the single largest limitation of this map** — see §5. |
| Live database | No connection was opened. A production `DATABASE_URL` exists on disk (see 13) and was deliberately not used. |
| Third-party dashboards (Stripe, Vercel, Supabase, Sentry) | No access; would require credentials. |

## 5. Commands executed (all read-only, all local)

| Command | Result |
|---|---|
| `node scripts/audit/check-api-route-guards.mjs` | PASS — 179 routes scanned, 14 allowlisted, 0 unguarded |
| `node scripts/audit/db-boundary-ratchet.mjs` | PASS — 398 raw `.from()` warnings, equal to baseline |
| `node scripts/verify-prod-data-hygiene.mjs` | PASS |
| `node scripts/wiring/verify-known-wiring-fixes.cjs` | PASS — 20/20 |
| `git log/status/branch/remote/rev-list` | read-only inspection |

Not run: `pnpm typecheck` / `pnpm lint` / `pnpm build` / `pnpm test` (they write `.tsbuildinfo`, `.turbo` cache and `.next` output); `pnpm docs:wiring` (it rewrites committed docs and, per `CLAUDE.md` §Traps, then breaks a gate); anything touching Supabase, Stripe or Vercel.

## 6. Evidence model

Every material claim in this package carries a status label:

| Label | Meaning |
|---|---|
| **VERIFIED** | Supported by executable code or active configuration **and** at least one runtime linkage (a registration, a schedule entry, an import chain, a passing gate). |
| **INFERRED** | Multiple converging clues; not provable without runtime observation. |
| **POSSIBLE** | Plausible from limited evidence. Never drawn as fact in a diagram. |
| **CONTRADICTED** | Repository sources make incompatible claims. |
| **UNKNOWN** | Repository does not contain enough evidence. |
| **INACTIVE** | Present but disabled, unreachable, deprecated or unused in the inspected configuration. |

Evidence is cited as `relative/path.ts: symbolOrKey`. Line numbers are avoided in favour of symbols and configuration keys because line numbers drift; where a line is genuinely the clearest anchor it is given as `path:line` and marked as of this commit.

Full index: `25-evidence-index.md`.

## 7. Baseline of record

| Fact | Value |
|---|---|
| Git remote | `https://github.com/SeanCFAFinlay/ridendine-marketplace.git` |
| Branch analysed | `feat/cooco-partner-webhooks-realtime` (**not** `master`) |
| HEAD | `c8b9049d` — *"fix(ci): green the three failing gates — costs nav, surface counts, db-boundary"* |
| Working tree | clean (0 modified files) |
| Total commits | 412 |

> **Scope caution:** this map describes the `feat/cooco-partner-webhooks-realtime` branch. CI (`.github/workflows/ci.yml`) only runs on `master`/`main` push and PRs targeting them, so **this branch's code has not been through the CI gates by push**. The four gates re-run locally here all pass.

## 8. Outputs produced, and outputs omitted

Produced: `00`–`26` plus `diagrams/*.mmd` and `codebase-map.html`.

| Omitted | Reason |
|---|---|
| `diagrams/rendered/*.svg` | Rendering requires executing a headless-browser toolchain; outside the read-only envelope. Directory created and left empty. Mermaid sources render in `codebase-map.html`. |
| `optional-codebase-map.pdf` | No PDF toolchain available without installing software. Print `codebase-map.html` to PDF instead. |

## 9. Analysis log

| Phase | Status | Notes |
|---|---|---|
| A Inventory | complete | 3,377 files total; 1,107 source files after exclusions. |
| B Entry points | complete | 4 Next.js apps, 5 middleware, 3 scheduled processors, 2 webhooks, 40+ scripts. |
| C Components | complete | 20 components catalogued (C-01…C-20). |
| D Connections | complete | 38 connections registered (NET-001…NET-066, non-contiguous by group). |
| E Data / source of truth | complete | 112 tables; 20 entities given an authoritative owner. |
| F Control vs data flow | complete | Checkout traced end to end in 24 numbered steps. |
| G Interfaces | complete | 104 pages, 180 API routes enumerated; 5 journeys traced. |
| H External systems | complete | 13 external services classified (X-01…X-13). |
| I Configuration | complete | 49 env vars; 4 drift items found. |
| J Auth / trust | complete | 6 trust boundaries; capability matrix read in full. |
| K Reliability | complete | 17 failure modes registered (F-01…F-17). |
| L Security | complete | 9 findings (V-01…V-09) plus 11 weakness classes examined and found not reachable. |
| M Tests | complete | 250 test files; 5 packages' tests never run in CI. |
| N Deployment | complete | Local + production topologies drawn separately. |
| O Observability | complete | Sentry found inert; 5 of 8 operator questions answerable. |
| P Performance | complete | 9 hypotheses, each with a stated measurement. |
| Q Cost | complete | 16 drivers; **no prices**. |
| R Legacy/dead | complete | 13 items classified (D-01…D-13). |
| S Contradictions | complete | 14 registered. |
| T Domain logic | complete | 14 rule sets documented. |
| U Diagrams | complete | 10 Mermaid diagrams. |
| V Plain language | complete | |
| W Onboarding | complete | |
| X Runbook | complete | Gaps labelled, no commands invented. |
| Y Risk register | complete | 66 findings across 10 categories. |
| Z File-level pass | complete | All 1,126 files enumerated; 16 documents in `program-map/`; 6 additional findings (N-01…N-06). |

**Blockers encountered:** none that stopped the analysis. **Three classes of claim could not be closed without production access** and are listed as unknowns in `21-contradictions-and-unknowns.md`: (a) whether Vercel Cron actually executes the scheduled processors, (b) whether Sentry receives any events, (c) whether `UPSTASH_*` and the optional Stripe/Resend/Twilio credentials are set in the production environment.

**Safety decisions taken:**
- A live production database credential was found on disk in `.env.local`. It was **not used**, and its value does not appear anywhere in this package. See `13-security-and-trust-boundaries.md` § Secret exposure.
- `pnpm docs:wiring` was not run, because per the repository's own `CLAUDE.md` it succeeds and then breaks `pnpm test:wiring-fixes`.
- No `supabase`, `stripe`, `vercel`, or `gh` command was invoked.
