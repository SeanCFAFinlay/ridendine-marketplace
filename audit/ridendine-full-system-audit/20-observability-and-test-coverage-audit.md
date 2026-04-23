# 20 - Observability and Test Coverage Audit

**Audit Date**: 2026-04-23
**Verdict**: CRITICAL - Insufficient for production deployment

---

## Summary

The Ridendine platform has near-zero automated test coverage outside of the engine package, no structured logging, no error tracking, no monitoring, and no health checks. This is a blocker for production deployment and makes all future changes high-risk.

---

## Test Coverage Inventory

### apps/web

| File | Tests | Notes |
|------|-------|-------|
| `__tests__/auth-layout.test.tsx` | Yes | Auth layout rendering |
| `__tests__/password-strength.test.tsx` | Yes | Password strength utility |
| `__tests__/forgot-password.test.tsx` | Yes | Forgot password flow |
| `__tests__/support-route.test.ts` | Yes | Support API route |
| All other pages | None | 0 tests |
| All other API routes | None | 0 tests |

**Estimated coverage**: ~5% of codebase

### apps/chef-admin

| File | Tests | Notes |
|------|-------|-------|
| Any test file | None | Zero test files found |

**Estimated coverage**: 0%

### apps/ops-admin

| File | Tests | Notes |
|------|-------|-------|
| Any test file | None | Zero test files found |

**Estimated coverage**: 0%

### apps/driver-app

| File | Tests | Notes |
|------|-------|-------|
| Any test file | None | Zero test files found |

**Estimated coverage**: 0%

### packages/engine

| File | Tests | Notes |
|------|-------|-------|
| `src/__tests__/commerce.engine.test.ts` | Yes | Commerce orchestrator |
| `src/__tests__/dispatch.engine.test.ts` | Yes | Dispatch orchestrator |
| `src/__tests__/platform-settings.test.ts` | Yes | Platform settings |
| All other orchestrators | None | orders, chef, driver, notifications - no tests |

**Test framework**: Vitest
**Estimated coverage**: ~40% of engine code (3 of 7 orchestrators covered)

### packages/db

| File | Tests | Notes |
|------|-------|-------|
| Any test file | None | Zero test files found - 22 repositories untested |

**Estimated coverage**: 0%

### packages/auth, utils, validation, types, notifications, ui

**Estimated coverage**: 0% across all packages

---

## Overall Test Coverage

| Scope | Coverage | Target |
|-------|----------|--------|
| apps/web | ~5% | 70% |
| apps/chef-admin | 0% | 70% |
| apps/ops-admin | 0% | 70% |
| apps/driver-app | 0% | 70% |
| packages/engine | ~40% | 90% |
| packages/db | 0% | 80% |
| All other packages | 0% | 70% |
| **Overall** | **~3%** | **80%** |

**Gap**: 77 percentage points below minimum production threshold.

---

## Logging Audit

### Current State

All logging is done via raw `console` calls scattered throughout the codebase:

```typescript
// Pattern found throughout all apps and packages
console.log('Order created:', orderId)
console.error('Failed to fetch chefs:', error)
console.warn('Cache miss for settings')
```

**Problems with current approach**:
- No log levels (all logs are equally important or unimportant)
- No structured metadata (no `requestId`, `userId`, `traceId`)
- No log aggregation (logs exist only in terminal/serverless function logs)
- No searchability in production
- No alerting on error conditions
- Logs from different apps are indistinguishable

### What Is Missing

| Feature | Status | Required For Production |
|---------|--------|------------------------|
| Structured JSON logging | Missing | Yes |
| Request ID propagation | Missing | Yes |
| User context in logs | Missing | Yes |
| Log levels (debug/info/warn/error) | Missing | Yes |
| Log aggregation service | Missing | Yes |
| Error log alerting | Missing | Yes |
| Audit trail logging | Partial | Yes |

### Audit Trail

The system has an `audit_logs` table in the database and an `AuditLogger` class in the engine that writes to `domain_events`. However:

- `audit_logs` table is never referenced in any repository or application code
- `domain_events` table receives engine events but nothing consumes them
- No audit queries exist in ops-admin for compliance/debugging
- The audit trail cannot be queried by ops staff

---

## Error Tracking Audit

### Current State

**No error tracking service is integrated.** Errors surface only as:
- `console.error()` calls in serverless function logs
- Unhandled promise rejections (may be swallowed silently)
- User-reported issues

### Error Boundaries

Each app has a basic `error.tsx` at the app root level (Next.js App Router convention). These:
- Show a generic "Something went wrong" message
- Provide a "Try again" button (calls `reset()`)
- Do NOT capture error details
- Do NOT report errors to any service

**Missing**: Granular error boundaries per route segment, error reporting to tracking service.

### Unhandled Rejection Risk

Several async operations lack proper error handling:
- Real-time subscription setup failures are silently ignored
- Stripe webhook handler errors may fail silently
- Email sending failures are not retried

---

## Monitoring Audit

### Current State

**No monitoring exists.** Specifically:

| Monitoring Type | Status | Tool Needed |
|----------------|--------|-------------|
| Uptime monitoring | Missing | Better Uptime, Pingdom |
| Performance monitoring (APM) | Missing | Datadog, New Relic |
| Error rate tracking | Missing | Sentry |
| Database query monitoring | Missing | Supabase built-in (partial) |
| Custom business metrics | Missing | Mixpanel, Amplitude, or custom |
| Alert routing | Missing | PagerDuty, Slack alerts |
| Synthetic monitoring | Missing | Playwright cloud, Checkly |

### Health Checks

No `/api/health` endpoint exists in any app. There is no way to:
- Verify an app is running
- Verify DB connectivity is working
- Include apps in load balancer health checks
- Trigger alerts when an app is down

---

## Retry Logic Audit

| Operation | Has Retry | Notes |
|-----------|-----------|-------|
| Stripe API calls | No | Single attempt; Stripe SDK handles some retries internally |
| Email sending | No | Fire-and-forget, not yet implemented |
| Supabase queries | No | Single attempt |
| Real-time subscriptions | Partial | Supabase client auto-reconnects but app logic does not handle missed events |
| Webhook processing | No | If webhook handler throws, Stripe will retry but app has no idempotency guard |

**Idempotency gap**: The Stripe webhook handler does not check if an event has already been processed. Stripe retries webhooks on failure, which can cause duplicate order submissions if the handler times out.

---

## Recommended Observability Stack

### Minimum Viable Observability (Weeks 5-6)

| Component | Tool | Cost |
|-----------|------|------|
| Error tracking | Sentry (free tier) | Free |
| Structured logging | Pino | Free (library) |
| Uptime monitoring | Better Uptime (free tier) | Free |
| Health checks | Custom `/api/health` endpoint | Free |

### Production-Grade Observability (Month 2+)

| Component | Tool | Notes |
|-----------|------|-------|
| APM | Datadog or New Relic | Paid |
| Log aggregation | Datadog Logs or Logtail | Paid |
| Business analytics | Mixpanel | Paid |
| Synthetic E2E | Checkly | Paid |
| Alerting | PagerDuty | Paid |

---

## Recommended Test Priority Order

Given the current 3% coverage, tests should be added in this order to maximize risk reduction per test written:

1. **Engine orchestrators** (highest business value, already partially tested)
   - `orders.orchestrator.ts` - every order state transition
   - `dispatch.orchestrator.ts` - driver assignment logic
   - `commerce.orchestrator.ts` - payment and refund flows
   - `chef.orchestrator.ts` - chef approval flows
   - `driver.orchestrator.ts` - driver approval and earnings

2. **Critical API routes**
   - `POST /api/checkout` - payment creation
   - `POST /api/webhooks/stripe` - webhook idempotency
   - `POST /api/orders/[id]/accept` (chef-admin)
   - `POST /api/deliveries/[id]/accept` (driver-app)
   - `POST /api/refunds/[id]/process` (ops-admin)

3. **Repository layer**
   - All 22 repositories need at minimum happy-path tests
   - Focus on repositories used in critical payment/order flows first

4. **UI components** (lowest priority, highest effort per test)
   - Focus on forms with validation logic
   - Skip pure presentational components

---

## Action Items

| Priority | Action | Effort | Owner |
|----------|--------|--------|-------|
| P0 | Set up CI/CD with test gate | 1 day | Lead Engineer |
| P0 | Add Sentry to all apps | 0.5 days | Any Engineer |
| P0 | Add `/api/health` to all apps | 0.5 days | Any Engineer |
| P1 | Add engine orchestrator tests | 1 week | Backend Lead |
| P1 | Add structured logging (Pino) | 2 days | Any Engineer |
| P1 | Set up uptime monitoring | 0.5 days | DevOps |
| P2 | Add API route tests | 1 week | Backend Team |
| P2 | Add idempotency to webhook handler | 1 day | Backend Lead |
| P2 | Wire `audit_logs` table | 2 days | Backend Lead |
| P3 | Add E2E tests (Playwright) | 1 week | Full-Stack |
| P3 | Add retry logic to critical paths | 2 days | Backend Lead |

---

## Related Files

- `18-risk-register.md` - R4 (no tests), R11 (no monitoring)
- `19-priority-fix-roadmap.md` - Items 11-15 address these gaps
