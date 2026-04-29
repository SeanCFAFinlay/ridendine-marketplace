---
id: FND-014
category: BrokenWire
severity: High
effort: M
---

# [[FND-014]] No expired offer scheduler

## Summary
DispatchEngine.processExpiredOffers() exists but nothing calls it automatically. Delivery offers that expire sit in 'pending' status indefinitely until an ops admin manually triggers processing from the dashboard.

## Affected components
- [[CMP-008]] DispatchEngine

## Evidence
- `packages/engine/src/orchestrators/dispatch.engine.ts` — processExpiredOffers() method
- `apps/ops-admin/src/app/api/engine/dashboard/route.ts` — manual trigger via POST action

## Why this matters
Drivers who ignore offers block the dispatch pipeline. Without automatic expiry processing, orders wait indefinitely for manual ops intervention.

## Proposed fix
Add a Supabase Edge Function or Vercel Cron Job that calls processExpiredOffers() every 60 seconds.
