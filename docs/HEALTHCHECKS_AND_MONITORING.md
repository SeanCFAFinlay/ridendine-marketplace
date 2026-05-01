# Health checks and monitoring

Related: [`docs/API_FOUNDATION.md`](API_FOUNDATION.md) (if health is referenced there), [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md), [`packages/utils`](../packages/utils/src/api-response.ts) (`healthPayload`, IRR-036).

---

## 1. Health endpoints

Each Next.js app exposes:

`GET /api/health`

| App | Package | Default local URL |
|-----|-----------|---------------------|
| Web | `@ridendine/web` | `http://localhost:3000/api/health` |
| Chef admin | `@ridendine/chef-admin` | `http://localhost:3001/api/health` |
| Ops admin | `@ridendine/ops-admin` | `http://localhost:3002/api/health` |
| Driver app | `@ridendine/driver-app` | `http://localhost:3003/api/health` |

**Ops deep health:** `GET` on ops-admin ` /api/engine/health` (engine `checkSystemHealth`) requires platform auth — use for **authenticated** synthetic checks, not public uptime robots, unless you expose a separate unauthenticated probe (not required by this doc).

---

## 2. Expected response schema (IRR-036)

Public `GET /api/health` returns JSON envelope from `apiSuccess`.
Status codes:
- `200` for `ready` or `degraded`
- `503` for `not_ready`

```json
{
  "success": true,
  "data": {
    "ok": true,
    "service": "web",
    "timestamp": "2026-05-01T12:00:00.000Z",
    "version": "0.1.0",
    "environment": "production",
    "readiness": "ready",
    "checks": {
      "app": "ok",
      "db": "ok",
      "env": "ok",
      "stripe": "ok",
      "rateLimit": "ok",
      "checkoutIdempotencyMigration": "ok"
    },
    "details": {
      "rateLimitProvider": "upstash-redis",
      "buildSha": "abc123"
    },
    "uptimeSeconds": 123.45
  }
}
```

`service` is one of: `web` | `chef-admin` | `ops-admin` | `driver-app`.

---

## 3. What each check proves

| Check | Proves |
|-------|--------|
| HTTP 200/503 on `/api/health` | Route is reachable and reports operational readiness state. |
| `data.service` matches host | Correct app identity in multi-project monitoring. |
| `data.environment` | `NODE_ENV` classification visible (sanity). |
| `data.checks.db` | Database read probe from server context is working. |
| `data.checks.env` | Required environment variables are present. |
| `data.checks.rateLimit` | Distributed rate limit provider readiness status. |

---

## 4. What it does **not** prove

- Stripe / Resend / third-party availability.  
- RLS correctness or auth flows.  
- Disk / memory exhaustion under load.

Use **staging smoke tests**, **ops engine health** (authenticated), and **external synthetic transactions** for deeper signal.

---

## 5. Logging expectations

- Structured logs without PII/payment details in free text — see [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md).  
- Webhook and processor paths use redaction helpers where implemented.

---

## 6. Error monitoring expectations

| Layer | Recommendation |
|-------|----------------|
| Client | Optional `NEXT_PUBLIC_SENTRY_DSN` (or equivalent). |
| Server | Same DSN or server-only Sentry init per app. |
| API routes | 5xx rates, latency — Vercel Analytics / OpenTelemetry per org standard. |

---

## 7. Alert recommendations (placeholders)

| Alert | Condition | Severity |
|-------|-----------|----------|
| Public health down | `/api/health` non-200 for > N minutes | Critical |
| Webhook error rate | Stripe 4xx/5xx spike | High |
| Processor unauthorized spike | Ops processor routes 401 burst | Medium (possible misconfigured cron) |
| DB connection errors | From app logs / APM | Critical |

Wire thresholds in your APM after baseline metrics exist.

---

## 8. Synthetic monitors (checklist)

- [ ] Four public `/api/health` URLs (prod).  
- [ ] Optional: staging mirrors with same checks.  
- [ ] Document monitor ownership and escalation in Phase 18 launch checklist.
