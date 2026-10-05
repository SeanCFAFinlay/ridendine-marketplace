# 18 — Performance and Capacity

**No benchmark was run and no production measurement was available.** Every item below is a *hypothesis* derived from reading code, each paired with the specific measurement that would confirm or refute it. Nothing here should be treated as a measured fact.

---

## 1. Performance-sensitive paths

| Path | Why it matters | Budget in code |
|---|---|---|
| `POST /api/checkout` | The revenue path. Performs 8+ sequential DB round trips, 1–2 external HTTP calls (Nominatim/OSRM) and 2 Stripe calls before responding. | None declared |
| `POST /api/webhooks/stripe` | Stripe expects a timely 2xx or it retries | None declared |
| `GET /api/storefronts` + `/[id]/menu` | Every customer session hits these | None |
| `DriverMatchingService.findEligibleDrivers` → `rankCandidates` | Runs per dispatch; the OSRM call is on the critical path | **12 s + 2 retries = up to ~36 s worst case** |
| `POST /api/location` | 4 writes/min per online driver | Rate limit 24/min |
| Ops live board | Realtime + several aggregate queries | None |
| Kitchen OS P&L / costing | Multi-table aggregation | None |

## 2. Hypotheses, each with its measurement

| # | Hypothesis | Evidence | Measurement that would settle it |
|---|---|---|---|
| **P-01** | **Checkout latency is dominated by external calls, not the database.** Nominatim (no timeout) and OSRM (up to 36 s) sit inline before the PaymentIntent is created. A slow Nominatim response stalls checkout with no upper bound. | `geocoding.service.ts` sets no timeout; `osrm.provider.ts` sets 12 s × 3 attempts | Instrument `runCheckout` with per-phase timing; compare p95 of geocode+route against total. |
| **P-02** | **A single Nominatim stall can hang a checkout indefinitely.** The `fetch` has no `AbortSignal`. | `geocoding.service.ts: geocodeAddress` | Force a slow response in staging and observe the request duration and Vercel timeout behaviour. |
| **P-03** | **Engine construction per request is measurable overhead.** `getAdminEngine()` builds ~25 objects (`createCentralEngine`) on every privileged request. Most are cheap constructor calls, but it happens 180 routes' worth of times. | `client-helpers.ts: getAdminEngine`; `engine.factory.ts: createCentralEngine` | Micro-benchmark `createCentralEngine` against a mock client; compare to observed p50 route latency. |
| **P-04** | **Nested PostgREST selects in dispatch may be N+1-shaped.** `DispatchOrchestrator.requestDispatch` uses a deep embedded select (`orders → chef_storefronts → chef_profiles, chef_kitchens; customer_addresses`). PostgREST resolves embeds as joins, so this is probably *not* N+1 — but the pattern recurs across `apps/*` in loops. | `dispatch-orchestrator.ts: requestDispatch` | `EXPLAIN ANALYZE` the generated SQL; enable `pg_stat_statements` and look for repeated single-row selects. |
| **P-05** | **Index coverage on hot filters is unverified.** `00007` adds `idx_orders_engine_status`, `idx_ledger_entries_{order,type,entity,stripe}`. Whether the ops live-board and driver-matching filters (`driver_presence.last_location_at`, `deliveries.status`, `assignment_attempts.expires_at`) are indexed was **not confirmed** — the migrations were grep-analysed, not exhaustively read. | `supabase/migrations/*` | `SELECT * FROM pg_stat_user_indexes` plus `EXPLAIN` on the live-board and matching queries. |
| **P-06** | **`driver_locations` grows without bound and will eventually slow every query that touches it.** ~4 rows/min per online driver, no retention policy in any of the 62 migrations. | §F-16 | `SELECT pg_size_pretty(pg_total_relation_size('driver_locations'))` and row count over time. |
| **P-07** | **Realtime connection count scales with concurrent users, not requests.** Six components subscribe (`use-order-stream`, `notification-bell`, `use-storefront-orders-realtime`, `offer-alert`, `use-ops-live-feed`, `live-map`, `ops-alerts`, `real-time-stats`). Supabase Realtime has per-plan connection limits. | `grep .channel(` → 9 subscribing modules | Supabase dashboard → Realtime concurrent connections vs plan limit. |
| **P-08** | **Serverless cold starts affect the first request after idle.** Four apps, each bundling the full engine, `@supabase/supabase-js` and `stripe`. No `regions` or `memory` tuning in any `vercel.json`. | all four `vercel.json` | Vercel Analytics cold-start rate and TTFB distribution. |
| **P-09** | **The SLA processor is unbounded in work per run and could exceed the function timeout.** It loops over every chef timeout, every driver timeout and every stale order with no batch limit, and no `maxDuration` is configured. At scale it would time out mid-run — and since `finishProcessorRun` is only called at the end, the run row would be left claimed. | `processors/sla/route.ts`; no `maxDuration` in `vercel.json` | Once F-01 is fixed: log per-run duration and item counts; compare against the function timeout. |

## 3. Practices already in place

| Practice | Status |
|---|---|
| Connection pooling | ✅ The on-disk `DATABASE_URL` targets a Supabase **pooler** endpoint; the app tier uses PostgREST, which pools server-side |
| Caching | ✅ Tax rates 60 s · maintenance flag 30 s · geocode results (unbounded) · Turbo build cache |
| Rate limiting | ✅ 11 policies, though see V-04 |
| Batching | ⚠️ `insertNotifications` batches announcement fan-out; the SLA processor does not batch |
| Pagination | ⚠️ `supabase/config.toml: max_rows = 1000` caps PostgREST responses. Whether every list route paginates was not audited. |
| Payload size | ✅ Uploads capped at 5 MB with a MIME allowlist |
| Async offload | ❌ **No queue.** Everything happens inline in the request or in a cron-triggered processor. |
| Sync work in the request path | ⚠️ Geocoding, routing and Stripe calls are all inline in checkout |
| Image optimisation | ✅ `next/image` with `remotePatterns` for `*.supabase.co` and `images.unsplash.com` |
| Static generation | ⚠️ `export const dynamic = 'force-dynamic'` is widespread; most pages are dynamic |

## 4. Scale-out constraints

| Constraint | Detail |
|---|---|
| **Database** | Single Postgres instance. No replica, no sharding, no read/write split. This is the ceiling for the whole platform. |
| **Rate limiting** | Per-instance without Upstash — limits become meaningless as instance count grows. |
| **In-memory caches** | Per-instance. Tax rates, maintenance flag and geocode results are each cached independently in every lambda, so hit rates fall as the fleet grows. |
| **Realtime** | Per-plan connection limits at Supabase. |
| **OSRM/Nominatim** | **The hardest external ceiling.** Free public services with fair-use policies. Their limits, not Ridendine's, will bind first as dispatch volume grows. |
| **Cron concurrency** | `payout_runs_one_processing_per_type` deliberately serialises payout runs — correct for safety, a throughput ceiling by design. |
| **Vercel** | Function timeout and concurrency limits by plan; none tuned in the repository. |

## 5. Capacity questions that cannot be answered from the repository

1. Current orders/day, peak concurrency, p50/p95 latency.
2. Database size, growth rate, and the largest tables today.
3. Realtime concurrent connections vs the plan limit.
4. Cold-start frequency and cost.
5. Actual OSRM/Nominatim call volume — and whether either is already rate-limiting Ridendine silently.

All five require production telemetry, which does not exist today (R-03). **Fixing observability is a prerequisite for any real performance work**; without it, every optimisation would be unverifiable.

## 6. The one existing load test

`scripts/load/run-load-smoke.mjs` (`pnpm test:load`): two scenarios — `GET /api/health` (read-only) and `POST /api/support` (**a real write**, chosen deliberately to exercise the write-path rate limiter). Reports p50/p95/p99, error rate and 429 counts per scenario.

**It has no thresholds.** It exits non-zero only if the script itself crashes. The nightly workflow runs it in `--dry-run` mode, which prints the resolved configuration and exits — so the nightly job proves the toolchain works, not that the system performs. Live mode must be triggered manually and creates up to 40 real support submissions per run.

**Recommendation:** add p95 and error-rate thresholds, and point the nightly live run at a staging deployment rather than leaving it dry-run against production.
