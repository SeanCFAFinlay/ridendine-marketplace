# Merge Readiness Update

**Date**: 2026-04-23
**Score**: 65% (was 40% at end of Phase 1)
**Verification**: TypeScript typecheck 12/12 pass (0 errors) | Engine tests 135/135 pass (7 test files)

---

## Score Progression

| Phase | Score | Key Gains |
|-------|-------|-----------|
| Pre-Phase 1 | ~25% | Baseline — four independent apps with no shared infrastructure |
| End of Phase 1 | 40% | Response helpers standardized, engine abstracted, auth package created |
| End of Phase 2 | **65%** | Middleware unified, schemas consolidated, roles unified, pagination added, notifications wired |

---

## What Is Now Safe to Merge (Backend)

The following items represent resolved blockers or stable shared foundations. A merge attempt today would not break on these.

### Middleware
All four apps use the same `createAuthMiddleware` factory. Route protection logic is consistent. A merged app can adopt the same factory with a combined route config.

### Engine Client
All four apps import engine access from `@ridendine/engine/server`. There is no duplicated engine instantiation. A merged app would have one import path.

### Validation Schemas
All four apps import validation schemas from `@ridendine/validation`. Schemas are domain-organized and named consistently. A merged app inherits all schemas without conflict.

### Role Definitions
All four apps use `AppRole` from `@ridendine/types`. Role checks, middleware configs, and engine guards all reference the same enum values. No role mismatches exist.

### API Response Format
All route handlers return `successResponse`, `errorResponse`, or `paginatedResponse` from `@ridendine/utils`. Response shapes are identical across all apps. Frontend clients can rely on a single response contract.

### Pagination
Four ops-admin list endpoints are paginated with a consistent contract (`?page`, `?limit`, `PaginatedData<T>`). Any new list endpoints should follow this same pattern.

### Notifications (Internal)
The engine fires notifications on order accept and order complete. The `notifications` table receives these writes. Internal notification delivery is operational. External delivery is not yet wired but does not block a merge.

### Real-Time Subscriptions
`useRealtimeSubscription()` is available from `@ridendine/db`. Any component in any app can use it without writing channel setup boilerplate.

### Layout Contract
`LayoutConfig`, `NavItem`, `NavSection`, `PageMeta`, and `BreadcrumbItem` types are defined in `@ridendine/types/layout`. Not yet consumed, but the contract is stable and ready for Phase 3 implementation.

---

## What Still Blocks Merging

The following items must be resolved before a merged app can be shipped to production. They are listed in dependency order.

### Blocker 1: Route Path Collisions (HIGH)

`/dashboard` exists as the primary route in three apps. `/auth/login` exists in all four. A merged app served from one domain would have ambiguous routing.

**Required resolution**: Role-based route prefixes. Proposed convention:
- `/customer/...` — customer app routes
- `/chef/...` — chef admin routes
- `/ops/...` — ops admin routes
- `/driver/...` — driver app routes

Shared routes (e.g., `/auth/login`) would route to the appropriate dashboard based on role after authentication.

**Estimated effort**: Medium. Requires updating all `href` values in navigation configs, all redirects in middleware configs, and all `router.push` calls in components.

### Blocker 2: CSS and Styling Conflicts (HIGH)

Each app has its own `globals.css` with different color tokens. Active nav state colors differ by app. Tailwind config varies slightly per app. Merging CSS would produce visual conflicts.

**Required resolution**: Unified design token system. Each app's theme color can be a token variant (e.g., `--color-primary: var(--theme-chef-primary)`) rather than a hardcoded value.

**Estimated effort**: Medium-High. Requires design decisions before engineering work can begin.

### Blocker 3: App-Specific Sidebar/Layout Components (HIGH)

Each app has its own `DashboardLayout` component with different navigation structures, different sidebar widths, and different header contents. There is no shared layout component in `@ridendine/ui`.

**Required resolution**: Build a shared `DashboardLayout` in `@ridendine/ui` that accepts a `LayoutConfig` (already defined in `@ridendine/types/layout`). Each app passes its own config.

**Estimated effort**: Medium. The `LayoutConfig` contract is already defined. Engineering work is building the component and migrating each app.

### Blocker 4: No Shared Form or Table Patterns (MEDIUM)

Each app builds forms and data tables independently. There is no shared form component, no shared table component, and no shared field validation display pattern in `@ridendine/ui`.

**Required resolution**: Introduce shared `Form`, `Field`, `DataTable`, and `Pagination` components in `@ridendine/ui`. These can wrap a form library (e.g., react-hook-form) with consistent styling.

**Estimated effort**: High. Lower priority than layout — forms can remain app-specific in a merged app without causing breakage, only inconsistency.

### Blocker 5: Stale DB Types (MEDIUM)

`packages/db/src/database.types.ts` does not include tables introduced in migrations 7–10. Any repository code referencing these tables does so without type safety. TypeScript passes because the missing types have been manually approximated, but the generated types are stale.

**Required resolution**: Connect to the Supabase instance and run `pnpm db:generate`.

**Estimated effort**: Low (minutes) — blocked only by Supabase instance availability, not code work.

### Blocker 6: Mock Stripe Refund IDs (HIGH for production)

The ops-admin refund processing flow writes mock Stripe refund IDs to the database instead of calling the Stripe API. Real refund operations fail silently.

**Required resolution**: Wire the Stripe Refunds API. The refund route already has the shape correct — it needs a real `stripe.refunds.create()` call replacing the mock.

**Estimated effort**: Low-Medium. Stripe SDK is likely already a dependency. Requires Stripe secret key in environment config and one API call implementation.

### Blocker 7: No External Notification Delivery (MEDIUM for production)

Notification templates exist in `@ridendine/notifications`. The engine writes to the `notifications` table. But no email or SMS is sent. Users receive no communication outside the app.

**Required resolution**: Wire Resend (or equivalent) to the `NotificationSender`. When a notification is written to the DB, also call `resend.emails.send()` if the notification type has an email template.

**Estimated effort**: Low-Medium. `NotificationSender` is the single integration point. Resend SDK installation and one send call.

---

## Phase 3 Recommendation

### Priority Order

| Priority | Item | Rationale |
|----------|------|-----------|
| 1 (CRITICAL) | Wire Stripe refunds | Real money operations are broken in production |
| 2 (HIGH) | Wire Resend email notifications | Users have no communication channel |
| 3 (HIGH) | Build shared DashboardLayout in `@ridendine/ui` | Prerequisite for merge prep |
| 4 (MEDIUM) | Implement role-based route prefixes | Required before routes can coexist in one app |
| 5 (MEDIUM) | Regenerate DB types | Run when Supabase instance is available |
| 6 (LOW) | Shared form and table components | Consistency improvement, not a hard blocker |

### Phase 3 Merge Readiness Target
Completing items 1–5 above should raise merge readiness to approximately **85%**. The remaining 15% would be CSS unification and shared form components, which can be done post-merge as incremental improvements.

### Architecture Note
A full merge into a single Next.js app is one path. An alternative is to keep four apps but serve them behind a shared domain with role-based subdomain or path routing (e.g., `app.ridendine.com/chef/`, `app.ridendine.com/ops/`). The shared package layer built in Phases 1 and 2 supports both approaches equally. The route prefix work in Phase 3 should be designed to be path-prefix agnostic so either deployment model remains viable.
