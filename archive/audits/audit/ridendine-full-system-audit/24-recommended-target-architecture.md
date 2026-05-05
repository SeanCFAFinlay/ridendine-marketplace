# 24 - Recommended Target Architecture

**Audit Date**: 2026-04-23
**Recommendation**: Evolve current architecture, do not rewrite

---

## Core Recommendation

**Do not rewrite Ridendine.** The engine and DB layer represent substantial, correct business logic investment. The platform's problems are implementation gaps and frontend fragmentation, not architectural unsoundness.

The recommended path is evolutionary: stabilize what exists, fill the gaps, then consolidate the frontend as a final step.

---

## Current State Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTERNET / USERS                             │
└───────────┬──────────────┬──────────────┬──────────────┬────────┘
            │              │              │              │
            ▼              ▼              ▼              ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐
    │  apps/web    │ │apps/chef-    │ │apps/ops- │ │apps/driver-  │
    │  (port 3000) │ │admin         │ │admin     │ │app           │
    │  Customer    │ │(port 3001)   │ │(port 3002│ │(port 3003)   │
    │  Next.js 14  │ │Chef          │ │Ops Admin │ │Driver        │
    │              │ │Next.js 14    │ │Next.js 14│ │Next.js 14    │
    └──────┬───────┘ └──────┬───────┘ └────┬─────┘ └──────┬───────┘
           │                │              │              │
           └────────────────┴──────────────┴──────────────┘
                                    │
                        ┌───────────▼───────────┐
                        │   @ridendine/engine    │
                        │   7 Orchestrators:     │
                        │   - orders             │
                        │   - dispatch           │
                        │   - platform           │
                        │   - commerce           │
                        │   - chef               │
                        │   - driver             │
                        │   - notifications      │
                        └───────────┬───────────┘
                                    │
                        ┌───────────▼───────────┐
                        │    @ridendine/db       │
                        │    22 Repositories     │
                        └───────────┬───────────┘
                                    │
                        ┌───────────▼───────────┐
                        │      SUPABASE          │
                        │   PostgreSQL           │
                        │   56 Tables            │
                        │   RLS Policies         │
                        │   Real-time            │
                        └───────────────────────┘

PROBLEMS:
- 4 separate middleware.ts (no shared pattern)
- 4 separate layouts (no role routing)
- Duplicate route names across apps
- No tests, no CI/CD, no monitoring
- Broken: refunds, notifications, GPS
```

---

## Target State Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     INTERNET / USERS                             │
└─────────────────────────┬───────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   CDN / Edge Network  │
              │  (Vercel Edge / CF)   │
              │  Rate limiting here   │
              └───────────┬───────────┘
                          │
                          ▼
              ┌───────────────────────┐
              │   apps/platform       │
              │   Single Next.js 14   │
              │   Unified App         │
              │                       │
              │  middleware.ts ──────► role detection + routing
              │                       │
              │  /(customer)/*        │ Customer route group
              │  /(chef)/*            │ Chef route group
              │  /(ops)/*             │ Ops route group
              │  /(driver)/*          │ Driver route group
              │  /auth/*              │ Unified auth
              │                       │
              │  RoleShellProvider    │ Renders correct nav
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │   @ridendine/auth     │
              │   createRoleMiddleware│ Shared middleware factory
              │   getSession()        │
              │   hasRole()           │
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │   @ridendine/engine   │
              │   7 Orchestrators     │ Unchanged - this is correct
              │   AuditLogger         │
              │   EventBus            │
              └───────────┬───────────┘
                          │
         ┌────────────────┼────────────────┐
         │                │                │
         ▼                ▼                ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│@ridendine/db│  │   STRIPE     │  │   RESEND     │
│22 Repos     │  │   Payments   │  │   Email      │
└──────┬──────┘  └──────────────┘  └──────────────┘
       │
       ▼
┌─────────────────────────┐
│        SUPABASE         │
│   PostgreSQL (56 tables)│
│   RLS Policies          │
│   Real-time Channels    │
│   Auth (JWT + roles)    │
│   Storage (images)      │
└─────────────────────────┘
       │
       ▼
┌─────────────────────────┐
│   MONITORING LAYER      │
│   Sentry (errors)       │
│   Pino (structured logs)│
│   Health checks         │
│   Uptime monitoring     │
└─────────────────────────┘

IMPROVEMENTS FROM CURRENT:
- Single app deployment unit
- Shared middleware with role routing
- Real notifications (Resend)
- Real Stripe refunds
- Real GPS tracking
- CI/CD pipeline
- Monitoring and observability
- 80%+ test coverage
```

---

## What Does NOT Change

These are correct and should be preserved as-is:

| Component | Keep As-Is | Rationale |
|-----------|-----------|-----------|
| `@ridendine/engine` orchestrators | Yes | Business logic is correct |
| `@ridendine/db` repositories | Yes | Data access pattern is sound |
| `@ridendine/types` | Yes | Type definitions are correct |
| `@ridendine/validation` | Yes | Zod schemas are reusable |
| Supabase schema (most tables) | Yes | 56-table schema is well designed |
| RLS policies | Yes | Security model is correct |
| Stripe integration pattern | Yes | PaymentIntent pattern is correct |
| Turborepo monorepo | Yes | Build tool is appropriate |
| pnpm workspaces | Yes | Package manager is correct |

---

## What Changes

| Component | Change | Rationale |
|-----------|--------|-----------|
| 4 Next.js apps | Consolidate to 1 (`apps/platform`) | Eliminate route/middleware conflicts |
| 4 separate middlewares | 1 unified role-routing middleware | Consistency, testability |
| Per-app layouts | Role-aware shells in `@ridendine/ui` | Code reuse |
| `console.log` everywhere | Pino structured logging | Observability |
| No error tracking | Sentry in all apps | Production visibility |
| Mock refund IDs | Real `stripe.refunds.create()` | Financial correctness |
| BYPASS_AUTH | Deleted | Security |
| No notifications | Resend integration | Core user flows |
| Hardcoded fees | `platform_settings` DB table | Operational flexibility |
| No CI/CD | GitHub Actions pipeline | Development safety |

---

## Key Architectural Principles

### 1. Engine as Single Source of Truth

All business logic lives in `@ridendine/engine`. No app should:
- Calculate fees independently
- Transition order status without calling the engine
- Write to the database directly (bypass the repository layer)

This principle is already mostly followed. Enforce it strictly.

### 2. DB Access Through Repositories Only

All database queries go through `@ridendine/db` repositories. No raw Supabase client calls in app pages or API routes that bypass the repository pattern.

Current violation to fix: Any `supabase.from('table').select()` calls in app code that are not in a repository.

### 3. Real-time via Supabase Channels

All live status updates (order status, driver location, kitchen notifications) use Supabase real-time subscriptions:

```typescript
// Canonical pattern for real-time in target architecture
const subscription = supabase
  .channel(`order-${orderId}`)
  .on('postgres_changes', {
    event: 'UPDATE',
    schema: 'public',
    table: 'orders',
    filter: `id=eq.${orderId}`,
  }, handleOrderUpdate)
  .subscribe()
```

No polling. No manual WebSocket management.

### 4. Role-Based Routing at Middleware Layer

In the unified app, middleware is the single enforcer of role-based access:

```
Request → middleware.ts → getSession() → check role → allow/deny/redirect
```

No page-level role checks. No component-level role guards (except for UI rendering differences).

### 5. Feature Flags for Gradual Rollout

New features are deployed behind feature flags. This enables:
- Gradual rollout (1% → 10% → 100% traffic)
- A/B testing
- Quick rollback without code deployment
- Separate release from deployment

Store flags in `platform_settings` table (already exists). Read at request time with Redis cache.

---

## CI/CD Pipeline Design

```
GitHub Push → GitHub Actions

Pull Request:
  ├── pnpm install
  ├── pnpm typecheck
  ├── pnpm lint
  ├── pnpm test (with coverage gate: 70%)
  └── Build check (pnpm build)

Merge to main:
  ├── All PR checks
  ├── Deploy to staging (Vercel preview)
  ├── Run E2E tests against staging
  └── Notify team (Slack)

Tag release (v*):
  ├── All main checks
  ├── Deploy to production (Vercel)
  ├── Run smoke tests against production
  └── Create GitHub release
```

---

## Monitoring Architecture

```
Applications (Pino logger)
    │
    ├── Sentry ──────────────────► Error tracking, alerts
    │
    ├── Logtail/Datadog Logs ────► Log aggregation, search
    │
    └── Health check endpoints
              │
              ▼
         Uptime monitoring
         (Better Uptime / Pingdom)
              │
              ▼
         PagerDuty / Slack
         (On-call alerts)

Business Metrics:
    Supabase tables ────► Custom analytics dashboard
    (orders, deliveries,    (ops-admin /reports)
     earnings, etc.)
```

---

## Migration Sequence

This is not a rewrite sequence. It is an evolution:

```
Phase 0: Current (NOW)
    4 apps + shared packages
    ~56% feature complete
    Critical security issues
    
    ▼ Fix security + add CI/CD + add tests

Phase 1: Stable 4 apps (Month 1-2)
    4 apps, all secure
    80% test coverage
    CI/CD running
    Real notifications
    Real refunds
    
    ▼ Extract shared patterns

Phase 2: Shared patterns (Month 2-3)
    Shared middleware factory
    Shared layout shells
    Shared auth flows
    Standardized API responses
    
    ▼ Create unified app shell

Phase 3: Unified app shell (Month 3-4)
    apps/platform with route groups
    Role-routing middleware
    Empty pages (stubs only)
    CI/CD covers new app
    
    ▼ Migrate pages incrementally

Phase 4: Page migration (Month 4-7)
    web → chef-admin → driver-app → ops-admin
    Feature flags per migrated page
    Individual apps remain live
    
    ▼ Retire individual apps

Phase 5: Clean monorepo (Month 7+)
    Single apps/platform
    Individual apps deleted
    Full observability
    Full test coverage
```

---

## Non-Goals

These are explicitly NOT recommended:

- **Full rewrite in a different stack** - TypeScript/Next.js/Supabase is a sound stack, the code is not the problem
- **Microservices** - The monolith with shared packages is appropriate for current scale
- **Serverless split** - Turborepo + Vercel deployment already handles this efficiently
- **Database migration** - The 56-table Supabase schema is well-designed; fix the missing type generation, don't redesign
- **Replacing Stripe** - Stripe is the right tool; fix the refund integration, don't replace the payment provider
- **Big-bang migration** - Never attempt to migrate all pages at once; always phase

---

## Related Files

- `16-merge-readiness-assessment.md` - Current state assessment
- `17-safe-unification-strategy.md` - Detailed phasing plan
- `19-priority-fix-roadmap.md` - Immediate action items
- `25-gap-analysis-to-fully-functional-platform.md` - What needs to be built
