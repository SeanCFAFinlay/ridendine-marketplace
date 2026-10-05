# 19 — Cost and Resource Drivers

> **PRICING NOT VERIFIED.** No vendor price was checked against an authorized current source during this analysis, and none is stated anywhere in this document. Every row identifies *what drives spend* and *where to measure it* — never what it costs. Any figure quoted from memory would be a guess presented as a quote, which is worse than no figure at all.

---

## 1. Cost-driver map

| # | Resource / vendor | Why required | What drives usage | Evidence | Fixed / variable | Where to measure | Current cost known? | Optimisation risk |
|---|---|---|---|---|---|---|---|---|
| **$-01** | **Supabase — database compute** | Single store of record; every request opens a client | Concurrent connections, query complexity, the ops live board's aggregates, Realtime | `packages/db/src/client/*` | Mostly fixed (instance tier) + variable | Supabase dashboard → Database | ❌ | **High.** Downsizing the instance risks connection exhaustion, which is a total outage (F-04). |
| **$-02** | **Supabase — storage** | Profile, dish and delivery-proof images | Upload volume × 5 MB cap; **no deletion or lifecycle policy anywhere** | `apps/*/api/upload/route.ts`; no cleanup job | Variable, **monotonically increasing** | Supabase → Storage | ❌ | Low — orphaned images can be pruned. |
| **$-03** | **Supabase — database storage** | 112 tables, **no retention policy in any of 62 migrations** | `driver_locations` (~4 rows/min per online driver), `delivery_tracking_events`, `analytics_events`, `domain_events`, `audit_logs`, `sla_timers` | §F-16 | Variable, **monotonically increasing** | `pg_total_relation_size` per table | ❌ | Medium — `audit_logs` may have a retention obligation; `driver_locations` almost certainly does not. |
| **$-04** | **Supabase — Realtime** | Live order, offer, and ops-board updates | Concurrent subscribed clients, not request volume | 9 subscribing modules | Variable | Supabase → Realtime | ❌ | Medium — removing Realtime would degrade the driver-offer experience materially. |
| **$-05** | **Supabase — Auth MAU** | All identity | Monthly active users across all four apps | `@supabase/ssr` everywhere | Variable | Supabase → Auth | ❌ | None. |
| **$-06** | **Supabase — egress** | API responses | Payload sizes × request volume | — | Variable | Supabase → Usage | ❌ | Low. |
| **$-07** | **Vercel — function invocations & duration** | Hosting all four apps | Every page render and API call. Widespread `force-dynamic` means **little is statically cached**. | `export const dynamic = 'force-dynamic'` across most routes | Variable | Vercel → Usage | ❌ | Medium — converting marketing pages to static would cut invocations with no behaviour change. |
| **$-08** | **Vercel — build minutes** | CI/CD | **Four separate projects each build the entire monorepo.** One change to a shared package triggers four full builds. | 4 × `vercel.json` with `buildCommand: pnpm build` | Variable | Vercel → Usage | ❌ | Low — Turborepo remote caching or `ignoreCommand` per project would cut this substantially. |
| **$-09** | **Vercel — bandwidth** | Asset and response delivery | Traffic | — | Variable | Vercel → Usage | ❌ | Low. |
| **$-10** | **Vercel — cron invocations** | 3 scheduled entries | `partner-webhooks` runs **every minute = ~43,800 invocations/month** | `apps/ops-admin/vercel.json` | Fixed cadence | Vercel → Cron | ❌ | **Note:** given F-01 these invocations currently do no work — the platform is paying for ~43,800 no-op calls a month. Fixing F-01 will make them useful *and* increase their duration and database load. Budget for that. |
| **$-11** | **Stripe — transaction fees** | Payments | Order volume × order value | `run-checkout.ts` | Variable, revenue-linked | Stripe dashboard | ❌ | None — this is cost of goods sold. |
| **$-12** | **Stripe — Connect + payouts** | Chef and driver payouts | Connected accounts, transfer count, **instant-payout fees** (there is a dedicated `recordInstantPayoutFee` ledger entry) | `payout.service.ts`; `ledger.service.ts` | Variable | Stripe → Connect | ❌ | Low — instant payouts are a driver-experience feature with an explicit fee already modelled in the ledger. |
| **$-13** | **GitHub Actions minutes** | CI | Per push/PR to master/main + a daily CI run + a 6-hourly smoke + a nightly load dry-run + the seeded-Supabase E2E workflow | 4 workflows | Variable | GitHub → Billing | ❌ | Low — the 6-hourly smoke is cheap and is currently the only production monitoring that exists. Do not cut it. |
| **$-14** | **OSRM · Nominatim** | Routing and geocoding | Dispatch and checkout volume | `osrm.provider.ts`, `geocoding.service.ts` | **$0 today** | — | ✅ **Free** | **This is a cost that is deferred, not avoided.** Self-hosting OSRM or moving to Mapbox would introduce a real line item; the current arrangement trades money for reliability risk (X-04, F-13). |
| **$-15** | Resend · Twilio · Upstash | Email, SMS, distributed rate limiting | Message volume; request volume | conditional providers | Variable | Vendor dashboards | ❌ — **and whether they are even enabled is UNKNOWN (U-02)** | Low. |
| **$-16** | **Developer / operator labour** | Manual work the system does not automate | Manual migrations · manual reconciliation (R-02) · manual payout runs (R-04) · manual processor triggering (R-01) · manual incident detection (R-03) | §14, §16 | Variable | Time tracking | ❌ | **Likely the largest and least visible cost in the system today.** |

## 2. Zero-cost items worth noting

| Item | Note |
|---|---|
| Sentry | Installed but never initialised (R-03) — it may or may not be a paid line item, but it is delivering nothing either way. Check whether a Sentry project is being billed for zero events. |
| `.gitnexus/` 309 MB, `.local-tools/` 152 MB, 8 × `graphify-out/` | Local disk only, gitignored. No cloud cost. |
| Mapbox | `MapboxProvider` exists and is never instantiated — no account, no cost. |
| Google Maps | Documented in `.env.example`, never read. Confirm no key is provisioned and idle. |

## 3. Cost anomalies visible from the code

| # | Anomaly | Detail |
|---|---|---|
| A-01 | **~43,800 no-op cron invocations per month.** `partner-webhooks` is scheduled every minute; given F-01 the `GET` handler returns a status object and exits. | Paying for a scheduler that performs no work. |
| A-02 | **Four full monorepo builds per change.** Each Vercel project runs `pnpm install --frozen-lockfile` from the root and `pnpm build`. | Turborepo remote caching, or a per-project `ignoreCommand` that skips builds when the app's inputs are unchanged, would cut this markedly. |
| A-03 | **Unbounded data retention.** `driver_locations` alone accumulates roughly 4 rows/minute per online driver, forever. | Storage cost compounds and query cost rises with it. A retention policy is the single highest-leverage cost change available. |
| A-04 | **`force-dynamic` on marketing pages.** `/about`, `/how-it-works`, `/contact`, `/privacy`, `/terms` and `/chef-resources` have no per-user content but are served dynamically. | Static generation would remove these from the invocation count entirely. |
| A-05 | **Production monitoring is implemented as a GitHub Actions cron.** `post-deploy-smoke.yml` every 6 hours is billed as CI minutes. | Cheap, but it means uptime monitoring is coupled to CI billing and CI availability. |

## 4. How to establish real numbers

1. Vercel → each of the four projects → **Usage**: invocations, duration, bandwidth, build minutes.
2. Supabase → **Reports/Usage**: database size, egress, Realtime peak connections, Auth MAU, storage.
3. Stripe → **Balance / Fees**: processing fees, Connect fees, instant-payout fees. Cross-check against `ledger_entries` grouped by `entry_type`.
4. GitHub → **Billing → Actions**.
5. Confirm whether Resend, Twilio, Upstash and Sentry accounts exist and are billed (U-02).
6. Per-table sizes: `SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 20;`

Only after 1–6 should any optimisation be attempted. **Optimising before measuring, on a system with no observability, would be guessing twice.**

## 5. Optimisation candidates, ranked by benefit ÷ risk

| Rank | Change | Benefit | Risk |
|---|---|---|---|
| 1 | Retention policy on `driver_locations`, `delivery_tracking_events`, `analytics_events`, `domain_events` | Compounding storage + query savings | Low — confirm the audit/legal retention requirement for each table first |
| 2 | Turborepo remote caching or per-project `ignoreCommand` | Cuts build minutes ~4× | Low |
| 3 | Static-generate the six marketing pages | Removes invocations outright | Low |
| 4 | Fix F-01, then right-size the cron cadences (daily offer expiry is wrong; every-minute partner webhooks may be more than needed) | Correctness first, cost second | **Do not reduce cadence before fixing F-01** — you would be tuning something that does not run |
| 5 | Automate reconciliation and payout runs (R-02, R-04) | Removes recurring manual labour ($-16) | Medium — these touch money; test thoroughly |
| 6 | Self-host OSRM | Removes the reliability risk in X-04 | **Adds cost.** This is a reliability purchase, not a saving. |
