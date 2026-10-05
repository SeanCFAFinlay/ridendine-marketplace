# 22 — Risk and Improvement Register

66 findings across 10 categories. Every one is tied to evidence and a concrete consequence. **No code was changed.** Preferences are not recorded as defects; where something is a judgement call it is labelled as one.

Likelihood and severity are reasoned per item, not assigned by category.

---

## A. Immediate safety and reliability risks

| ID | Finding | Evidence | Consequence | Likelihood | Severity | Conf. | Recommended action | Verification | Effort |
|---|---|---|---|---|---|---|---|---|---|
| **R-01** | Vercel Cron invokes the three processors with `GET`; all work is in `POST`, and `GET` is a status-only handler | `apps/ops-admin/vercel.json: crons` vs the three `route.ts`; `scripts/local-cron.mjs` uses POST | No SLA enforcement, no chef-timeout auto-cancel, no driver escalation, no offer expiry, no partner webhook delivery | High | **CRITICAL** | 0.90 | Confirm with U-01. If confirmed, add `export const GET = POST` (or split into a shared handler) and keep the status ping on a sub-path | `SELECT processor_name, max(finished_at) FROM ops_processor_runs GROUP BY 1` returns fresh rows | S |
| **R-02** | `reconciliation-daily` is unscheduled with no processor equivalent | `vercel.json`; `api/cron/reconciliation-daily/route.ts` | Stripe↔ledger divergence goes undetected until bank reconciliation | High | **HIGH** | 1.00 | Promote to `/api/engine/processors/reconciliation` with `ops_processor_runs` tracking; add to `vercel.json` | A daily row appears in `ops_processor_runs` | S |
| **R-03** | Sentry installed, configured, never initialised | `apps/*/next.config.js` (no `withSentryConfig`); no `instrumentation.ts`; 0 imports under `src/`; no Sentry code in `.next` | No error alerting anywhere; every other reliability improvement is unmeasurable | Certain | **HIGH** | 0.95 | Wrap all four `next.config.js` in `withSentryConfig`; add `instrumentation.ts` | Throw a deliberate test exception; confirm it arrives | S |
| **R-04** | Batch payout runs have no trigger — no UI caller and no schedule | `grep "engine/payouts/" apps/ops-admin/src` excluding route files → 0; `/dashboard/finance/payouts` is a read-only list | Chef and driver batch payouts require a hand-crafted HTTP request with an ops cookie | High | **HIGH** | 0.95 | Add preview + execute controls to `/dashboard/finance/payouts`, guarded by `finance_payouts` | An operator can run a payout from the UI | M |
| **R-06** | No DB rollback path while the app rolls back instantly | forward-only migrations; `CLAUDE.md` | An app rollback leaves old code against a new schema | Medium | **HIGH** | 1.00 | Require every migration to be backward-compatible for one release; document the expand/contract rule | A migration checklist exists and is used | M |
| **R-07** | Backups entirely unevidenced | `docs/BACKUP_AND_ROLLBACK.md` configures nothing | Potential unrecoverable data loss | Unknown | **HIGH** | 0.60 (U-04) | Confirm the Supabase backup tier and retention; **perform one restore drill to a scratch project and write down how long it took** | A dated restore-drill record exists | M |

## B. Correctness risks

| ID | Finding | Evidence | Consequence | L | S | Conf. | Action | Verification | Effort |
|---|---|---|---|---|---|---|---|---|---|
| **R-05** | Referral link: wrong TLD **and** non-existent path | `referral-dashboard.tsx: BASE_URL, buildReferralLink`; no `apps/web/src/app/signup/` | Entire referral acquisition channel is dead | Certain | MEDIUM | 1.00 | Build from `NEXT_PUBLIC_APP_URL` + `/auth/signup` | A test asserts the link resolves to a real route | S |
| **I-01** | Ledger duplicate-insert race returns an error rather than an idempotent no-op | `ledger.service.ts: insertIdempotent` vs `run-checkout.ts` which handles `23505` | A money write reports failure for an operation that already succeeded | Low | MEDIUM | 0.90 | Treat `23505` as success and re-select, as checkout does | Concurrency test | S |
| **I-02** | Duplicate payout split math in `payout-engine.ts` and `commerce.engine.ts` | both import `PLATFORM_FEE_PERCENT`, `DRIVER_PAYOUT_PERCENT` | A change to one silently splits the platform's economics | Medium | MEDIUM | 1.00 | Extract one shared `calculateOrderSplit()` | Both call sites use it | S |
| **I-03** | Delivery-fee fallback uses the `@deprecated` $5.00 constant while the distance path uses $3.99 | `computeServerQuote`; `constants.ts: BASE_DELIVERY_FEE` | A customer whose address fails to geocode is charged $1.01 more | Medium | LOW | 1.00 | Use `DELIVERY_BASE_FEE_CENTS` in both paths | Unit test on the no-distance branch | S |
| **I-04** | Lossy legacy status mirror: `READY`/`DISPATCH_PENDING`/`DRIVER_OFFERED`/`DRIVER_ASSIGNED` all collapse to `ready_for_pickup`; `EXCEPTION`/`CANCEL_REQUESTED` both to `pending` | `ENGINE_TO_LEGACY_ORDER_STATUS` | Any query on `status` cannot distinguish awaiting-dispatch from assigned, or normal-pending from exception | Medium | MEDIUM | 1.00 | Audit every `status` consumer; migrate to `engine_status`; then plan the column's removal | No production read of `status` remains | L |
| **I-05** | No sweeper for abandoned `checkout_pending` orders | `sla-checks.ts` covers `pending` only | Dead rows; skewed counts; permanently unresolved orders | High | LOW | 1.00 | Add an abandonment check to the SLA processor (after R-01) | Abandoned orders reach a terminal state | S |
| **I-06** | HST computed on the pre-discount amount, then the discount subtracted from the gross total | `computeServerQuote` | Customers may be charged tax on money they did not pay | Certain (as implemented) | **UNKNOWN — legal** | 1.00 (code) | **Have an accountant rule on it.** This is not a code decision. | A written determination, then a test that encodes it | S once decided |
| **I-07** | `evaluateCheckoutRisk` performs no velocity, device, history or chargeback checks. `checkoutAttemptCount` is optional and `runCheckout` never passes it, so the one behavioural rule can never fire. | `risk.engine.ts: DEFAULT_RISK_LIMITS`; `run-checkout.ts` risk call | The component named "risk" is input validation with a review flag — a misleading name that could give false assurance | Certain | MEDIUM | 1.00 | Either pass `checkoutAttemptCount` and add real velocity checks, or rename it to what it is | Fraud controls are stated explicitly, either way | M |
| **I-08** | `partner-webhooks` processor does not claim `ops_processor_runs` | its `route.ts` has no `claimProcessorRun` | No processor-level idempotency and no health visibility for the only minutely job | Medium | MEDIUM | 1.00 | Add claim/finish as `sla` and `expired-offers` do | It appears in `/api/engine/health` | S |
| **I-09** | No optimistic locking on order transitions | `master-order-engine.ts` | Two simultaneous *legal* transitions from the same state could both proceed | Low | MEDIUM | 0.80 | Add a version column or a conditional `.eq('engine_status', from)` on the update | Concurrency test | M |

## C. Security risks

| ID | Finding | Evidence | Consequence | L | S | Conf. | Action | Effort |
|---|---|---|---|---|---|---|---|---|
| **S-01** | **Live production DB password in plaintext in the working tree** (`.env.local`, untracked and correctly gitignored, but present on disk) | `.env.local`; `git ls-files` → untracked | Full RLS-bypassing database access to anything that can read the machine | Medium | **HIGH** | 1.00 | **Rotate the password.** Keep production credentials in a secret manager or Vercel only. | S |
| **S-02** | No CSP on `chef-admin`, `ops-admin`, `driver-app` | those three `middleware.ts` pass no `cspBuilder` | The highest-privilege surface has the weakest XSS defence in depth | Medium | MEDIUM | 1.00 | Pass a `cspBuilder` — the factory already supports it | S |
| **S-03** | Rate limiting degrades to per-instance memory without Upstash | `rate-limit/index.ts` | `auth` (5/min) and `checkout` (3/min) multiply by instance count | Medium | MEDIUM | 1.00 | Set `UPSTASH_*`, or accept and document | S |
| **S-04** | Guard audit is text-presence only and skips `GET` | `check-api-route-guards.mjs: STATEFUL_METHODS` | A leaking read endpoint would pass CI | Medium | MEDIUM | 1.00 | Extend to `GET`; assert guard-before-mutation ordering | M |
| **S-05** | No dependency vulnerability scanning of any kind | `.github/` has no Dependabot/Renovate/audit/CodeQL | Known CVEs ship unnoticed in a payments system | High | MEDIUM | 1.00 | Add Renovate/Dependabot + `pnpm audit --audit-level=high` | S |
| **S-06** | `/internal/command-center/docs/*` needs only a session, no capability | that route vs the sibling `change-requests` which requires `team_manage` | Any authenticated user could read internal docs when the flag is on | Low | LOW | 1.00 | Add `guardPlatformApi(actor, 'team_manage')` | S |
| **S-07** | Uploads trust the declared `Content-Type` | `api/upload/route.ts: ALLOWED_TYPES` | Content-type confusion | Low | LOW | 1.00 | Verify magic bytes | S |
| **S-08** | No egress allowlist on partner `webhook_url` | `partner-webhooks.ts` | SSRF toward internal addresses via an operator-registered URL | Low | LOW | 0.75 | Block private ranges; require HTTPS | S |

## D. Operability gaps

| ID | Finding | Consequence | Action | Effort |
|---|---|---|---|---|
| **O-01** | No alerting on anything | Detection depends on somebody looking | Route `system_alerts` severity `error` to email/Slack (after R-01/R-03) | M |
| **O-02** | `TRACKED_PROCESSORS` has 3 permanent false negatives and omits `partner-webhooks` | A health signal that cries wolf gets ignored | Fix the list | S |
| **O-03** | No global kill switch for payments, dispatch, payouts or partner ingress; `maintenance_mode` covers only `apps/web` | Cannot stop side effects in an incident | Extend maintenance to all four apps; add per-subsystem flags in `platform_settings` | M |
| **O-04** | No procedure for a stuck `processing` payout run | Blocks all future runs of that type | Add a stale-run reclaim mirroring checkout's 120 s pattern, plus a runbook entry | M |
| **O-05** | Correlation IDs exist but are not applied across most routes | Cannot follow one request through the logs | Apply in a shared route wrapper | M |
| **O-06** | Migrations are manual and out of band from deploys | No ordering guard between schema and code | Add a migration step to the release checklist with an explicit ordering rule | M |
| **O-07** | No external uptime monitoring; the nearest thing is a 6-hourly GitHub Actions cron | Up to 6 hours of undetected downtime | Point an uptime service at each `/api/health` | S |

## E. Test gaps

| ID | Finding | Consequence | Action | Effort |
|---|---|---|---|---|
| **T-01** | No test of the cron→processor HTTP contract | This is exactly where R-01 lives | Assert `GET` performs work | S |
| **T-02** | pgTAP RLS tests exist but no workflow runs them | 316 policies unverified | Add to `e2e.yml` — the stack is already booted there | S |
| **T-03** | `validation`, `routing`, `types`, `ui`, `notifications` tests never run in CI | 15 test files idle; `validation` guards every route boundary | Add five lines to `ci.yml` | S |
| **T-04** | No inventory cache↔ledger consistency test | Silent stock corruption | Assert `computeOnHand(movements) === current_quantity` | S |
| **T-05** | Chef-admin: 18 tests for 161 source files, holding 259 raw DB calls | The least-tested, most boundary-eroded area | Write repositories for the 7 Kitchen OS domains, testing as you go | L |
| **T-06** | No accessibility testing | Legal and usability exposure on a consumer marketplace | Add axe or pa11y to the Playwright suite | M |
| **T-07** | Load test has no pass/fail thresholds | Proves the script runs, not that the system performs | Add p95 and error-rate thresholds; run live against staging | S |
| **T-08** | No migration test, despite a prior incident from editing an applied migration | Repeat of a known production failure | Add a CI check that applied migration files are immutable | S |

## F. Documentation drift

| ID | Finding | Action | Effort |
|---|---|---|---|
| **DOC-01** | `docs/wiring/*` stale: 90/104 pages, ~104/180 endpoints; regenerating breaks a gate because `generate-wiring-docs.cjs:317` marks undetectable-auth surfaces PARTIAL with no allowlist | Add an auth-metadata allowlist to the generator, then regenerate | L |
| **DOC-02** | `PLATFORM_OVERVIEW.md` says 56 pages; actual 104 | Regenerate | S |
| **DOC-03** | `DATABASE_SCHEMA.md` says ~70 tables; actual 112 | Regenerate from migrations | M |
| **DOC-04** | `CLAUDE.md` says 113 tables (112) and "`archive/` empty" (351 generated files); its "two `getEngine`" warning describes a hazard that is real but currently unexercised | Correct three figures | S |
| **DOC-05** | `processors/sla` comment says "every minute"; the schedule is daily | Align comment and schedule | S |

## G. Performance hypotheses

*Each is a hypothesis with a stated measurement — see `18-performance-and-capacity.md`. Not defects until measured.*

| ID | Hypothesis | Measurement |
|---|---|---|
| **P-01** | Checkout latency dominated by Nominatim + OSRM | Per-phase timing in `runCheckout` |
| **P-02** | Nominatim has no timeout and can stall checkout without bound | Force a slow response in staging |
| **P-06** | `driver_locations` growth will degrade queries | Table size over time |
| **P-09** | The SLA processor is unbounded per run and could exceed the function timeout | Per-run duration once R-01 is fixed |

## H. Maintainability

| ID | Finding | Action | Effort |
|---|---|---|---|
| **M-01** | 398 raw `.from()` calls; 7 Kitchen OS domains have no repository at all | Write the 7 missing repositories — this, not the ratchet baseline, is the real task | L |
| **M-02** | Broken `exports` entries `./orders`, `./dispatch` point at deleted files | Delete the two entries | S |
| **M-03** | `dispatch.service.ts` is a dead second implementation exported from the barrel | Remove file, test and export | S |
| **M-04** | Three `getEngine`-shaped factories, two unused, one a module singleton | Remove or rename the two unused | S |
| **M-05** | Web push half-built: subscriptions collected, nothing sends | Implement a sender or remove the surface | M |
| **M-06** | `eslint: { ignoreDuringBuilds: true }` in all four apps | Rely on CI, or re-enable | S |
| **M-07** | CI runs only on `master`/`main`; the current feature branch is not push-gated | Add branch-push triggers or require PRs | S |

## I. Cost visibility

| ID | Finding | Action |
|---|---|---|
| **C-01** | ~43,800 no-op cron invocations/month while R-01 stands | Fix R-01; then right-size cadences |
| **C-02** | Four full monorepo builds per change | Turborepo remote cache or per-project `ignoreCommand` |
| **C-03** | No retention policy anywhere; `driver_locations` grows ~4 rows/min per online driver | Add retention after confirming any audit obligation per table |
| **C-04** | Six marketing pages are `force-dynamic` | Static-generate them |
| **C-05** | No cost telemetry at all | Collect the six dashboard readings in `19` §4 |

## J. From the complete file-level pass

Full detail and evidence: [`program-map/15-findings-from-the-file-level-pass.md`](program-map/15-findings-from-the-file-level-pass.md).

| ID | Finding | Evidence | Consequence | L | S | Conf. | Action | Effort |
|---|---|---|---|---|---|---|---|---|
| **N-01** | **Six tables carry RLS and policies but nothing ever reads or writes them**: `inventory_alerts`, `storage_locations`, `order_pack_checks`, `labor_cost_snapshots`, `kitchen_station_assignments`, `kitchen_ticket_events` | 113 `CREATE TABLE` names vs every literal `.from()`; each of the six confirmed by full-text search and by absence of any SQL-side `INSERT` | Schema implies features that do not exist. `inventory_alerts` is the sharp case — alerts are recomputed per request and never persisted, so no alert can be acknowledged, reported on, or trigger a notification | Certain | LOW–MEDIUM | 0.95 | Per table: finish the feature or drop it in a new migration. Start with `inventory_alerts` | M |
| **N-02** | Complete unguarded-route list compiled — **all 16 are correct** (13 CI-allowlisted, 3 public marketplace `GET` reads) | every `route.ts` enumerated for guard calls | Confirms S-04 is a methodology gap, not a live exposure | — | INFO | 1.00 | None. Fold this list into the guard audit as the expected set | S |
| **N-03** | db-boundary erosion is **120 files**, not just 398 calls — and 73 of them are in `chef-admin` | per-file `.from()` census | `ops-admin` has the largest API surface and only 3 such files, because its repositories exist. Bounds M-01 precisely: 7 repositories retire 73 files | Certain | MEDIUM | 1.00 | Write the 7 missing Kitchen OS repositories | L |
| **N-04** | The two largest files in the repository are documentation generators (2,042 + 923 lines), together ~3× the size of `MasterOrderEngine` | line-count census | Effort has accumulated away from where risk lives; `generate-wiring-docs.cjs` is also what blocks DOC-01 | — | INFO | 1.00 | Consider it when prioritising | — |
| **N-05** | Domain types are declared twice — in `packages/db/repositories/*` and `packages/types/domains/*` (`Cart`, `CartItem`, `CartWithItems`, `ChefProfile`, `ChefStorefront`, others) | symbol index: 82 multi-definition names | Two definitions of one shape drift silently; TypeScript cannot object | Medium | LOW–MEDIUM | 1.00 | Have repositories import from `@ridendine/types` rather than redeclare | M |
| **N-06** | `AuthLayout` (5 definitions) examined and found **benign** — thin per-app adapters over the shared `packages/ui` component | direct read of all 5 files | None. Recorded so nobody "fixes" it | — | INFO | 1.00 | None | — |

## Optional improvements — explicitly *not* defects

These are judgement calls. They are recorded so nobody mistakes them for problems.

- Per-request engine construction is simple and safe; pooling would add complexity for unmeasured gain.
- The dual `engine_status`/`status` columns are a deliberate migration artefact; the lossy mapping (I-04) is the real issue, not the duality itself.
- `force-dynamic` on authenticated pages is correct.
- The service-role-everywhere architecture is a legitimate pattern, not a defect — it simply means the guard layer must be perfect, which is why S-04 matters.

## Priority sequence

**Do these first, in order — each unblocks the next:**

1. **R-03** wire Sentry. Nothing else is measurable until errors are visible.
2. **U-01 → R-01** confirm and fix the scheduler. This is the difference between an automated and a manual platform.
3. **S-01** rotate the exposed database credential.
4. **R-02, R-04** give reconciliation and payout runs a real trigger.
5. **U-04 → R-07** confirm backups and run one restore drill.
6. **T-01, T-02, T-03** close the three cheap test gaps (a day's work, high return).
7. **S-02, S-05** CSP on the other three apps; dependency scanning.
8. **R-05** fix the referral link.
9. **M-01** begin the Kitchen OS repositories — the largest and least urgent item.
