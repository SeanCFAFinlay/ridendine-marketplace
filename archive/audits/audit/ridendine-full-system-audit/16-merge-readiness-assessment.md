# 16 - Merge Readiness Assessment

**Audit Date**: 2026-04-23
**Subject**: Feasibility of merging 4 separate Next.js apps into a unified platform
**Verdict**: NOT READY - Do not merge yet

---

## Current State

Ridendine runs as four independent Next.js 14 applications sharing a monorepo:

| App | Port | Primary User | Status |
|-----|------|-------------|--------|
| `apps/web` | 3000 | Customer | Most stable |
| `apps/chef-admin` | 3001 | Chef | Partially wired |
| `apps/ops-admin` | 3002 | Operations admin | Most complex, incomplete |
| `apps/driver-app` | 3003 | Driver | Partial |

Each app is a self-contained Next.js application with its own `middleware.ts`, `layout.tsx`, `globals.css`, and routing tree.

---

## What Is Already Shared (Merge Enablers)

The backend foundation is genuinely unified. The following is already shared via monorepo packages:

### Data Layer
- `@ridendine/db` - 22 repositories covering all business domains
- Single Supabase instance (PostgreSQL) shared across all apps
- Consistent Row Level Security policies

### Business Logic
- `@ridendine/engine` - 7 orchestrators (orders, dispatch, platform, commerce, chef, driver, notifications)
- All state transitions go through the engine
- Domain events and audit logging centralized

### Type System
- `@ridendine/types` - Shared TypeScript interfaces
- `@ridendine/validation` - Shared Zod schemas
- `@ridendine/auth` - Shared authentication utilities

### UI
- `@ridendine/ui` - Shared React component library
- `@ridendine/config` - Shared Tailwind, TypeScript, ESLint configs

### Role Isolation
- Each app's `middleware.ts` already checks user roles
- Supabase JWT claims carry role information
- RLS policies enforce role-based data access at DB level

---

## What Is Not Shared (Merge Blockers)

### Route Collisions

All four apps define routes that will collide in a unified app:

| Route | web | chef-admin | ops-admin | driver-app |
|-------|-----|-----------|----------|-----------|
| `/` | Customer home | Chef home | Ops home | Driver home |
| `/dashboard` | Customer orders | Chef orders | Ops overview | Driver stats |
| `/auth/login` | Yes | Yes | Yes | Yes |
| `/auth/signup` | Yes | Yes | Yes | Yes |
| `/profile` | Customer profile | Chef profile | - | Driver profile |
| `/settings` | Customer settings | Chef settings | Platform settings | Driver settings |
| `/orders` | Customer order history | Chef order queue | All orders | - |

A naive merge would require all 4 apps to be prefixed (e.g., `/customer/*`, `/chef/*`, `/ops/*`, `/driver/*`), which is a significant refactor of every `Link`, `redirect()`, `useRouter().push()`, and `fetch('/api/...')` call across the entire codebase.

### Middleware Conflicts

Each app has its own `middleware.ts`:

```
apps/web/middleware.ts          - checks: authenticated customer
apps/chef-admin/middleware.ts   - checks: authenticated chef, verified
apps/ops-admin/middleware.ts    - checks: authenticated ops admin
apps/driver-app/middleware.ts   - checks: authenticated driver
```

A single unified `middleware.ts` must handle all four role types, route them to correct pages, and prevent cross-role access. The current middlewares cannot be concatenated - a unified version must be written from scratch with full role-routing logic.

### Layout Conflicts

Each app has its own `layout.tsx` with different:
- Navigation components (customer nav vs chef dashboard nav vs ops sidebar)
- Color themes (each app has slightly different primary colors)
- Font configurations
- Meta/SEO tags
- Provider wrappings (CartProvider only in web, etc.)

A unified layout must be role-aware and conditionally render the correct navigation shell.

### CSS / Styling Conflicts

Each app has its own `globals.css` with:
- Different CSS custom property values (colors, spacing)
- Different Tailwind base layer overrides
- App-specific utility classes with identical names but different values

Merging these directly will cause visual regressions across all apps.

### API Route Namespacing

Each app has `/api/*` routes. In a unified app, these routes must be deduplicated or namespaced:

- `/api/orders` exists in both `web` and `ops-admin`
- `/api/webhooks/stripe` exists in `web` only but would need to be singular
- `/api/drivers` exists in `ops-admin` and `driver-app`

---

## Merge Readiness Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Backend / Data layer | 90% | Engine + repositories already unified |
| Type system | 85% | Mostly shared; generated types stale |
| Auth / Role enforcement | 60% | Role logic works but BYPASS_AUTH security risk |
| UI component sharing | 55% | Shared lib exists but each app has local components |
| Route architecture | 10% | Identical route names in all apps |
| Middleware architecture | 15% | Four separate, incompatible middlewares |
| Layout architecture | 20% | Four separate layouts, no role-routing |
| CSS / Design tokens | 25% | Per-app globals with conflicts |
| Test coverage | 5% | Almost no tests to protect a merge |
| CI/CD | 0% | No pipeline to catch regressions |

**Overall Merge Readiness: 40%**

The backend half is ready. The frontend half is not.

---

## What Would Break If Merged Naively

1. **All internal links break** - every `href="/dashboard"` becomes ambiguous across roles
2. **All redirects break** - `redirect('/auth/login')` from middleware hits wrong login page
3. **Layout renders wrong nav** - customer gets chef sidebar or vice versa
4. **CSS wars** - conflicting custom properties produce broken visual output
5. **API routes shadow each other** - duplicate `/api/orders` handlers, only one wins
6. **Middleware logic wrong** - single middleware checking all roles without routing logic locks users out or grants wrong access
7. **No regression safety** - 5% test coverage means no way to detect breakage automatically

---

## Recommendation

**Do NOT merge apps yet.** The backend is already unified (engine + DB layer). The frontend separation provides isolation while the platform stabilizes.

Before evaluating merge:

1. **Fix security issues first** (BYPASS_AUTH, input validation) - non-negotiable
2. **Standardize middleware pattern** - extract `createRoleMiddleware(role, options)` into `@ridendine/auth` that each app imports
3. **Create shared layout components** - role-aware shell components in `@ridendine/ui`
4. **Complete engine wiring** - stub flows completed, real integrations in place
5. **Add comprehensive tests** - minimum 70% coverage before any structural refactor
6. **Establish CI/CD** - automated test runs before any merge attempt
7. **Then evaluate** - role-based routing within single app vs. keeping separate apps (both are valid architectures)

---

## Related Files

- `17-safe-unification-strategy.md` - Phased approach if merge is pursued
- `18-risk-register.md` - Risk inventory including merge-related risks
- `24-recommended-target-architecture.md` - Target state recommendation
