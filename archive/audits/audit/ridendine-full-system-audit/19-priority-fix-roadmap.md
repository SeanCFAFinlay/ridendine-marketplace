# 19 - Priority Fix Roadmap

**Audit Date**: 2026-04-23
**Horizon**: 12 weeks
**Source**: Findings from audit files 01-15, Risk Register (file 18)

---

## Overview

This roadmap organizes all audit findings into a sequenced, priority-ordered execution plan. Items are ordered by: (1) production safety, (2) core functionality, (3) quality, (4) polish.

No phase should begin until the previous phase's exit criteria are met.

---

## Priority 1 - Security and Safety (Weeks 1-2)

**Exit criteria**: No Critical/High security findings open. CI/CD running. All API routes validated.

### 1. Remove BYPASS_AUTH Default (Day 1)

**Risk**: R1 - Critical
**File**: All `apps/*/middleware.ts` and any `.env` files
**Action**:
- Remove `BYPASS_AUTH` env var from all `.env.local` and `.env` files
- Remove all `process.env.BYPASS_AUTH` checks from middleware
- If local dev bypass is needed, use a proper dev-only seeded user account
- Audit git history: `git log -S "BYPASS_AUTH" --all` to confirm it was never committed with `=true`
- Add ESLint rule to flag `BYPASS_AUTH` usage in code

**Effort**: 2 hours
**Verification**: Log out, attempt to access `/dashboard` without session → should redirect to login

---

### 2. Add Input Validation (Zod) to All API Routes (Days 1-5)

**Risk**: R2 - High
**Files**: All `apps/*/src/app/api/**/route.ts`
**Action**:
- Audit all route handlers for POST/PUT/PATCH without `req.json()` parsing + Zod validation
- Create shared validation middleware helper in `@ridendine/utils`:
  ```typescript
  export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T | NextResponse
  ```
- Apply to each route. Priority order: checkout, webhook, order mutations, user profile mutations, admin actions
- Return 400 with error details on validation failure (never 500)

**Effort**: 3-4 days
**Verification**: Send malformed JSON to each route → 400 response with descriptive error

---

### 3. Replace Mock Stripe Refund IDs with Real Integration (Days 1-5)

**Risk**: R3 - Critical / Financial
**Files**: `apps/ops-admin/src/app/api/refunds/*/route.ts`, `packages/engine/src/orchestrators/commerce.orchestrator.ts`
**Action**:
- Locate all hardcoded/mock refund ID strings (e.g., `"mock_refund_id_..."`)
- Replace with real Stripe API call:
  ```typescript
  const refund = await stripe.refunds.create({
    payment_intent: order.stripe_payment_intent_id,
    amount: refundAmountCents,
    reason: 'requested_by_customer',
  })
  ```
- Store real `refund.id` in database
- Handle Stripe errors (already-refunded, partial refund limits, etc.)
- Test against Stripe test mode before production

**Effort**: 1-2 days
**Verification**: Process test refund → real `re_xxx` ID appears in database and Stripe dashboard

---

### 4. Regenerate Database Types (Day 1)

**Risk**: R5 - Medium but blocks everything else
**Files**: `packages/db/src/types/database.types.ts`
**Action**:
```bash
pnpm db:generate
# Or directly:
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > packages/db/src/types/database.types.ts
```
- Commit regenerated types
- Fix any TypeScript errors that surface from newly-typed columns
- Add to CI/CD pipeline as validation step

**Effort**: 2 hours + fixing downstream type errors (estimate 4-8 hours)
**Verification**: `pnpm typecheck` passes with no errors referencing missing table types

---

### 5. Add Rate Limiting to Auth Endpoints (Days 3-5)

**Risk**: R6 - Medium
**Files**: `apps/*/src/app/api/auth/*/route.ts` or shared middleware
**Action**:
- Add Upstash Redis rate limiting (or use Vercel Edge middleware rate limiting)
- Auth endpoints: 10 requests per minute per IP
- General API: 100 requests per minute per IP
- Return 429 with `Retry-After` header on limit exceeded

**Effort**: 1 day
**Verification**: Rapid successive requests to `/api/auth/login` → 429 response after threshold

---

## Priority 2 - Core Flows (Weeks 3-4)

**Exit criteria**: All order flow steps working end-to-end. Customers receive emails. Drivers can complete deliveries.

### 6. Wire Email Notification Sending via Resend (Days 8-10)

**Risk**: R10 - High
**Files**: `packages/notifications/src/`, `packages/engine/src/orchestrators/*.ts`
**Action**:
- Add `RESEND_API_KEY` to env vars (already in env template as optional)
- Implement `NotificationService.send()` in `packages/notifications`
- Wire notification calls in engine orchestrators at these events:
  - `order.created` → email customer confirmation
  - `order.accepted` → email customer (chef accepted, estimated time)
  - `order.ready` → email customer (order ready for pickup/delivery)
  - `delivery.assigned` → email/push driver (new delivery offer)
  - `delivery.delivered` → email customer (delivered, link to review)
  - `chef.approved` → email chef (approved, can start receiving orders)
  - `chef.rejected` → email chef (rejected, reason)
  - `driver.approved` → email driver (approved)

**Effort**: 3-4 days
**Verification**: Place test order → confirmation email received within 30 seconds

---

### 7. Add Pagination to All List Views (Days 8-12)

**Risk**: R7 - Medium
**Files**: All repository list methods, all API route handlers, all list UI components
**Action**:
- Add `page` and `pageSize` params to all repository methods
- Update API routes to pass pagination params and return `meta: { page, total, pageSize }`
- Add pagination UI component to `@ridendine/ui`
- Update all list pages to use pagination component
- Default page size: 20 items

**Effort**: 3-4 days
**Verification**: Create 50+ records in any list view → pagination controls appear, pages work correctly

---

### 8. Complete Real-Time Order Status Updates (Days 10-14)

**Files**: `apps/web/src/app/orders/[id]/page.tsx`, Supabase real-time subscriptions
**Action**:
- Wire Supabase real-time subscription on `orders` table for customer order tracking page
- Wire real-time subscription on `deliveries` table for driver location/status updates
- Wire real-time subscription on `orders` table in chef-admin order queue
- Replace any polling with subscriptions
- Handle reconnection gracefully

**Effort**: 2-3 days
**Verification**: Change order status in ops-admin → customer order page updates without refresh

---

### 9. Fix Driver Earnings Hours Calculation (Days 12-14)

**Files**: `apps/driver-app/src/app/dashboard/earnings/page.tsx`, related repository
**Action**:
- Audit current earnings calculation logic
- Verify hours worked calculation uses actual timestamps from `deliveries` table
- Cross-check with `driver_earnings` or `ledger_entries` table
- Ensure per-delivery earnings are summed correctly

**Effort**: 1 day
**Verification**: Complete test delivery → earnings summary shows correct amount and hours

---

### 10. Wire Favorites CRUD (Days 12-14)

**Files**: `apps/web/src/`, `packages/db/src/repositories/`
**Action**:
- Confirm `favorites` table exists with correct schema
- Implement repository methods: `addFavorite`, `removeFavorite`, `getFavoritesByCustomer`
- Wire API routes: `POST /api/favorites`, `DELETE /api/favorites/[id]`, `GET /api/favorites`
- Wire UI toggle button on chef/storefront cards
- Show favorites section on customer profile

**Effort**: 1-2 days
**Verification**: Click favorite on chef storefront → persists on page reload, appears in favorites list

---

## Priority 3 - Quality and Tests (Weeks 5-8)

**Exit criteria**: 80% overall test coverage. All engine orchestrators tested. E2E tests for critical flows. CI/CD enforces coverage.

### 11. Unit Tests for All Engine Orchestrators (Weeks 5-6)

**Files**: `packages/engine/src/orchestrators/*.ts`, `packages/engine/src/__tests__/`
**Action**:
- Add tests for all 7 orchestrators: orders, dispatch, platform, commerce, chef, driver, notifications
- Mock DB repositories, not the engine itself
- Test happy path, error paths, and edge cases
- Target: 90% coverage on engine core

**Test cases per orchestrator** (minimum):
- Orders: createOrder, acceptOrder, rejectOrder, startPreparing, markReady, cancelOrder
- Dispatch: findNearbyDrivers, createAssignment, acceptOffer, rejectOffer
- Commerce: calculateTotals, applyPromo, createPaymentIntent, processRefund
- Platform: completeDeliveredOrder, updatePlatformSettings, generateLedgerEntries
- Chef: approveChef, rejectChef, suspendChef, approveMenuItem
- Driver: approveDriver, goOnline, goOffline, calculateEarnings

**Effort**: 1 week
**Target coverage**: >= 90% on packages/engine

---

### 12. API Route Tests for All Apps (Weeks 6-7)

**Files**: `apps/*/src/app/api/**/route.test.ts`
**Action**:
- Add integration tests for all API routes using `node:test` or Vitest
- Mock Supabase client, mock Stripe
- Test: valid input → correct response, invalid input → 400, unauthenticated → 401, wrong role → 403

**Effort**: 1 week
**Target coverage**: >= 70% on apps/*

---

### 13. E2E Tests for Critical Flows (Week 8)

**Tool**: Playwright
**Action**:
- Set up Playwright in monorepo
- Critical flows to cover:
  1. Customer: browse → add to cart → checkout → payment confirmation
  2. Chef: receive order → accept → mark ready
  3. Driver: go online → receive offer → accept → deliver
  4. Ops: approve chef → approve driver → process refund
- Run against staging environment

**Effort**: 1 week
**Target**: 4 E2E test suites, all passing

---

### 14. Add Error Boundaries and Loading States (Week 7-8)

**Files**: All `apps/*/src/app/**/page.tsx`, `apps/*/src/app/**/error.tsx`
**Action**:
- Audit each page for missing `loading.tsx` (show skeleton/spinner while data loads)
- Audit each page for missing error handling when API calls fail
- Wrap data-fetching components in ErrorBoundary
- Add user-friendly error messages (not raw error objects)
- Ensure Suspense boundaries for async Server Components

**Effort**: 3-4 days

---

### 15. Add Health Check Endpoints (Week 5)

**Files**: `apps/*/src/app/api/health/route.ts`
**Action**:
- Add `GET /api/health` to each app
- Response: `{ status: "ok", db: "ok", timestamp: "..." }`
- Check DB connectivity in health check
- Add to monitoring/uptime service

**Effort**: 0.5 days
**Verification**: `curl https://app.ridendine.com/api/health` → `{ "status": "ok" }`

---

## Priority 4 - Polish and Merge Prep (Weeks 9-12)

**Exit criteria**: Architecture ready for Phase 2 of unification strategy. All APIs documented. Monitoring in place.

### 16. Extract Shared Middleware Pattern (Week 9)

See `17-safe-unification-strategy.md` Phase 2a for details.

**Action**: Create `createRoleMiddleware()` factory in `@ridendine/auth`, update all 4 app middlewares to use it.

**Effort**: 2 days

---

### 17. Standardize Error Response Format (Week 9)

**Action**:
- Define canonical error response type in `@ridendine/types`
- Create `apiError(code, message, details?)` helper in `@ridendine/utils`
- Update all API routes to use standardized error format
- Document error codes

**Effort**: 2 days

---

### 18. Add Monitoring and Structured Logging (Week 10)

**Action**:
- Integrate Sentry for error tracking (frontend + backend)
- Add structured logging with Pino (replace `console.log` with logger)
- Add custom event tracking for business metrics (order created, chef approved, etc.)
- Set up uptime monitoring (Better Uptime or similar)
- Create Sentry alerts for Critical errors

**Effort**: 3-4 days

---

### 19. Document All API Contracts (Week 11)

**Action**:
- Generate OpenAPI spec from route handlers (use `next-swagger-doc` or similar)
- Document request/response schemas for all routes
- Host API docs at `/api/docs` in each app
- Keep in sync with Zod schemas added in item 2

**Effort**: 3-4 days

---

### 20. Create Deployment Runbook (Week 12)

**Action**:
- Document all environment variables required per app
- Document Supabase setup steps (migrations, seeds, RLS)
- Document deployment process for each app
- Document rollback procedure
- Document on-call escalation path for production incidents
- Store in `docs/runbooks/`

**Effort**: 2 days

---

## Summary Timeline

| Week | Focus | Key Deliverables |
|------|-------|-----------------|
| 1 | Security | BYPASS_AUTH removed, Stripe refund real, rate limiting |
| 2 | Validation + Types | All routes validated, types regenerated, CI/CD live |
| 3 | Core Flows | Emails sending, pagination added |
| 4 | Core Flows | Real-time updates, earnings fix, favorites |
| 5-6 | Engine Tests | 90%+ engine coverage, health checks |
| 6-7 | API Tests | 70%+ API route coverage |
| 8 | E2E + UX | Playwright E2E, error boundaries, loading states |
| 9 | Architecture Prep | Shared middleware, error format standardized |
| 10 | Observability | Sentry, structured logging, uptime monitoring |
| 11 | Documentation | API contracts documented |
| 12 | Operations | Deployment runbook complete |

---

## Related Files

- `18-risk-register.md` - Source of risk IDs referenced above
- `17-safe-unification-strategy.md` - Architecture work items (items 16-20 feed into Phase 2)
- `25-gap-analysis-to-fully-functional-platform.md` - Comprehensive gap inventory
