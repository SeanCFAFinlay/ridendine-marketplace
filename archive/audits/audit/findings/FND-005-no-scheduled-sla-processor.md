---
id: FND-005
title: No scheduled processor for SLA timers — breach detection is manual only
category: BrokenWire
severity: Critical
effort: L
status: Open
components: CMP-004, CMP-012
---

# [[FND-005]] No Scheduled SLA Processor

## Summary
[[CMP-004]] SLAManager creates timer records with `deadline_at` timestamps but nothing automatically processes them. The `process_sla_timers` action exists in [[CMP-012]] OpsControlEngine and is exposed via the ops dashboard API, but it requires an ops agent to manually click a button to fire SLA breach events.

## Evidence
- `sla-manager.ts`: writes records with `deadline_at` column
- `ops.engine.ts`: `processSLATimers()` method exists
- No cron job, Supabase pg_cron, or scheduled function found in the codebase
- Ops dashboard has a manual trigger button

## Impact
- SLA breaches for order acceptance (typically 8 min) go undetected until ops manually triggers
- Chefs can ignore orders indefinitely with no automatic escalation
- Customer experience degrades silently; no auto-cancellation or escalation path fires
- This is a Critical gap for a production food delivery platform

## Recommendation
1. Short-term: Add a Supabase `pg_cron` job (`SELECT cron.schedule(...)`) to call a database function that processes expired SLA timers every minute
2. Medium-term: Implement a Vercel Cron Job (`/api/cron/process-sla`) that calls the engine endpoint on a schedule
3. Add monitoring/alerting on SLA breach rate
4. Remove the manual trigger button once automation is in place (or keep as emergency override)

## Fix Effort
L — requires cron infrastructure decision, implementation, deployment config, and testing.
