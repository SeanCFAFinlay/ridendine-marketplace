# 17 - Safe Unification Strategy

**Audit Date**: 2026-04-23
**Subject**: Phased approach to unifying 4 Next.js apps into a single platform
**Prerequisite**: Read `16-merge-readiness-assessment.md` first

---

## Overview

This document describes how to safely evolve the current 4-app monorepo into a unified single-app platform without a big-bang rewrite. Each phase is independently deployable and reversible.

**Guiding principle**: The engine and DB layer are already unified. Unification is a frontend concern only.

---

## Phase 0 - Current State (NOW)

**Description**: Four separate Next.js apps, shared backend packages.

**Architecture**:
```
apps/
  web/           → Customer app (port 3000)
  chef-admin/    → Chef app (port 3001)
  ops-admin/     → Ops app (port 3002)
  driver-app/    → Driver app (port 3003)

packages/
  engine/        → Business logic (shared)
  db/            → Data access (shared)
  types/         → TypeScript types (shared)
  validation/    → Zod schemas (shared)
  auth/          → Auth utilities (shared)
  ui/            → UI components (shared)
```

**Status**: Running. Backend unified. Frontend isolated.

**Blocking issues before proceeding**:
- BYPASS_AUTH security risk must be resolved
- No CI/CD pipeline (any phase transition requires regression safety)
- Almost no test coverage

---

## Phase 1 - Stabilize and Secure (Weeks 1-4)

**Goal**: Make the current 4-app architecture production-safe.

**Do not change architecture in this phase.** Fix what exists.

### Tasks

| # | Task | Target | Notes |
|---|------|--------|-------|
| 1.1 | Remove BYPASS_AUTH default | All apps | Security critical |
| 1.2 | Add Zod validation to all API routes | All apps | Security critical |
| 1.3 | Replace mock Stripe refund IDs | ops-admin | Financial critical |
| 1.4 | Regenerate Supabase types | packages/db | 20+ missing tables |
| 1.5 | Add rate limiting to auth endpoints | All apps | Security |
| 1.6 | Add unit tests for engine orchestrators | packages/engine | Min 80% coverage |
| 1.7 | Add API route tests | All apps | Min 70% coverage |
| 1.8 | Set up CI/CD with GitHub Actions | Root | Gate for Phase 2 |
| 1.9 | Wire email sending (Resend) | packages/notifications | Core flow |
| 1.10 | Add pagination to list views | All apps | Performance |

**Exit criteria**: All apps pass CI/CD. Test coverage >= 70%. No security issues at Critical/High severity.

---

## Phase 2 - Extract Shared Patterns (Weeks 5-8)

**Goal**: Move duplicated frontend patterns into shared packages. Apps remain separate.

### 2a - Shared Middleware Pattern

Extract role middleware logic into `@ridendine/auth`:

```typescript
// packages/auth/src/middleware.ts
export function createRoleMiddleware(config: {
  requiredRole: UserRole
  loginPath: string
  homePath: string
  bypassPaths?: string[]
}): NextMiddleware
```

Each app imports and uses this factory:
```typescript
// apps/chef-admin/middleware.ts
import { createRoleMiddleware } from '@ridendine/auth'
export default createRoleMiddleware({ requiredRole: 'chef', loginPath: '/auth/login', homePath: '/dashboard' })
```

**Benefit**: Middleware is now testable and consistent. Bug fixes apply to all apps simultaneously.

### 2b - Shared Layout Components

Extract navigation shells into `@ridendine/ui`:

```
packages/ui/src/
  shells/
    CustomerShell.tsx    - Customer nav, cart drawer, profile menu
    ChefShell.tsx        - Chef sidebar, order notifications
    OpsShell.tsx         - Admin sidebar, status indicators
    DriverShell.tsx      - Driver bottom nav, online toggle
```

Each app's `layout.tsx` imports its shell component.

### 2c - Shared Auth Flow Components

Extract login/signup forms into `@ridendine/ui`:
```
packages/ui/src/
  auth/
    LoginForm.tsx
    SignupForm.tsx
    PasswordResetForm.tsx
```

Each app's `/auth/login/page.tsx` composes from these components.

### 2d - Standardize API Response Format

All API routes must return consistent shape:
```typescript
type ApiResponse<T> = {
  data: T | null
  error: string | null
  meta?: { page?: number; total?: number }
}
```

Extract `apiResponse()` helper to `@ridendine/utils`.

**Exit criteria**: All apps use shared middleware factory. All apps use shared shell components. API response format consistent.

---

## Phase 3 - Create Unified App Shell (Weeks 9-12)

**Goal**: Create a new `apps/platform` app with role-based routing. Individual apps still exist and run.

### Route Structure

```
apps/platform/
  src/
    app/
      (customer)/          - Route group for customer
        page.tsx           - Customer home
        browse/page.tsx
        cart/page.tsx
        orders/page.tsx
        checkout/page.tsx
      (chef)/              - Route group for chef
        dashboard/page.tsx
        orders/page.tsx
        menu/page.tsx
        earnings/page.tsx
      (ops)/               - Route group for ops admin
        dashboard/page.tsx
        orders/page.tsx
        chefs/page.tsx
        finance/page.tsx
      (driver)/            - Route group for driver
        dashboard/page.tsx
        deliveries/page.tsx
        earnings/page.tsx
      auth/
        login/page.tsx     - Unified login with role detection
        signup/page.tsx
      middleware.ts        - Unified role routing middleware
      layout.tsx           - Root layout with RoleShellProvider
```

### Unified Middleware Logic

```typescript
// apps/platform/middleware.ts
export default async function middleware(request: NextRequest) {
  const session = await getSession(request)
  if (!session) return redirectToLogin(request)

  const role = session.user.role
  const pathname = request.nextUrl.pathname

  // Role-based routing
  if (pathname === '/' || pathname.startsWith('/dashboard')) {
    return redirectToRoleHome(role, request)
  }

  // Protect route groups by role
  if (pathname.startsWith('/(chef)') && role !== 'chef') return forbidden()
  if (pathname.startsWith('/(ops)') && role !== 'ops_admin') return forbidden()
  // etc.
}
```

### Tech Approach

- Use Next.js route groups `(groupname)` - these do not appear in URLs
- `RoleShellProvider` context detects role, renders correct shell
- Shared packages (`@ridendine/ui`, `@ridendine/engine`, `@ridendine/db`) used directly
- API routes in `apps/platform/src/app/api/` - unified, no duplication

**Exit criteria**: `apps/platform` builds and passes CI/CD. All roles can log in and reach their home page. Pages are stubs only - no content migration yet.

---

## Phase 4 - Migrate Pages (Weeks 13-24)

**Goal**: Move pages from individual apps into `apps/platform` one domain at a time. Individual apps remain live during migration.

### Migration Order

Safe order based on complexity and risk:

**Wave 1 - web (Customer App)**
Priority: Most stable, most customer-facing

| Domain | Pages | Risk |
|--------|-------|------|
| Browse/Discovery | `/`, `/chefs/[id]`, `/menu/[id]` | Low |
| Cart/Checkout | `/cart`, `/checkout` | Medium |
| Order tracking | `/orders`, `/orders/[id]` | Medium |
| Auth | `/auth/login`, `/auth/signup` | Low |
| Profile | `/profile`, `/settings` | Low |

**Wave 2 - chef-admin (Chef App)**

| Domain | Pages | Risk |
|--------|-------|------|
| Dashboard | `/dashboard` | Low |
| Order management | `/dashboard/orders`, `/dashboard/orders/[id]` | Medium |
| Menu management | `/dashboard/menu` | Medium |
| Storefront setup | `/dashboard/storefront` | High |
| Earnings/payouts | `/dashboard/earnings` | High |

**Wave 3 - driver-app (Driver App)**

| Domain | Pages | Risk |
|--------|-------|------|
| Dashboard | `/dashboard` | Low |
| Active delivery | `/dashboard/active` | High |
| Earnings | `/dashboard/earnings` | Medium |

**Wave 4 - ops-admin (Most Complex - Last)**

| Domain | Pages | Risk |
|--------|-------|------|
| Overview | `/dashboard` | Low |
| Order management | `/orders` | Medium |
| Chef management | `/chefs` | Medium |
| Finance/refunds | `/finance` | High |
| Platform settings | `/settings` | High |

### Migration Process Per Page

For each page:
1. Copy page from individual app to `apps/platform` route group
2. Update imports (packages are already shared, little to change)
3. Add E2E test for the page in `apps/platform`
4. Deploy behind feature flag
5. Verify in staging
6. Enable flag in production
7. Monitor for 48 hours
8. Remove from individual app

**Exit criteria**: All pages migrated. Individual apps serve zero traffic. CI/CD green.

---

## Phase 5 - Retire Individual Apps (Week 25+)

**Goal**: Remove `apps/web`, `apps/chef-admin`, `apps/ops-admin`, `apps/driver-app`.

### Steps

1. Remove apps from `turbo.json` pipeline
2. Remove from `pnpm-workspace.yaml`
3. Delete app directories
4. Update deployment configuration
5. Archive any app-specific documentation

**Exit criteria**: Monorepo has single app `apps/platform`. All functionality working. Individual apps deleted from repo.

---

## Prerequisites for Any Phase Transition

Before moving from Phase N to Phase N+1:

| Gate | Requirement |
|------|-------------|
| Test coverage | >= 70% overall, >= 85% engine core |
| CI/CD | All pipelines green |
| Security | No Critical/High open findings |
| Staging | All user roles tested end-to-end |
| Rollback plan | Documented and tested |
| Feature flags | Configured for gradual rollout |

---

## What NOT to Do

- Do not attempt a big-bang migration of all pages at once
- Do not merge before Phase 1 is complete (security risks still open)
- Do not use the same domain for individual apps and unified app during Phase 4 transition
- Do not delete individual apps until Phase 4 migration is 100% verified
- Do not skip the CI/CD gate - it is the safety net for this entire strategy

---

## Related Files

- `16-merge-readiness-assessment.md` - Current state assessment
- `19-priority-fix-roadmap.md` - Detailed task prioritization
- `24-recommended-target-architecture.md` - Target architecture diagram
- `25-gap-analysis-to-fully-functional-platform.md` - Full gap inventory
