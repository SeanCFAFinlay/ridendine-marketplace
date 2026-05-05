# Merge Plan

Phased strategy for consolidating the 4-app architecture.

Related: [[Home]] | [[Apps]] | [[Risks]] | [[Integrations]]

---

## Current State: 4 Separate Apps

The existing architecture deploys 4 independent Next.js applications:

| App | URL | Purpose |
|-----|-----|---------|
| [[Apps#web]] | ridendine.ca | Customer marketplace |
| [[Apps#chef-admin]] | chef.ridendine.ca | Chef dashboard |
| [[Apps#ops-admin]] | ops.ridendine.ca | Operations center |
| [[Apps#driver-app]] | driver.ridendine.ca | Driver PWA |

### Current Pain Points
- **Auth middleware duplicated x4** - Each app has its own middleware with identical bypass logic (see [[Risks#bypass-auth]])
- **4 Vercel deployment pipelines** - 4x CI/CD overhead, 4x env var management
- **Supabase client config repeated** - Each app initializes its own client with the same pattern
- **Shared state impossible** - Ops admin and chef admin cannot share a session
- **Notification routing complex** - Each app triggers notifications independently

---

## Phase 1: Package Consolidation (Weeks 1-2)

**Goal**: Eliminate code duplication across apps without changing app structure.

### Tasks

#### 1.1 Centralize Auth Middleware
Move all auth logic to `@ridendine/auth`:
- Single `createMiddleware(role)` factory
- Remove `BYPASS_AUTH` bypass entirely (see [[Risks#bypass-auth]])
- Role-based route protection as config

**Files changed**: `packages/auth/src/middleware.ts`, all 4 `middleware.ts` app files

#### 1.2 Consolidate Engine Orchestrators
Ensure all business logic lives exclusively in `@ridendine/engine`:
- Order creation, acceptance, dispatch, completion
- Stripe PaymentIntent creation and webhook handling
- Driver offer management
- Chef approval workflow

**Target**: Zero business logic in API routes - only call engine functions

#### 1.3 Unify Notification Templates
Consolidate all email/SMS templates in `@ridendine/notifications`:
- Select email provider (recommend Resend)
- Wire chef new-order notification
- Wire customer order-status notifications
- Wire driver delivery-offer notification

**Files changed**: `packages/notifications/src/`, all app API routes that trigger notifications

#### 1.4 Canonical Type Sync
Run `pnpm db:generate` and audit:
- Ensure all 41 tables are in generated types
- Remove any hand-written types that duplicate generated ones
- Add `db:generate` to CI pipeline

---

## Phase 2: Route Normalization (Weeks 3-4)

**Goal**: Standardize API patterns across all apps.

### Tasks

#### 2.1 Standardize API Response Format
All API routes return:
```typescript
{ data: T, error: null } | { data: null, error: { code: string, message: string } }
```

#### 2.2 Unified Error Handling Middleware
Single error handler in `@ridendine/utils`:
- Catches Supabase errors → maps to HTTP codes
- Catches Stripe errors → maps to HTTP codes
- Logs to `audit_logs` table

#### 2.3 Add Pagination to List Routes
All GET list routes support:
- `?limit=20&cursor=<uuid>` for cursor-based pagination
- See [[Risks#no-pagination]]

#### 2.4 Fill Missing APIs
- `POST /api/orders/[id]/review` (web)
- `GET /api/history` (driver)
- See [[Risks#missing-apis]]

---

## Phase 3: Optional Merge (Weeks 5-8)

**Goal**: Reduce deployment surface area. Choose one of three options.

### Option A: Keep 4 Apps, Share More Code (Recommended Short-term)

**Risk**: Low
**Effort**: Already achieved by Phase 1-2

Keep all 4 apps but ensure zero code duplication. Each app is a thin shell over shared packages.

**When to choose**: Team prefers domain isolation, subdomain strategy works well, SEO benefits of separate deployments.

### Option B: Merge Admin Apps (2 Apps)

**Risk**: Medium
**Effort**: 3-4 weeks

Merge `chef-admin`, `ops-admin`, and `driver-app` into a single `apps/admin` app with role-based routing:
```
/chef/dashboard       → Chef dashboard
/ops/dashboard        → Ops dashboard
/driver/              → Driver home
```

**Benefits**:
- Single admin deployment pipeline
- Shared session (ops can impersonate chef view)
- One set of env vars for admin context
- Easier to share UI components between chef/ops

**Costs**:
- One security breach affects all admin roles
- Bundle size larger (ship all role UI to each user)
- Requires careful route protection per role

### Option C: Single App (Not Recommended)

**Risk**: High
**Effort**: 6-8 weeks

Merge all 4 apps into one Next.js application at `ridendine.ca` with role-based routing.

**Why not recommended**: Customer SEO pages mixed with admin code, security surface area too broad, bundle overhead significant.

---

## Recommended Execution Order

```
Week 1-2: Phase 1 (Package Consolidation)
  ├── Fix BYPASS_AUTH (Critical - Day 1)
  ├── Centralize auth middleware
  ├── Wire notifications provider
  └── Sync generated types

Week 3-4: Phase 2 (Route Normalization)
  ├── Standardize API responses
  ├── Add pagination
  ├── Fill missing APIs
  └── Add error handling middleware

Week 5-6: Production Hardening
  ├── Wire Stripe Connect payouts
  ├── Implement real-time for chef order queue
  ├── Build live map for ops-admin
  └── Add test coverage to 80%

Week 7-8: Optional - Phase 3 Option B
  └── Merge admin apps (if chosen)
```

---

## Decision Criteria for Phase 3

Choose Option B (merge admin) if:
- Team wants single staging URL for all admin testing
- Ops needs to cross-reference chef and driver data frequently
- Deployment simplicity is prioritized

Stay with Option A (4 apps) if:
- SEO and domain separation matter
- Security isolation between chef/ops/driver is valued
- Team is comfortable with 4-pipeline CI/CD

---

## Risks of Merging

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| RLS bypass if roles not isolated | Medium | High | Strict middleware per role prefix |
| Bundle bloat | Medium | Medium | Route-based code splitting |
| Auth state confusion | Low | High | Single auth context with role claims |
| SEO impact on web app | Low | Low | Keep web app separate always |

See [[Risks]] for full risk register.
