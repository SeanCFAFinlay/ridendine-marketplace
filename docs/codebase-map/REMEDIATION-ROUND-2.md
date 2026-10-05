# Remediation Round 2

Second pass, 2026-09-09. Closes the items from `WHATS-STILL-WRONG.md` that were within my power to fix correctly. Every change is verified by the repository's own gates.

---

## What was fixed

### Money correctness

| ID | Issue | Fix |
|---|---|---|
| **H-4** | Ledger duplicate-insert race returned an **error** for a write that had already succeeded | `insertIdempotent` now treats PostgreSQL `23505` as success and re-selects the winning row, matching the handling `runCheckout` already had |
| **H-5** | Payout split math duplicated in `payout-engine.ts` and inline in `commerce.engine.ts` — **and the two rounded in different orders** (`round(cents × 15/100)` vs `round(dollars × 0.15 × 100)`), which can disagree by a cent | Extracted to `packages/engine/src/services/order-split.ts`; both call sites delegate. New test asserts `platformFee + chefPayable === subtotal` across 2,800+ values, so no cent can be created or lost |
| **H-6** | A payout run stuck in `processing` blocked **every** future run of that rail, with no UI control and no documented remediation | `reclaimStalePayoutRun` frees an abandoned run after 15 min via a conditional update (status still `processing` **and** still older than the cutoff), so a genuinely live run is never killed. The reclaim is audit-logged |
| **H-1** | `/api/engine/payouts/{preview,execute}` worked and were correctly guarded, but **nothing in the UI called them** | `PayoutRunControls` on `/dashboard/finance/payouts`. **Preview-first by design**: execute stays disabled until a preview for the *same* rail and period is loaded, and the operator types `RUN` against the exact total. Changing the rail or dates invalidates the preview |

### Verification infrastructure

| ID | Issue | Fix |
|---|---|---|
| **S-7 / T-1** | 316 RLS policies across 112 tables **entirely unverified** — two pgTAP files existed that no workflow ran | Wired into `e2e.yml`, the one job with a real Postgres and the real migrations. Creates `pgtap` on the ephemeral runner DB only, runs each file (they self-rollback), and fails on any `not ok` line |
| **T-8** | Editing an applied migration caused a production incident once, with nothing preventing a repeat | `scripts/audit/verify-migration-immutability.mjs` + a committed checksum manifest. **Proven to catch a real edit.** `--update` is the deliberate path for adding a migration |
| **S-3** | **No dependency scanning of any kind** in a payments repository | Dependabot (grouped, weekly, majors for Next/React/Stripe deliberately excluded) + `pnpm audit --audit-level=high` as a CI gate |
| **S-2** | The guard audit checked only state-changing methods, leaving **every read endpoint outside the gate** | Extended to `GET`/`HEAD` with an explicit `PUBLIC_READ_ALLOWLIST` (the 3 anonymous storefront reads). **Proven to catch both a removed read guard and a removed write guard** |

### Data growth

| ID | Issue | Fix |
|---|---|---|
| **O-4** | No retention, TTL, partitioning or archival anywhere in 63 migrations — and Round 1 made it worse by adding ~63k `ops_processor_runs` rows/month | Migration `00064` adds `prune_expired_data(dry_run)` with explicit per-table windows (locations 30d, tracking 90d, analytics 365d, domain events 180d, processor runs 90d), batched at 50k/table, plus the supporting indexes. New `retention` processor, scheduled daily, with `?dryRun=1`. **Financial and audit tables are deliberately excluded** — pruning those is a compliance decision |

### Reliability & security

| ID | Issue | Fix |
|---|---|---|
| **F-11** | The Stripe payment adapter was registered **only** in `apps/web`, so chef-admin, ops-admin and driver-app built the engine with `paymentAdapter: undefined` and could not void a card hold | Moved into `packages/engine` and made the default in `getAdminEngine()`. `registerPaymentAdapter()` still overrides, for tests. `apps/web` keeps a re-export shim |
| **I-05** | Orders abandoned before payment sat in `checkout_pending` **forever** — no sweeper covered them | `checkAbandonedCheckouts` (60 min, generous so a late webhook never races it) wired into the SLA processor. **Explicitly skips anything with `payment_status = 'completed'`** so a webhook-processing problem is never mistaken for abandonment |
| **S-5** | Uploads trusted the client-declared `Content-Type` | `sniffImageMime` / `resolveVerifiedImageType` verify magic bytes across all three upload routes. 18 tests including a PHP polyglot and a RIFF-that-is-a-WAV |
| **S-6** | Partner `webhook_url` had no egress restriction | `assertSafeWebhookTarget` requires HTTPS and rejects loopback, RFC1918, link-local, CGNAT and IPv6 ULA/link-local — including the cloud metadata endpoint. 18 tests. Blocked destinations are counted separately from failures, since they will never succeed on retry |
| **F-13** | Nominatim had **no timeout**, and the geocode cache was unbounded | 5s `AbortSignal.timeout`; FIFO-bounded cache at 5,000 entries |

### Dead code

Removed: `dispatch.service.ts` (+ its test), the two `package.json` exports pointing at files that **do not exist**, and all **five** unscheduled `/api/cron/*` wrapper routes with their tests and authz contracts. Route count: 181 → **176**.

---

## Verification

Every gate, run end to end after the final change:

```
PASS  verify:prod-data-hygiene      PASS  audit:db-boundary (still exactly 398)
PASS  audit:migrations              PASS  audit:ops-authz          16/16
PASS  typecheck (13/13)             PASS  audit:ops-negative-authz 27/27
PASS  lint (0 errors)               PASS  test:wiring-fixes        95/95
PASS  audit:guards — 176 routes, 3 public reads, 0 unguarded
PASS  test — all workspaces, 0 failures
PASS  build — 4/4 apps compile
```

**Three gates were proven to fail on the defect they exist to catch**, rather than merely passing: the processor method contract, the migration immutability gate, and the extended guard audit.

---

## Mistakes I made and caught

Recorded because two were dangerous:

1. **I briefly broke the guard audit into passing vacuously.** An edit wrote `\s` instead of `\\s` inside a JS template literal — where `\s` means `s` and `\b` is a *backspace*. The regex matched nothing, so the gate reported "0 unguarded" while checking **nothing at all**. Caught only because "public reads 0" contradicted a manual finding of 3.
2. **The retention migration would have failed on 3 of 5 tables.** I assumed `created_at`; the schema uses `recorded_at` (driver_locations, delivery_tracking_events) and `started_at` (ops_processor_runs). Caught by reading the DDL instead of trusting the assumption.
3. **A regex over-deleted 16 of 19 authz contracts** when removing the 5 cron ones. Caught by the gate immediately; restored from git and redone with a brace-matching parser.
4. `pnpm typecheck` passed while `pnpm build` failed — the app's `tsconfig.typecheck.json` did not cover a `src/lib` return-type annotation. **Worth knowing: typecheck is not a substitute for build here.**

---

## Coverage floors I lowered — and why that is not hiding anything

Removing the 5 dead cron routes reduced two hard-coded contract floors (19→16 and 32→27). Lowering a coverage floor is normally a smell, so to be explicit: **coverage of routes that actually exist went up.** Nine cron-wrapper rows disappeared with the routes; four new rows were added for the reconciliation and retention processors. Every remaining route still has a contract, and the gate still enforces `passed === contracts.length`.

---

## Still open — and why

**Needs you, not me:**
- **C-1 — rotate the production database password.** Still sitting in `.env.local`. Highest-value remaining action, takes minutes.
- **C-3 — confirm backups and run one restore drill.** The only item here that can end the business.
- **O-1 — set `NEXT_PUBLIC_SENTRY_DSN` and create one alert rule.** Sentry is wired but events land in a void.

**Needs a decision, not code:**
- **H-2 — HST on the pre-discount amount.** An accounting and legal determination. Get a ruling and I will encode it in a test.
- **A-2 — six tables nothing reads or writes.** Finish the feature or drop the table; either is fine, leaving them is what misleads.
- **H-3 — the "risk engine" does no risk assessment.** Either wire real velocity checks or rename it. Right now the name implies fraud controls that do not exist.

**Deliberately deferred:**
- **A-1 — 7 missing Kitchen OS repositories / 398 raw `.from()` calls.** Large and mechanical. `chef-admin` holds 73 of the 120 affected files and has 18 tests for 161 source files, so rewriting 259 call sites there is high-risk work that wants its own focused pass, domain by domain, with tests written first. Doing it badly would be worse than not doing it.
- **C-2 — Supabase as an unmitigated single point of failure.** Architectural.
- **C-4 — no database rollback path.** Needs an expand/contract migration policy, which is a team practice decision.

**Unchanged and important:** **R-01 is still unproven in production.** Everything above is verified locally. One query after deploy closes it:

```sql
SELECT processor_name, status, max(finished_at), count(*)
FROM ops_processor_runs GROUP BY 1,2 ORDER BY 3 DESC NULLS LAST;
```
