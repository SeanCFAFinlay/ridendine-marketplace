> **SUPERSEDED IN PART — 2026-09-09.** A second remediation round closed
> H-1 (payout UI), H-4 (ledger race), H-5 (duplicate split math), H-6 (stuck
> payout runs), O-4 (retention), S-3 (dependency scanning), S-5 (upload
> verification), S-6 (SSRF guard), S-7/T-1 (pgTAP RLS in CI), T-8 (migration
> immutability), I-05 (abandoned checkouts), F-11 (payment adapter), and the
> dead-code items in A-3. See `REMEDIATION-ROUND-2.md` for what changed and
> `§0` below for what is still merely fixed-in-code rather than proven in
> production.
>
> Everything in §1 Critical remains open — all three need you, not me.

# What Is Still Wrong

Current state after the fixes in `DEPLOY-THESE-FIXES.md`. Verified against the working tree, not written from memory.

**Read this first:** the ten things I fixed are fixed *in code*. Several are **not yet proven in production**, and one of them is the most consequential finding in the whole analysis. Fixed-in-code and working-in-production are different claims, and this document keeps them apart.

---

## 0. The honest status of the "fixed" items

| Item | Code | Production | What closes the gap |
|---|---|---|---|
| **R-01 processors never ran** | ✅ Fixed, regression-tested | ❓ **UNPROVEN** | One query: `SELECT processor_name, max(finished_at) FROM ops_processor_runs GROUP BY 1`. Until that returns fresh rows, the platform's background automation is still unconfirmed. |
| **R-03 Sentry inert** | ✅ Wired, `instrumentation.js` emits in all 4 builds | ❓ **UNPROVEN, and incomplete** | `NEXT_PUBLIC_SENTRY_DSN` must be set in Vercel, and **no alert rules exist** — see O-01 below. Sentry currently receives events into a void. |
| **R-02 reconciliation unscheduled** | ✅ New processor, scheduled | ❓ Unproven | Same `ops_processor_runs` query |
| **S-02 no CSP on 3 apps** | ✅ Added | ⚠️ **Untested in a browser** | A CSP blocks by default. Smoke-test the maps, Stripe onboarding and Realtime with the console open. |
| R-05 referral link · I-03 fee · I-08 tracking · O-02 health · T-01/T-03 tests | ✅ Fixed and tested | ✅ Deterministic | Nothing further |

**So: of 10 fixes, 4 remain unverified against a live environment, and 2 of those are the ones that matter most.**

---

## 1. Critical — unresolved

### C-1 · A live production database password sits in the working tree
`.env.local` at the repository root holds a Supabase connection string **including the password**, pointing at an `aws-1-us-east-1` pooler. It is untracked and correctly gitignored, so it is not in Git history — but it is readable by every process, backup, sync client and agent with access to this machine, and it grants **full RLS-bypassing access** to production.

**I could not fix this for you.** Rotate the password, then keep it only in Vercel or a secret manager. This is the single highest-value action remaining and it takes minutes.

### C-2 · Supabase is an unmitigated single point of failure
Every request in all four apps opens a Supabase client. There is **no retry, no circuit breaker, no read replica, no degraded read path, and no cached fallback anywhere in the code**. If Supabase is unavailable, the entire platform — customer, chef, driver, ops — is down, and nothing in the application can soften it.

This is architectural, not a bug. It is worth stating plainly because no amount of processor or monitoring work changes it.

### C-3 · Backups are still entirely unevidenced
`docs/BACKUP_AND_ROLLBACK.md` exists and configures nothing. Nothing in the repository schedules, verifies or tests a backup or a restore. Combined with forward-only migrations and **no database rollback path** (C-4), the recovery story for a bad migration or data-loss event is unknown.

**An untested backup is a hypothesis.** Confirm the Supabase tier and retention, then restore once into a scratch project and time it.

### C-4 · The app rolls back instantly; the database cannot roll back at all
Vercel can promote a previous deployment in seconds. Migrations are forward-only by policy. Roll the app back after a migration has been applied and you are running old code against a new schema, with no guard against it. There is no expand/contract discipline documented or enforced.

---

## 2. High — money and correctness

### H-1 · Batch payout runs still have no trigger
`/api/engine/payouts/{preview,execute,instant}` work and are correctly guarded. **Nothing calls them.** `/dashboard/finance/payouts` is a read-only list, and `/dashboard/finance/instant-payouts` contains no `fetch` at all. Paying chefs and drivers in batch requires hand-crafting an HTTP request with an ops session cookie.

Worse after my changes in one narrow sense: the two payout *preview* routes are now reachable **only** through legacy `/api/cron/*` endpoints that nothing schedules. `previewChefRun`/`previewDriverRun` have exactly three call sites, none of which a human can reach through the UI.

I left this deliberately — adding a "Run payout" button is a money-touching design decision (who may trigger it, what confirmation, what preview) that shouldn't be my guess.

### H-2 · HST is charged on the pre-discount amount
```
tax   = (subtotal + deliveryFee + serviceFee) × 13%
total = subtotal + deliveryFee + serviceFee + tax + tip − promoDiscount
```
The customer pays tax computed on an amount larger than what they were actually charged. Whether that is correct depends on the legal character of the promotion. **This is an accounting and legal determination, not a code one** — but it has revenue and compliance consequences on every discounted order, and it is unresolved.

### H-3 · The "risk engine" does no risk assessment
`evaluateCheckoutRisk` is a pure function that checks: customer id present, cart id present, amount is a positive integer, currency in `['cad','usd']`. That's it. No velocity, no device fingerprint, no card history, no chargeback history, no address mismatch. The one behavioural rule (`checkoutAttemptCount ≥ 5`) **can never fire, because `runCheckout` never passes that field.**

It is honest code with a dangerously reassuring name. Anyone reading the architecture would reasonably assume fraud controls exist. They do not.

### H-4 · Ledger writes still lose a concurrency race
`LedgerService.insertIdempotent` does select-then-insert. The unique index guarantees no duplicate row, but on a genuine concurrent duplicate the second insert returns an **error**, not an idempotent no-op — unlike `runCheckout`, which handles PostgreSQL `23505` explicitly. A money-write path can report failure for an operation that already succeeded.

### H-5 · Payout split math is still duplicated
The same `PLATFORM_FEE_PERCENT` / `DRIVER_PAYOUT_PERCENT` arithmetic exists in both `payout-engine.ts` and inline in `commerce.engine.ts`. They agree today. Change one and the platform's economics silently fork.

### H-6 · A stuck payout run blocks all future runs, with no procedure
`payout_runs_one_processing_per_type` is a partial unique index — correct for safety. But a run left in `processing` by a lambda timeout blocks every subsequent run of that type, and there is **no UI control, no stale-run reclaim, and no documented remediation.** Fixing it means a manual `UPDATE` after reading `ledger_entries` to work out what actually completed. Checkout has exactly this problem solved (a 120-second stale reclaim); payouts do not.

---

## 3. High — operability

### O-1 · There is still no alerting
Sentry is now wired, which is necessary but not sufficient. **No alert rules, no notification routing, no on-call path exists.** Errors will land in Sentry and sit there. `system_alerts` rows — which the SLA processor will now finally start writing — are read by nobody automatically.

The gap this leaves: detection still depends on a human deciding to look. That was the root problem before Sentry, and Sentry alone does not close it.

### O-2 · No uptime monitoring
The closest thing remains `post-deploy-smoke.yml` on a 6-hour schedule. **Up to six hours of complete outage could pass unnoticed.**

### O-3 · No global kill switch
`maintenance_mode` stops customer web traffic only. Chef, ops and driver apps have no maintenance gate. There is no way to stop payments, dispatch, payouts or partner ingress platform-wide in an incident.

### O-4 · Data grows without bound — and I made this slightly worse
There is **no retention policy, no TTL, no partitioning and no archival anywhere in 62 migrations.** `driver_locations` accumulates ~4 rows/minute per online driver, forever. `delivery_tracking_events`, `analytics_events`, `domain_events` and `audit_logs` are all unbounded.

**My change adds to this:** `partner-webhooks` now writes an `ops_processor_runs` row every minute (~43,800/month), and the more frequent SLA and expired-offer cadences add their own. That was the right trade for idempotency and health visibility, but it makes a retention policy more urgent, not less.

### O-5 · Correlation IDs exist and are barely used
`getCorrelationId`/`withCorrelationId` are implemented and applied on the Stripe webhook. **Not applied across the other ~179 routes.** You still cannot follow one request through the logs.

### O-6 · Migrations are manual and out of band
`pnpm db:migrate` is a hand-run command, decoupled from deployment, with no ordering guard between schema and code. The repository records that editing an applied migration once caused a production incident — and there is still **no test preventing it.**

---

## 4. Medium — security

| ID | Issue | State |
|---|---|---|
| **S-1** | **Rate limiting degrades silently to per-instance memory** when `UPSTASH_*` is unset. On Vercel that multiplies the effective limit by instance count. `auth` (5/min) and `checkout` (3/min) both depend on it. Whether Upstash is configured in production is **still unknown**. | Unresolved |
| **S-2** | **The guard audit is a text-presence check that skips `GET` entirely.** It asserts a guard *string* appears in the file — not that it runs before the mutation, nor that it's the right guard for the resource. I verified separately that all 16 currently-unguarded routes are legitimately public, so this is a methodology gap rather than a live exposure — but it will not catch the next mistake. | Unresolved |
| **S-3** | **No dependency vulnerability scanning of any kind** — no Dependabot, Renovate, `pnpm audit` step, or CodeQL, in a repository that processes payments. | Unresolved |
| **S-4** | `/internal/command-center/docs/*` serves any file under `docs/` to **any authenticated session** with no capability check, while its sibling API correctly requires `team_manage`. Production-disabled unless flagged. | Unresolved |
| **S-5** | File uploads trust the declared `Content-Type` rather than inspecting magic bytes. | Unresolved |
| **S-6** | Partner `webhook_url` has no egress allowlist or private-IP block — a mild SSRF surface via operator-registered URLs. | Unresolved |
| **S-7** | **316 RLS policies across 112 tables are entirely unverified.** Two pgTAP test files exist; **no workflow runs them.** Confirmed still true. | Unresolved (see T-1) |

---

## 5. Medium — reliability

- **A driver can silently vanish from dispatch.** Presence goes stale after 90 seconds; a backgrounded tab stops posting location and the driver stops receiving offers **with no UI warning.** They will not know why work dried up.
- **OSRM and Nominatim are free public services carrying production traffic.** No key, no contract, no SLA, and Nominatim's fetch still has **no timeout at all**. Degradation is silent. `MapboxProvider` exists as a ready-made mitigation and is still never instantiated.
- **The Stripe payment adapter is registered only in `apps/web`.** In chef-admin, ops-admin and driver-app the engine is built with `paymentAdapter === undefined`, so a chef rejecting an order there cannot void the Stripe payment from that process.
- **No sweeper for abandoned `checkout_pending` orders.** A customer who abandons the page after `POST /api/checkout` leaves a row that never resolves. The SLA checks only cover orders that already reached `pending`.
- **No optimistic locking on order transitions.** Two simultaneous *legal* transitions from the same state could both proceed — the state machine rejects illegal moves, not concurrent ones.
- **The inventory cache can drift from its ledger with nothing to detect it.** On-hand stock is authoritative as the signed sum of `inventory_stock_movements`; `inventory_items.current_quantity` is a cache. **No reconciliation job exists for it.**
- **The `orders.status` legacy mirror is lossy.** Four dispatch states collapse to `ready_for_pickup`; `EXCEPTION` and `CANCEL_REQUESTED` both collapse to `pending`. Any query written against `status` cannot distinguish awaiting-dispatch from assigned, or a normal pending order from one in an exception.

---

## 6. Medium — testing

| Gap | State |
|---|---|
| **pgTAP RLS suite never runs** | Confirmed still true. `e2e.yml` already boots a real Supabase stack — this is close to a one-line addition and remains the highest-value test gap. |
| **No inventory cache/ledger consistency test** | Unresolved |
| **chef-admin: 18 tests for 161 source files** | The least-tested app, and the one holding 259 of the 398 raw DB calls |
| **No accessibility testing** | No axe, pa11y or Lighthouse anywhere, on a consumer marketplace |
| **No migration immutability test** | Despite a prior production incident from exactly this |
| **Load test has no thresholds** | Exits non-zero only if the script itself crashes; nightly run is dry-run |
| **Stripe is mocked everywhere** | Signature construction and the live/test dual-secret path are never exercised against a real signature |

---

## 7. Architectural debt

### A-1 · 398 raw `.from()` calls across 120 files
Unchanged — I added none. Seven Kitchen OS domains (recipes, inventory, production, purchasing, suppliers, labour, kitchen) still have **no repository at all**, which is why chef-admin alone holds 73 of those files. `ops-admin` proves the pattern works: largest API surface, only 3 such files, because its repositories exist.

### A-2 · Six tables nothing reads or writes
`inventory_alerts`, `storage_locations`, `order_pack_checks`, `labor_cost_snapshots`, `kitchen_station_assignments`, `kitchen_ticket_events` — created with RLS and policies, zero readers, zero writers, zero SQL-side inserts. `inventory_alerts` is the sharp one: alerts are recomputed in memory on every request and never persisted, so **no alert can be acknowledged, reported on, or trigger a notification.**

### A-3 · Dead code still present — all verified still there
- `packages/engine/src/services/dispatch.service.ts` — a dead second dispatch implementation, exported from the barrel, called by nothing
- `@ridendine/engine` still exports `./orders` and `./dispatch`, **both pointing at files that do not exist**
- **Five** legacy `/api/cron/*` routes, none scheduled
- Two unused `getEngine` factories with a name that collides with the one everything actually uses
- Web push: subscriptions collected and stored, **nothing anywhere sends a push**

### A-4 · Domain types declared twice
`Cart`, `CartItem`, `CartWithItems`, `ChefProfile`, `ChefStorefront` and others exist in both `packages/db/repositories/*` and `packages/types/domains/*`. Two definitions of one shape drift silently and TypeScript cannot object.

### A-5 · Documentation still contradicts the code
`PLATFORM_OVERVIEW.md` says 56 pages (actual 104). `DATABASE_SCHEMA.md` says ~70 tables (actual 112). `docs/wiring/*` documents 90 pages and ~104 endpoints against 104 and 181. Regenerating still breaks a gate, because `generate-wiring-docs.cjs:317` marks any surface with undetectable auth as PARTIAL with no allowlist — and that file, at 2,042 lines, is the **largest file in the repository.**

---

## 8. What I would do next, in order

1. **Rotate the database credential** (C-1). Minutes, and it is the largest exposure.
2. **Deploy and run the `ops_processor_runs` query** (§0). Until that returns fresh rows, you do not know whether the platform's automation works. Everything else in reliability is downstream of this answer.
3. **Set the Sentry DSN and create one alert rule** (O-1). Sentry without routing is a log nobody reads.
4. **Confirm backups and run one restore drill** (C-3). The only item here that can end the business.
5. **Run the pgTAP RLS suite in CI** (S-7/T-1). The stack is already booted in `e2e.yml`; 316 policies are currently unverified.
6. **Add a retention policy** (O-4) — now more urgent because of my own changes.
7. **Give payout runs a UI trigger** (H-1) and **a stale-run reclaim** (H-6).
8. **Get a ruling on the HST question** (H-2), then encode it in a test.
9. **Decide on the six orphan tables** (A-2) — finish or drop, but stop implying features that do not exist.
10. **Write the seven missing Kitchen OS repositories** (A-1). Large, mechanical, lowest urgency.

---

## 9. The honest summary

The engineering in this codebase is, in places, genuinely good: the checkout saga, the idempotency design backed by real database constraints, the capability matrix, the Stripe amount assertion, and the partner test-mode isolation are all better than typical.

What it lacks is not craft but **feedback**. The system records what happened superbly and notices what is happening barely at all. Almost every remaining item above is a variant of the same problem: something can go wrong and nobody finds out — the cron that did nothing for months, the reconciliation that never ran, the referral channel that was dead on arrival, the six tables holding data that never existed, the RLS policies nobody has ever tested.

The fixes shipped so far close the loudest of those. They do not yet change the fact that **the platform still cannot tell you when it is broken.** That is the next real piece of work, and steps 2, 3 and 4 above are the whole of it.
