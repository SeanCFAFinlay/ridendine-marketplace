# Deploying these fixes — read before merging

**⚠ The single most important thing on this page:** the scheduled processors have, on the evidence, **never executed in production**. This change makes them execute. The first run will act on every order and delivery that has been accumulating since launch. Do not merge this straight to `master` and walk away.

---

## 1. What changed

| # | Issue | Fix | Risk of the fix |
|---|---|---|---|
| R-01 | Vercel Cron sends `GET`; all processor work was in `POST`, so nothing ran | `GET` now performs the work on all processors; `?mode=status` preserves the readiness ping | **See §2 — this is the one to be careful with** |
| R-02 | Stripe↔ledger reconciliation was scheduled nowhere | New `/api/engine/processors/reconciliation`, scheduled daily 03:30 UTC, keyed on the reconciled date | Low — read-mostly, idempotent per day |
| R-03 | Sentry installed but never initialised | `withSentryConfig` + `src/instrumentation.ts` + `global-error.tsx` in all four apps | Low — inert without `NEXT_PUBLIC_SENTRY_DSN` |
| R-05 | Referral links used the wrong domain **and** a non-existent path | Built from `NEXT_PUBLIC_APP_URL` + `/auth/signup` | None |
| S-02 | Only `apps/web` had a CSP | Shared `buildContentSecurityPolicy` in `@ridendine/auth`, adopted by all four apps | **Medium — see §3** |
| I-03 | Failed geocode silently charged $1.01 more | Both fee paths now start from `DELIVERY_BASE_FEE_CENTS` | None |
| I-08 | `partner-webhooks` had no run tracking | Now claims/finishes `ops_processor_runs` | Low |
| O-02 | Health tracked 3 unscheduled processors and omitted a scheduled one | `TRACKED_PROCESSORS` now mirrors `vercel.json`; env readiness split required/optional | None |
| T-01 | Nothing tested the cron→processor contract | `scripts/smoke/processor-method-contract.test.cjs`, wired into `test:wiring-fixes` | None |
| T-03 | 5 packages' tests never ran in CI | Added to `ci.yml` — 108 tests now execute | None |

**Verified locally:** `typecheck` · `lint` (0 errors) · `audit:guards` · `audit:db-boundary` (still exactly 398, no new raw calls) · `verify:prod-data-hygiene` · `test:wiring-fixes` (90/90) · full unit suite (**1,035 app tests + all package tests, 0 failures**) · `pnpm build` (all 4 apps compile).

The regression test was verified to actually fail when the R-01 defect is reintroduced — not just to pass.

---

## 2. ⚠ First processor run — do this in a controlled window

When the SLA processor runs for the first time it will immediately act on the **entire accumulated backlog**:

- `checkChefAcceptanceTimeout(5 min)` → **auto-cancels every order** still sitting unaccepted past 5 minutes. If months of stale `pending` orders exist, they all cancel at once, each firing a cancellation notification.
- `checkDriverAssignmentTimeout(10 min)` → writes a `system_alerts` row per stranded delivery.
- `checkStalePreparingOrders(45 min)` → another `system_alerts` row per stale order.

`expired-offers` and `partner-webhooks` are far safer — the first sweeps stale offers, the second delivers queued partner webhooks (which could still mean a burst to partner endpoints).

**Recommended sequence:**

```sql
-- 1. Measure the blast radius FIRST, on production, before deploying.
SELECT engine_status, count(*)
FROM orders
WHERE engine_status = 'pending'
  AND created_at < now() - interval '5 minutes'
GROUP BY 1;

SELECT count(*) FROM deliveries
WHERE status = 'unassigned' AND created_at < now() - interval '10 minutes';

SELECT count(*) FROM partner_webhook_deliveries WHERE status <> 'delivered';
```

2. **If those counts are large**, clean up the backlog manually (or deliberately accept the mass cancellation) *before* the first scheduled run.
3. Deploy with the crons **removed** from `vercel.json`, then trigger one run by hand and read the response:
   ```bash
   curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
     https://ops.ridendine.ca/api/engine/processors/sla
   ```
4. Confirm the result, then add the crons back and deploy.

**Confirm it is now genuinely running:**
```sql
SELECT processor_name, status, max(finished_at) AS last_finished, count(*)
FROM ops_processor_runs GROUP BY 1,2 ORDER BY last_finished DESC NULLS LAST;
```
Fresh `completed` rows for all four processors = R-01 is closed. This query was previously the way to *prove* the bug; it is now the way to prove the fix.

---

## 3. ⚠ CSP on three apps that never had one

`chef-admin`, `ops-admin` and `driver-app` now send a Content-Security-Policy. A CSP is a blocklist by default, so **anything I failed to allow will silently break in the browser console.**

Origins were derived from the actual code — Stripe for chef-admin, OSM tiles for both maps, `cdnjs.cloudflare.com` for the driver app's Leaflet marker images and stylesheet, `wss://*.supabase.co` for Realtime (which the old `apps/web` CSP did not list explicitly).

**Smoke-test in a preview deployment with the browser console open**, specifically:
- chef-admin → Stripe Connect onboarding (`/dashboard/payouts`)
- ops-admin → `/dashboard/map` live map
- driver-app → `/delivery/[id]` route map, marker icons, and the offer alert (Realtime)
- web → checkout card form

Any breakage appears as a `Refused to load…` console error naming the exact directive. Add the origin to `packages/auth/src/csp.ts` with a comment citing the code that needs it.

---

## 4. Cron cost — this increases invocations

Cadences were wrong independently of the method bug: expired offers have a **60-second** TTL but were swept **daily**.

| Processor | Was | Now | Why |
|---|---|---|---|
| `sla` | `0 2 * * *` (daily) | `*/2 * * * *` | Timeouts are 5/10/45 min; ±5 min on a 5-min deadline is 100% overshoot |
| `expired-offers` | `0 3 * * *` (daily) | `* * * * *` | Matches the 60 s offer TTL |
| `partner-webhooks` | `* * * * *` | unchanged | |
| `reconciliation` | *(not scheduled)* | `30 3 * * *` | New |

Invocations rise from ~43,800/month to **~108,000/month** — and unlike before, each one now does real work and real database queries. Confirm your Vercel plan allows sub-daily crons (Hobby does not) and that the volume is acceptable. If you want to trim, `sla` at `*/5` is the safest lever.

**Also note:** `partner-webhooks` now writes an `ops_processor_runs` row every minute — ~43,800 rows/month into a table with **no retention policy** (finding F-16). Worth adding a retention job.

---

## 5. Not fixed here — these need your decision

| Issue | Why I stopped |
|---|---|
| **S-01 — live DB password in `.env.local`** | **I cannot rotate a production credential for you.** Do this yourself, first: rotate the Supabase database password, then keep it only in Vercel/a secret manager. It is untracked and gitignored, but readable by anything with access to this machine. |
| **R-04 — batch payout runs have no UI trigger** | The API works and is correctly guarded; adding "Run payout" to `/dashboard/finance/payouts` is a UI change touching money. It needs a design decision (who can trigger, what confirmation, what preview) rather than my guess. |
| **I-06 — HST charged on the pre-discount amount** | An accounting and legal determination, not a code one. Get a ruling, then I can encode it in a test. |
| **N-01 — six tables nothing reads or writes** | `inventory_alerts`, `storage_locations`, `order_pack_checks`, `labor_cost_snapshots`, `kitchen_station_assignments`, `kitchen_ticket_events`. Each is either an unfinished feature or dead scaffolding — a product call, not a cleanup. |
| **M-01 — 7 missing Kitchen OS repositories** | Large, mechanical, and best done domain by domain with tests. |
| **U-04 — backups unverified** | Requires Supabase console access. Please confirm the tier and **run one restore drill**. |

---

## 6. Suggested merge path

1. Rotate the database credential (§5).
2. Open a PR to `master` — CI runs the full gate, including the new processor contract test and the 108 newly-executing package tests.
3. Deploy to preview; smoke-test the CSP surfaces (§3).
4. Measure the processor backlog (§2) and clean up if needed.
5. Merge; deploy with crons removed; trigger one manual run; verify `ops_processor_runs`; restore the crons.
6. Set `NEXT_PUBLIC_SENTRY_DSN` and throw one deliberate error to confirm Sentry receives it.

Steps 1 and 4 are the ones that will hurt if skipped.
