# Load testing plan (IRR-024)

**Status:** Planning document only — no load tests are executed from the repo in Phase 17. Execute in **staging** with approval and isolated data.

Related: [`docs/QA_TESTING_PLAN.md`](QA_TESTING_PLAN.md), [`docs/SECURITY_HARDENING.md`](SECURITY_HARDENING.md) (rate limits), [`docs/API_FOUNDATION.md`](API_FOUNDATION.md).

---

## 1. Objectives

- Validate **capacity headroom** for peak checkout and dashboard usage.  
- Observe **rate limiting** (429) and error rates under sustained load.  
- **Not** a substitute for security testing or contract tests.

---

## 2. What to load test

| Scenario | Target | Notes |
|----------|--------|-------|
| Customer checkout API | `POST /api/checkout` (staging) | Use Stripe **test** keys; do not hit live network card flows at extreme concurrency without Stripe guidance. |
| Web browse + cart | Read-heavy routes | Lower risk; still respect robots/terms. |
| Ops dashboard reads | Authenticated API routes | Use a **dedicated** staging service account; rotate credentials after test. |
| Driver location updates | `POST` driver location API | Expect **429** when exceeding per-instance limits (IRR-019). |

---

## 3. What **not** to load test

- **Production** without explicit approval and safeguards.  
- **Stripe webhooks** at abusive rates (use Stripe’s replay tools for correctness, not DDoS).  
- **Password / auth** endpoints with credential stuffing patterns (illegal / unethical).  
- **Third-party** geocoding or maps APIs without quota checks.

---

## 4. Suggested tools (pick one)

| Tool | Notes |
|------|------|
| **k6** | Scriptable, good for HTTP APIs and thresholds. |
| **Artillery** | YAML scenarios; common for serverless. |
| **Vegeta** | Simple HTTP hammer for quick spikes. |

Repo includes a built-in Node load smoke script:

- `pnpm test:load:dry-run` (config validation)
- `pnpm test:load` (local smoke)
- `pnpm test:load:staging` (run against `LOAD_BASE_URL`)

---

## 5. Scenarios (outline)

### A. Customer checkout (staging)

1. Authenticate or use test tokens per staging policy.  
2. Ramp VUs over 5–15 minutes.  
3. Measure p95/p99 latency, 5xx rate, **429** on rate-limited routes.

### B. Admin dashboard

1. Ops session with read-only capable role.  
2. Hit list endpoints used by main dashboard (orders, alerts).  
3. Watch **DB pool** / Supabase metrics in dashboard.

### C. Driver location

1. Authenticated driver session.  
2. Steady `POST` interval; confirm **429** + `Retry-After` when limits hit.

---

## 6. Rate-limit expectations

- In-memory token buckets are **per serverless instance** — distributed limits may differ in production with many instances.  
- Document observed 429 behavior in staging before setting SLOs.

---

## 7. Pass / fail thresholds (placeholders)

| Metric | Staging gate (TBD) |
|--------|---------------------|
| p95 API latency (checkout) | _e.g. < 2s_ |
| Error rate (5xx) | _e.g. < 0.1%_ excluding known rate limits |
| Success checkout completion | _Define per test script_ |

Fill after first staging run; attach report to release record.

---

## 8. Deliverable for IRR-024 closure

IRR-024 is **documentation-complete** when this file exists; **execution-complete** requires at least one **signed-off staging report** attached to Phase 18 or release tracking.

Staging report template:

- `AUDIT_AND_PLANNING/PRE_LAUNCH_REPAIR_EXECUTION_01/LOAD_TEST_STAGING_REPORT_TEMPLATE.md`
