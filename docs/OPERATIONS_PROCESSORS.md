# Operations Processors

Ridendine uses automated server-side processors to handle time-sensitive operations that cannot rely on manual dashboard clicks.

## Endpoints

### SLA Timer Processor
- **URL:** `POST /api/engine/processors/sla`
- **App:** ops-admin (port 3002)
- **Purpose:** Finds due SLA timers, marks warnings and breaches, emits domain events, creates system alerts and order exceptions
- **Frequency:** Every 60 seconds
- **Idempotent:** Yes — already-processed timers are skipped by status check

### Expired Offers Processor
- **URL:** `POST /api/engine/processors/expired-offers`
- **App:** ops-admin (port 3002)
- **Purpose:** Expires stale delivery assignment offers, retries dispatch for affected deliveries
- **Frequency:** Every 60 seconds
- **Idempotent:** Yes — already-expired offers are skipped

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ENGINE_PROCESSOR_TOKEN` | Yes | Shared secret for authenticating processor calls. Must be set in ops-admin environment. |

Generate a token:
```bash
openssl rand -hex 32
```

## Cron Setup Options

### Option A: Vercel Cron (recommended for Vercel deployments)
Configured in `apps/ops-admin/vercel.json`. Vercel automatically calls the endpoints.

Note: Vercel Cron requires the `CRON_SECRET` env var to be set. The processor token is sent via `x-processor-token` header.

### Option B: External Cron (curl-based)
```bash
# Add to crontab or use a cron service
* * * * * curl -s -X POST https://your-ops-admin.vercel.app/api/engine/processors/sla -H "x-processor-token: YOUR_TOKEN"
* * * * * curl -s -X POST https://your-ops-admin.vercel.app/api/engine/processors/expired-offers -H "x-processor-token: YOUR_TOKEN"
```

### Option C: Supabase Edge Functions
Create a Supabase scheduled Edge Function that calls both endpoints.

## Security Rules
- All processor endpoints require `x-processor-token` header matching `ENGINE_PROCESSOR_TOKEN` env var
- Token must never be exposed in client-side code
- Endpoints are POST-only for processing; GET is for health checks only
- If `ENGINE_PROCESSOR_TOKEN` is not set, all requests are rejected (fail-safe)

## Failure Modes
- **Missing token:** 401 Unauthorized (all requests rejected)
- **Database error:** 500 with error details in response
- **Partial processing:** Each timer/offer is processed independently; one failure doesn't block others
- **Double processing:** Idempotent — safe to call multiple times per minute
