# 14 — Reliability and Failure Modes

Severity is reasoned from impact × likelihood, not assigned by category.

Diagram source: [`diagrams/failure-and-recovery.mmd`](diagrams/failure-and-recovery.mmd)

---

## 1. Failure-mode register

| ID | Component / flow | Failure | Cause | Detection | User impact | Recovery | Existing control | Gap | Severity | Evidence |
|---|---|---|---|---|---|---|---|---|---|---|
| **F-01** | C-08 scheduled processors | **All scheduled work is a no-op** | Vercel Cron issues `GET`; the work is exported as `POST`; `GET` returns `{status:'ready'}` | **None.** `/api/engine/health` does not track `partner-webhooks` at all, and nothing alerts on a null `lastSuccessAt` | Chef-timeout orders never auto-cancel · no-driver deliveries never escalate · stale offers accumulate · partners never receive webhooks | Manual `curl -X POST` per processor | Token auth works; `ops_processor_runs` idempotency works — **for calls that arrive** | No test asserts `GET` performs work | **CRITICAL** | `apps/ops-admin/vercel.json` vs the 3 route files; `scripts/local-cron.mjs` uses POST |
| **F-02** | C-14 reconciliation | Stripe and `ledger_entries` diverge undetected | `reconciliation-daily` is an unscheduled legacy route with no processor equivalent | None automatic | Financial reporting drifts from reality; discrepancies surface at bank reconciliation, weeks later | `POST /api/engine/reconciliation` by an operator | `ReconciliationService.runDaily` + `resolveManual` both work | No schedule; health reports it as tracked and permanently `null` | **HIGH** | `apps/ops-admin/src/app/api/cron/reconciliation-daily/route.ts` |
| **F-03** | All apps | Unhandled server error produces no signal | Sentry installed but never initialised | **None** | Silent breakage of arbitrary duration | Read Vercel function logs manually | Vercel captures stdout/stderr | No aggregation, no alerting, no grouping | **HIGH** | `apps/*/next.config.js`; zero `@sentry/nextjs` imports under `src/` |
| **F-04** | C-20 Supabase | Database unreachable | Provider incident, connection exhaustion, quota | 500s everywhere; `/api/health` `down` | **Total platform outage** | Wait for the provider | Health endpoints report it | **No retry, no circuit breaker, no degraded read path, no replica anywhere in the code** | **HIGH** | `packages/db/src/client/*` — no retry configuration |
| **F-05** | C-04 Stripe webhook | Webhook not delivered or persistently failing | Endpoint misconfigured, secret rotated, sustained 5xx | Orders stuck in `checkout_pending` / `payment_authorized`; visible on the ops board | **Customer charged, food never cooked** | Replay from the Stripe dashboard | Stripe retries; idempotency prevents duplicates | **No alert on "paid but not submitted to kitchen"** | **HIGH** | webhook route; `stripe_events_processed` |
| **F-06** | C-10 driver presence | Driver silently invisible to dispatch | Tab backgrounded >90 s stops the 15 s location post; `driver_presence.last_location_at` goes stale | None — **the driver sees no warning** | Driver receives no offers and does not know why; orders wait longer | Return to the tab | 90 s TTL exists deliberately, to avoid ghost assignment | No client-side "you have gone offline" indicator | **MEDIUM** | `driver-matching.service.ts: PRESENCE_TTL_SECONDS` |
| **F-07** | C-13 dispatch | No driver accepts | Low supply, all decline, offers expire | `checkDriverAssignmentTimeout` @10 min → `system_alerts` — **which requires F-01 to be fixed** | Food goes cold; order eventually escalated | Ops manual assign / force assign | Escalation logic exists and is correct | Blocked by F-01 | **HIGH** (given F-01) | `processors/sla/route.ts` |
| **F-08** | C-03 checkout | Order created, PaymentIntent fails | Stripe error, config error, test-mode mismatch | In-process | Customer sees a typed error and can retry cleanly | **Automatic** — `catch` cancels the order and releases the idempotency row | Well implemented | None | **LOW** | `run-checkout.ts` catch block |
| **F-09** | C-14 ledger | Concurrent duplicate ledger write returns an error instead of an idempotent no-op | `insertIdempotent` does select-then-insert; on the race the unique index rejects and the code returns `{inserted:false, error}` rather than treating `23505` as success | Caller-dependent | A money-write path may report failure for an operation that in fact already succeeded | Retry — the second attempt reads the existing row | Unique index guarantees **no duplicate row** | Missing `23505`-as-success handling (which `run-checkout.ts` does have) | **MEDIUM** | `ledger.service.ts: insertIdempotent` vs `run-checkout.ts: upsertCheckoutIdempotencyRecord` |
| **F-10** | C-14 payout run | Run stuck in `processing` | Lambda timeout or crash mid-run | `payout_runs.status = 'processing'` visible in the finance UI | **All subsequent payout runs of that type are blocked** by the partial unique index | Manual DB update — **no documented procedure and no UI control** | The index correctly prevents a concurrent double-run | No stale-run reclaim (unlike checkout's 120 s reclaim) | **MEDIUM** | migration `00032`; `payout.service.ts` |
| **F-11** | C-11 payment adapter | Reject/cancel cannot void the Stripe payment outside `apps/web` | `registerPaymentAdapter` is called **only** in `apps/web/src/lib/engine.ts`. In chef-admin, ops-admin and driver-app the engine is constructed with `paymentAdapter === undefined`. | None | A chef rejecting an order in chef-admin cannot trigger a Stripe void from that process | Refund through the ops finance path | Refund path exists and works | **A capability silently absent in 3 of 4 apps** | **MEDIUM** | `grep registerPaymentAdapter apps/*/src` → 1 hit |
| **F-12** | Rate limiting | Limits are per-instance | `UPSTASH_*` unset → memory fallback | `degraded` flag + `console.warn` — **which nothing reads (F-03)** | Weaker throttling than the stated policy | Configure Upstash | Fallback keeps traffic flowing rather than failing everything | No alert on `degraded` | **MEDIUM** | `packages/utils/src/rate-limit/index.ts` |
| **F-13** | C-19 / geocoding | OSRM or Nominatim unavailable, rate-limited or blocked | Free public services with fair-use policies carrying production traffic | **Silent** | Worse driver ranking; worse ETAs; delivery-fee fallback to a $5.00 flat rate (vs $3.99 base) | Point `OsrmProviderOptions.baseUrl` at a self-hosted instance | Timeout 12 s + 2 retries on OSRM; graceful heuristic fallback | **No timeout at all on the Nominatim fetch.** No alert either way. | **MEDIUM** | `osrm.provider.ts`; `geocoding.service.ts` |
| **F-14** | C-06 Kitchen OS | `inventory_items.current_quantity` drifts from the `inventory_stock_movements` ledger | Any route that writes one without the other | None | Wrong stock levels → wrong reorder suggestions → wrong availability | Manual stock count (`/api/inventory/counts`) | The engine documents the ledger as authoritative | **No reconciliation job exists for this at all** | **MEDIUM** | `inventory.engine.ts: computeOnHand` header comment |
| **F-15** | C-03 checkout | Abandoned pre-payment orders accumulate | Customer leaves the page after `POST /api/checkout` | None | Dead rows; skewed order counts; a `checkout_pending` order that never resolves | Manual | Idempotency lets the customer resume | **No sweeper.** `checkChefAcceptanceTimeout` only covers orders that already reached `pending`. | **LOW–MEDIUM** | `sla-checks.ts` covers `pending`, not `checkout_pending` |
| **F-16** | Data growth | Unbounded table growth | **No retention policy, no TTL, no partitioning, no archival anywhere in 62 migrations** | Storage metrics only | Slower queries, rising cost | Manual pruning | Indexes exist | `driver_locations` grows ~4 rows/min per online driver, forever | **MEDIUM** (compounding) | `supabase/migrations/*` — no `DELETE`/TTL job |
| **F-17** | Memory | `geocodingCache` is an unbounded module-level `Map` | Never evicted, never size-capped | None | Lambda memory growth on a long-lived warm instance | Instance recycles | Serverless recycling limits the blast radius | Would be a real leak on a long-running server | **LOW** | `geocoding.service.ts: geocodingCache` |

## 2. Single points of failure

| SPOF | Mitigation present | Verdict |
|---|---|---|
| **Supabase** | None | The system has exactly one hard SPOF and no code path acknowledges it |
| **Vercel** | None | Hosting, build and scheduling all in one vendor |
| **`apps/web` Stripe webhook** | Stripe's own retry | Adequate for transient failure; nothing covers sustained misconfiguration |
| **`apps/ops-admin`** | None | If ops-admin is down, all scheduled work and the finance webhook stop with it |
| **`createAdminClient` singleton** | None | A poisoned client persists for the life of the warm lambda |

## 3. Concurrency, ordering and idempotency

| Concern | Where | Handling | Verdict |
|---|---|---|---|
| Double checkout | `checkout_idempotency_keys` | `UNIQUE(customer_id, idempotency_key)`, `23505` handled explicitly, 120 s stale reclaim | ✅ Exemplary |
| Duplicate webhook | `stripe_events_processed` | Claim-or-skip; replay returns `{idempotentReplay:true}` | ✅ |
| Duplicate ledger row | `uq_ledger_entries_idempotency_key` | Index guarantees uniqueness; **caller-side race returns an error** | ⚠️ F-09 |
| Concurrent payout runs | `payout_runs_one_processing_per_type` | Partial unique index + route-level pre-check | ✅ (but F-10) |
| Double processor fire | `ops_processor_runs` | `unique(processor_name, idempotency_key)` — **`sla` and `expired-offers` only** | ⚠️ `partner-webhooks` unprotected |
| Double offer accept | `assignment_attempts` | State machine + `expires_at` | ✅ |
| Concurrent order transition | `ORDER_TRANSITION_MAP` | Throws on illegal transitions | ✅ logically; **no row-level lock or optimistic version column** — two simultaneous legal transitions from the same state could both proceed |
| Stripe PaymentIntent retry | `checkout:{customerId}:{key}` | Stripe-side idempotency | ✅ |
| `submitToKitchen` recovery | `.eq` guard on the fallback update | Safe against a concurrent cancel — commented as such | ✅ |
| Retry idempotency overall | — | **Every retried operation traced in this analysis is idempotent except the F-09 ledger race and the untracked `partner-webhooks` processor.** | Strong |

## 4. Timeouts

| Call | Timeout | Verdict |
|---|---|---|
| OSRM | 12 s, 2 retries | ✅ |
| Nominatim | **none** | ⚠️ F-13 |
| Maintenance lookup | 1.5 s `AbortSignal.timeout`, fails open | ✅ |
| Supabase queries | **none configured** | ⚠️ relies on the platform default |
| Stripe SDK | SDK default | Acceptable |
| Twilio / Resend | **none** | ⚠️ minor — off the request path |
| Partner webhook out | see `runPartnerWebhookProcessor` | Not read in full |

## 5. Silent-failure inventory

Places where something fails and **nobody is told**:

1. Scheduled processors do nothing (F-01).
2. Reconciliation never runs (F-02).
3. Unhandled exceptions vanish (F-03).
4. A driver drops out of dispatch (F-06).
5. Rate limiting degrades (F-12).
6. OSRM/Nominatim degrade (F-13).
7. Inventory cache drifts (F-14).
8. Resend/Twilio are unconfigured — notifications simply never leave the building.
9. `getOrCreateStripeCustomer` failure is swallowed by `.catch(() => null)` and checkout proceeds without a Stripe customer (saved cards silently unavailable).
10. Order-cancel failure during checkout cleanup is caught and logged only — deliberate, so the idempotency row is always released, but it can leave a genuinely orphaned order behind.

**Items 1–3 are the same root problem: this system has no way to tell anyone that something is wrong.** Fixing F-03 is the prerequisite for every other reliability improvement being measurable.

## 6. Recovery procedures that exist only as human knowledge

| Scenario | Documented? | Automated? |
|---|---|---|
| Stuck `processing` payout run | ❌ | ❌ |
| Paid-but-not-submitted order | ❌ | Partial — the webhook's own fallback |
| Inventory cache drift | ❌ | ❌ |
| Ledger ≠ Stripe | Partial — the endpoint exists | ❌ (R-02) |
| Database restore | `docs/BACKUP_AND_ROLLBACK.md` exists; nothing verifies or schedules it | ❌ |
| Credential rotation | ❌ | ❌ |
| Abandoned `checkout_pending` orders | ❌ | ❌ |
