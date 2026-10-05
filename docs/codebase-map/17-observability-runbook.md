# 17 — Observability

What exists, what does not, and whether an operator can actually answer the questions that matter.

---

## 1. Signals inventory

| Signal | Present | Where | Quality |
|---|---|---|---|
| **Unstructured logs** | ✅ | `console.log/warn/error` throughout; captured by Vercel | Ad-hoc. No consistent level or shape. |
| **Structured logging** | ⚠️ partial | `packages/utils/src/logger.ts` exists; `LOG_LEVEL` is read once | Not adopted across the codebase |
| **Log redaction** | ✅ | `redactSensitiveForLog` on webhook and error paths | Good where applied; not universal |
| **Correlation IDs** | ✅ | `packages/utils/src/correlation-id.ts` — `getCorrelationId(request)` / `withCorrelationId(response, id)` | Applied on the Stripe webhook; **not systematically across all 180 routes** |
| **Metrics** | ❌ | — | No Prometheus, StatsD, OpenTelemetry, or custom metric emission anywhere |
| **Traces** | ❌ | — | None |
| **Error tracking** | ❌ | `@sentry/nextjs` installed, four config files, **never initialised** | **The single biggest observability gap** (R-03) |
| **Audit events** | ✅ | `AuditLogger` → `audit_logs`; `ops_override_logs` | Strong. Read via the `audit_timeline_read` capability at `/dashboard/activity` and `/api/audit/recent`. |
| **Domain events** | ✅ | `DomainEventEmitter` → `domain_events`, flushed explicitly | Present; not consumed by any alerting |
| **System alerts** | ✅ table | `system_alerts` written by the SLA processor | **Written by a processor that does not run** (F-01) |
| **Processor runs** | ✅ table | `ops_processor_runs` | Only `sla` and `expired-offers` write it |
| **Health endpoints** | ✅ | `/api/health` × 4 + `/api/engine/health` | Good design — see §2 |
| **Analytics** | ⚠️ | `@vercel/analytics`, `@vercel/speed-insights` (`apps/web` only); `analytics_events` table | Product analytics, not operational |
| **Dashboards** | ✅ in-app | `/dashboard/health`, `/dashboard`, `/dashboard/activity`, `/dashboard/exceptions`, `/dashboard/reports`, `/dashboard/map` | Custom, database-driven |
| **Alerting** | ❌ | — | **Nothing pages, emails, or notifies anyone about anything.** |
| **Uptime monitoring** | ⚠️ | `post-deploy-smoke.yml` every 6 h against production | The closest thing to monitoring that exists — a GitHub Actions cron running contract checks |

## 2. Health endpoints

**`GET /api/health`** (all four apps) — public liveness. In `apps/web` the full payload (version, build SHA, per-dependency status) is gated behind `x-health-token === HEALTH_CHECK_TOKEN`; without it callers get `{ ok, service, readiness }`. **The status code still carries readiness**, so an external uptime monitor works without a token. That is a well-judged design.

**`GET /api/engine/health`** (ops-admin, `engine_health` capability) returns `checkSystemHealth()` plus:
- `readiness.env` — configured/not for `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `ENGINE_PROCESSOR_TOKEN`
- `readiness.processorRoutes` — a map of processor names to paths
- `readiness.processorRuns` — last successful run per tracked processor

Returns **503** when overall status is `down`.

### Two defects in the readiness signal

1. **`TRACKED_PROCESSORS` is wrong in both directions.** It lists `sla`, `expired-offers`, `payouts-chef-preview`, `payouts-driver-preview`, `reconciliation-daily`. The last three are unscheduled legacy routes that never write `ops_processor_runs`, so their `lastSuccessAt` is **permanently `null`** — three false alarms by construction. Meanwhile `partner-webhooks`, one of only three actually-scheduled processors, **is not tracked at all**.
2. **`envReadiness()` omits** `PARTNER_API_KEY`, `UPSTASH_REDIS_REST_URL`/`_TOKEN`, `RESEND_API_KEY`, `TWILIO_*`, and `STRIPE_WEBHOOK_SECRET_OPS`. A deployment can report fully ready while outbound messaging is off and rate limiting is degraded.

Net effect: **the readiness endpoint is simultaneously noisy and blind**, which trains operators to ignore it — the worst outcome for a health signal.

## 3. The eight operator questions

| # | Question | Answerable? | How |
|---|---|---|---|
| 1 | **Is the system healthy?** | ⚠️ **Partly** | `GET /api/health` per app; `GET /api/engine/health` for depth. But `processorRuns` gives three permanent false negatives, there is no alerting, and no aggregate view — someone must go and look. |
| 2 | **Did a critical workflow succeed?** | ✅ **Yes, per order** | `orders.engine_status`, `order_status_history`, `deliveries.status`, `ledger_entries`, `audit_logs`, and the ops live board. Per-order truth is genuinely good. **No aggregate success-rate metric exists** — nothing answers "what fraction of orders completed today?" without writing SQL. |
| 3 | **How do I find a failed transaction or job?** | ⚠️ **Partly** | `/dashboard/exceptions` for order exceptions; `system_alerts` (written by a processor that does not run); `refund_cases`; `stripe_reconciliation`. Failed **jobs** are the gap — `ops_processor_runs` only covers two processors and there is no failure feed. |
| 4 | **Dependency failure vs internal failure?** | ❌ **No** | `checkSystemHealth()` distinguishes components, but with no error tracking, no traces and no metrics, a spike of 500s cannot be attributed to Supabase, Stripe, OSRM or a code bug without reading raw Vercel logs. |
| 5 | **What can I safely restart?** | ✅ **Yes — everything** | All four apps are stateless serverless functions. Redeploying is always safe. Processors are idempotent via `ops_processor_runs`. Nothing holds in-process state that matters beyond a request. |
| 6 | **How do I stop side effects safely?** | ⚠️ **Partly** | `platform_settings.maintenance_mode` stops **customer web traffic only** — chef, ops and driver apps have no maintenance gate. `/api/engine/maintenance` exists. Storefront pause exists per chef. **There is no global kill switch for payments, dispatch, payouts or partner ingress.** |
| 7 | **How do I reconcile partial work?** | ⚠️ **Partly** | `POST /api/engine/reconciliation` (Stripe ↔ ledger, manual) and `resolveManual`. Checkout self-heals. **No procedure for a stuck payout run, inventory drift, or abandoned `checkout_pending` orders.** |
| 8 | **What evidence survives an incident?** | ✅ **Yes** | `audit_logs`, `ops_override_logs`, `order_status_history`, `delivery_events`, `domain_events`, `stripe_events_processed`, `ledger_entries`, `ops_processor_runs`. All durable in Postgres, none pruned. **The forensic trail is a genuine strength** — the gap is real-time detection, not after-the-fact reconstruction. |

**Score: 3 clear yes, 4 partial, 1 no.**

The pattern is consistent and worth naming: **this system records what happened extremely well and notices what is happening extremely poorly.** The audit and event tables would let you reconstruct almost any incident in detail — days later, once someone noticed.

## 4. Log-analysis capability

| Need | Available |
|---|---|
| Find all logs for one order | ❌ Correlation IDs are not stamped on most routes; you would grep Vercel logs by order id |
| Trace a request across apps | ❌ No distributed tracing; apps share only the database |
| Alert on an error-rate spike | ❌ |
| Search historical logs | ⚠️ Vercel log retention only, by plan tier |
| Correlate a deploy with an error | ⚠️ `VERCEL_GIT_COMMIT_SHA` is read and surfaced in the health payload — a good hook that nothing consumes |

## 5. What to add, in order

1. **Wire Sentry.** `withSentryConfig` in four `next.config.js` files plus an `instrumentation.ts`. Everything else in this document is unmeasurable until errors are visible. Confirm with one deliberate test exception.
2. **Fix `TRACKED_PROCESSORS`** — track `partner-webhooks`, drop the three unscheduled legacy entries or move them to real processors. A health signal that cries wolf is worse than none.
3. **Alert on `system_alerts`.** The table already exists and already has severities. Route `severity='error'` rows to email or Slack — and note that this only becomes useful once F-01 is fixed, since the SLA processor is what writes them.
4. **Stamp correlation IDs universally.** `getCorrelationId`/`withCorrelationId` already exist; apply them in a shared route wrapper.
5. **Emit four counters** — orders created, orders completed, checkout failures, webhook failures — even as log lines with a fixed prefix. That converts question 2 from "write SQL" to "read a chart".
6. **Add an external uptime monitor** on each app's `/api/health`. `post-deploy-smoke.yml` at 6-hour intervals is not monitoring.
