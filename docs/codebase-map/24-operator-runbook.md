# 24 — Operator Runbook

**No command is invented here.** Every command comes from a script, a route, or a schema that was read during this analysis. Where a procedure does not exist, it says **MISSING** rather than guessing.

---

## 0. Before anything

| | |
|---|---|
| Apps | `ridendine.ca` · `chef.ridendine.ca` · `ops.ridendine.ca` · `driver.ridendine.ca` |
| Consoles | Vercel (4 projects) · Supabase · Stripe · GitHub Actions |
| Alerting | **None. Detection is manual.** (R-03) |
| Kill switch | Partial — `maintenance_mode` stops customer web traffic only |

## 1. Normal startup

Nothing to start. All four apps are Vercel serverless deployments; they respond on demand. There is no process to boot, no queue to drain, no daemon to supervise.

## 2. Health verification

```bash
curl -sS https://ridendine.ca/api/health
curl -sS https://chef.ridendine.ca/api/health
curl -sS https://ops.ridendine.ca/api/health
curl -sS https://driver.ridendine.ca/api/health

# full payload on the customer app (requires the token):
curl -sS -H "x-health-token: $HEALTH_CHECK_TOKEN" https://ridendine.ca/api/health
```

Deeper check — sign in to `ops.ridendine.ca` and open `/dashboard/health`, or call `GET /api/engine/health` with an ops session. It returns component health plus `readiness.env` and `readiness.processorRuns`.

**Read `processorRuns` with these caveats:** `payouts-chef-preview`, `payouts-driver-preview` and `reconciliation-daily` are **permanently `null`** by construction (they are unscheduled legacy routes that never write `ops_processor_runs`). `partner-webhooks` is **not listed at all** despite being scheduled. Only `sla` and `expired-offers` carry real signal — and see §4.

Independent check: the `Post-deploy smoke` GitHub Actions workflow runs `runtime-contract-smoke.cjs` against production every 6 hours and after every deployment. A green run means public pages load and protected endpoints correctly reject anonymous callers.

## 3. Safe shutdown

There is no shutdown. To stop **customer** traffic, set `maintenance_mode` in `platform_settings` — `apps/web` middleware picks it up within 30 seconds and redirects to `/maintenance`. `/api/*`, `/_next/*` and `/maintenance` are bypassed.

**MISSING:** chef-admin, ops-admin and driver-app have no maintenance gate. There is no way to stop chef, driver or partner activity short of a Vercel-level action.

## 4. Verifying that scheduled work is running — **do this first, today**

```sql
SELECT processor_name, status, max(finished_at) AS last_finished, count(*) AS runs
FROM ops_processor_runs
GROUP BY processor_name, status
ORDER BY last_finished DESC NULLS LAST;
```

| Result | Meaning |
|---|---|
| Fresh `completed` rows for `sla` and `expired-offers` | The scheduler works; R-01 is refuted |
| Empty, or `last_finished` far in the past | **R-01 confirmed.** No background automation is running. Escalate. |

Manual trigger (this is the documented, evidence-backed way to run a processor):

```bash
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://ops.ridendine.ca/api/engine/processors/sla
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://ops.ridendine.ca/api/engine/processors/expired-offers
curl -X POST -H "Authorization: Bearer $CRON_SECRET" \
  https://ops.ridendine.ca/api/engine/processors/partner-webhooks
```

`x-processor-token: $ENGINE_PROCESSOR_TOKEN` works as an alternative header.

## 5. Dependency outage

| Dependency | Symptom | Action |
|---|---|---|
| **Supabase** | 500s everywhere; `/api/health` `down` | Check status.supabase.com. **There is no fallback in the code.** Set `maintenance_mode` if the database is reachable enough to write it; otherwise nothing can be done from the application side. |
| **Stripe API** | Checkout returns `PAYMENT_CONFIG_ERROR` / `PAYMENT_FAILED` | status.stripe.com. In-flight orders continue to be cooked and delivered. |
| **Stripe webhook** | Orders stuck in `checkout_pending` / `payment_authorized` | See §6. |
| **OSRM / Nominatim** | Silent. Worse ETAs, worse driver ranking, delivery fee falls back to $5.00 flat | No runbook action exists. **Mitigation available but not deployed:** `OsrmProviderOptions.baseUrl` accepts a self-hosted OSRM URL. |
| **Vercel** | Total outage | vercel-status.com |
| **Upstash** (if configured) | Rate limits degrade to per-instance; `degraded` flag in responses | Traffic still flows. |

## 6. Paid order that never reached the kitchen

The highest-consequence recurring incident.

```sql
-- orders paid but never submitted
SELECT id, order_number, engine_status, payment_status, created_at
FROM orders
WHERE payment_status = 'completed'
  AND engine_status IN ('checkout_pending','payment_authorized')
  AND created_at > now() - interval '24 hours'
ORDER BY created_at DESC;
```

1. Take the order's `payment_intent_id` to the Stripe dashboard and confirm the charge succeeded.
2. Check whether the event was recorded: `SELECT * FROM stripe_events_processed WHERE related_order_id = '<id>';`
3. If the event is absent, **replay it from the Stripe dashboard** — the endpoint is idempotent and a replay is safe.
4. If the event is present but `failed`, read `last_error` on that row.
5. Last resort: `/dashboard/orders/[id]` → ops override. This is audited to `ops_override_logs`.

## 7. Stuck-work triage queries

```sql
-- stuck payout runs (these BLOCK all future runs of the same type)
SELECT id, run_type, status, created_at FROM payout_runs WHERE status = 'processing';

-- abandoned pre-payment orders
SELECT count(*) FROM orders
WHERE engine_status = 'checkout_pending' AND created_at < now() - interval '1 hour';

-- deliveries with no driver
SELECT id, order_id, status, created_at FROM deliveries
WHERE status = 'unassigned' AND created_at < now() - interval '15 minutes';

-- unresolved system alerts
SELECT alert_type, severity, count(*) FROM system_alerts
WHERE created_at > now() - interval '24 hours' GROUP BY 1,2;

-- stale idempotency claims
SELECT count(*) FROM checkout_idempotency_keys
WHERE status = 'processing' AND updated_at < now() - interval '10 minutes';
```

**Stuck payout run — MISSING procedure.** A row left in `processing` blocks every future run of that type via the `payout_runs_one_processing_per_type` partial unique index. There is **no UI control and no documented remediation**. Resolving it today means a manual `UPDATE payout_runs SET status = ... WHERE id = ...` after establishing what actually completed by reading `ledger_entries` for that run. **Do not guess** — check the ledger first. (Recommendation O-04: add a stale-run reclaim mirroring checkout's 120-second pattern.)

## 8. Bad deployment / rollback

| Layer | Procedure |
|---|---|
| Application | Vercel → project → Deployments → **Promote a previous deployment**. Instant, no data effect. |
| Database | **No rollback exists.** Migrations are forward-only by policy. A bad migration requires a new corrective migration. |
| **Combined** | ⚠️ **The sharp edge.** If a migration was applied and you then roll the app back, old code runs against a new schema. Before rolling back, check `supabase/migrations/` for anything applied since the target deployment. |

## 9. Backup and restore

**MISSING.** `docs/BACKUP_AND_ROLLBACK.md` exists but nothing in the repository configures, schedules, verifies or tests a backup or restore. Supabase provides managed backups by plan tier; neither the tier, the retention, nor any restore drill is evidenced here.

**Establish this before the next incident, not during it:** Supabase → Project → Database → Backups. Note the tier, the retention window, and the most recent successful backup. Then **restore once into a scratch project and time it.** An untested backup is a hypothesis. (U-04 / R-07.)

## 10. Credential rotation

**MISSING** — no rotation procedure or schedule exists. Impact per credential, from evidence:

| Credential | Rotating it affects |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Every app. Update all four Vercel projects, then redeploy. |
| `STRIPE_SECRET_KEY` | Checkout, payouts, refunds, Connect. |
| `STRIPE_WEBHOOK_SECRET` | The customer webhook. Rotate at Stripe **and** in Vercel in the same window, or paid orders stop reaching the kitchen. |
| `CRON_SECRET` | The three processors. |
| `PARTNER_API_KEY` | Legacy partners only — DB-backed keys in `api_partner_keys` are individually revocable, which is the better path. |
| **Database password** | **Rotate this one now.** A live production connection string was found in plaintext at the repository root in `.env.local` (untracked, gitignored, but present on disk). See S-01. |

## 11. Disabling side effects

| Side effect | Control | Exists? |
|---|---|---|
| Customer ordering | `platform_settings.maintenance_mode` | ✅ web only |
| A single chef | Storefront pause (`/api/kitchen/pause`, chef or ops) | ✅ |
| Scheduled processors | Remove the entries from `vercel.json` and redeploy, or unset `CRON_SECRET` | ⚠️ requires a deploy |
| Partner API | Revoke keys in `api_partner_keys`, or unset `PARTNER_API_KEY` | ✅ |
| Payouts | No batch trigger exists to disable (R-04); self-service chef and driver requests can only be stopped at Stripe | ⚠️ |
| Email / SMS | Unset `RESEND_API_KEY` / `TWILIO_*` — providers go inert | ✅ requires a deploy |
| **Everything at once** | **MISSING** — no global kill switch | ❌ |

## 12. Log and audit lookup

| Need | Where |
|---|---|
| Application logs | Vercel → project → Logs. Retention by plan tier. |
| Order history | `order_status_history`, `/dashboard/orders/[id]` |
| Who did what | `audit_logs`, `ops_override_logs`, `/dashboard/activity`, `GET /api/audit/recent` (`audit_timeline_read` capability) |
| Delivery history | `delivery_events`, `delivery_tracking_events` |
| Payment history | `stripe_events_processed`, `ledger_entries`, Stripe dashboard |
| Domain events | `domain_events` |
| Errors | **MISSING** — no aggregation. Raw Vercel logs only. (R-03) |

The forensic trail is genuinely good. The gap is real-time detection, not reconstruction.

## 13. Escalation

| Condition | Escalate |
|---|---|
| Supabase unreachable > 5 min | Supabase support; consider `maintenance_mode` |
| Orders paid but not in the kitchen | Immediately — customers are charged for food nobody is cooking |
| `ops_processor_runs` empty or stale | **Confirms R-01.** Engineering, today. |
| Payout run stuck in `processing` | Finance + engineering — all subsequent runs of that type are blocked |
| Ledger ≠ Stripe | Finance. Run `POST /api/engine/reconciliation` first. |
| Suspected credential compromise | Rotate immediately per §10 |

## 14. Manual reconciliation

```bash
# with an ops session cookie (finance_engine capability):
curl -X POST https://ops.ridendine.ca/api/engine/reconciliation \
  -H 'content-type: application/json' \
  --cookie "<ops session>" \
  -d '{"date":"2026-09-07"}'
```

Then review `/dashboard/finance/reconciliation`. Rows can be resolved through `resolveManual` from the same endpoint. **This is the only way reconciliation ever runs — it is not scheduled (R-02).** Put it on a human calendar until it is automated.

## 15. Procedures that do not exist

Recorded plainly so nobody assumes otherwise:

| Missing | Consequence |
|---|---|
| Backup / restore procedure and drill | Potential unrecoverable data loss (U-04) |
| Credential rotation procedure | Slow, error-prone response to compromise |
| Stuck payout-run remediation | Blocks all future runs of that type |
| Inventory cache/ledger drift correction | Silent stock corruption (F-14) |
| Abandoned `checkout_pending` cleanup | Dead rows, skewed metrics (I-05) |
| Global kill switch | Cannot stop side effects platform-wide |
| Any alerting | Detection depends entirely on somebody looking (R-03) |
| Incident severity definitions / on-call rota | No agreed escalation path |
