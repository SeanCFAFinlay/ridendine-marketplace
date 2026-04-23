# 15 - Cross-App Duplication Map

**Audit Date**: 2026-04-23
**Scope**: All patterns duplicated across 2 or more apps; what is correctly shared vs what should be shared
**Status**: MODERATE DUPLICATION - core business logic is shared; infrastructure boilerplate is not

---

## Table of Contents

1. [Duplication Summary](#duplication-summary)
2. [Duplicated Patterns (Detail)](#duplicated-patterns-detail)
3. [What Is Properly Shared](#what-is-properly-shared)
4. [Consolidation Recommendations](#consolidation-recommendations)

---

## Duplication Summary

| Pattern | Apps with Copies | Drift Risk | Consolidation Effort |
|---------|-----------------|-----------|---------------------|
| Engine client initialization | 4 of 4 | HIGH | LOW |
| middleware.ts auth bypass + session check | 4 of 4 | HIGH | LOW |
| Auth login page structure | 3 of 4 | MEDIUM | MEDIUM |
| Dashboard layout / sidebar | 2 of 4 | HIGH | MEDIUM |
| globals.css brand color variables | 4 of 4 | MEDIUM | LOW |
| Error page | 4 of 4 | LOW | LOW |
| Not-found page | 4 of 4 | LOW | LOW |
| Loading skeleton | 4 of 4 | LOW | MEDIUM |
| ActorContext construction | 4 of 4 | HIGH | LOW |
| Supabase client creation (server) | 4 of 4 | LOW | ALREADY SHARED (partial) |

---

## Duplicated Patterns (Detail)

### 1. Engine Client Initialization

**Pattern**: Identical code in all 4 apps at `src/lib/engine.ts`

**What is duplicated**:
```typescript
// apps/*/src/lib/engine.ts (identical across all 4 apps)
import { createEngineClient } from '@ridendine/engine';
import { createServerClient } from '@ridendine/db';

export function getEngine() {
  const db = createServerClient();
  return createEngineClient({ db });
}
```

**Why it's risky**: Any change to the engine client constructor signature requires updates in 4 separate files. In the past this has caused contract drift.

**Affected files**:
- `apps/web/src/lib/engine.ts`
- `apps/chef-admin/src/lib/engine.ts`
- `apps/ops-admin/src/lib/engine.ts`
- `apps/driver-app/src/lib/engine.ts`

**Fix**: Export a pre-built `getEngine()` factory from `@ridendine/engine` or create a `packages/engine-client` package.

---

### 2. Middleware Auth Bypass and Session Check

**Pattern**: Near-identical `middleware.ts` in all 4 apps

**What is shared** (exact copy):
```typescript
const bypassAuth = process.env.NODE_ENV === 'development' ||
  process.env.BYPASS_AUTH === 'true';

if (bypassAuth) {
  return NextResponse.next();
}

const { data: { session } } = await supabase.auth.getSession();
if (!session) {
  return NextResponse.redirect(new URL('/login', request.url));
}
```

**What varies per app**:
- Which routes are protected (matcher config)
- Which table is checked for role validation (customers, chef_profiles, etc.)
- Redirect destination for unapproved status

**Why it's risky**: The bypass logic is security-critical. A bug fix (e.g., changing `NODE_ENV === 'development'` to explicit `BYPASS_AUTH=true` only) must be applied in 4 files.

**Affected files**:
- `apps/web/src/middleware.ts`
- `apps/chef-admin/src/middleware.ts`
- `apps/ops-admin/src/middleware.ts`
- `apps/driver-app/src/middleware.ts`

**Fix**: Extract `createAuthMiddleware(options)` factory into `packages/auth`. Each app calls it with its own route list and role check function. Bypass logic lives in one place.

---

### 3. Auth Login Page Structure

**Pattern**: Similar login form structure in 3 of 4 apps

**Apps with similar login pages**: `apps/web`, `apps/chef-admin`, `apps/driver-app`

**What is duplicated**:
- Email + password fields with react-hook-form
- Zod validation schema (email required, password min 8)
- Error message display pattern
- `supabase.auth.signInWithPassword()` call
- Redirect after successful login

**Differences**:
- `apps/ops-admin` login has additional platform_users role check and different UI
- `apps/web` has "Register" link; `apps/chef-admin` has "Apply to cook" link
- Visual styling differs (brand colors consistent, layout varies)

**Why it matters**: Bug fixes (e.g., handling "Email not confirmed" error) must be applied to 3 files separately.

**Fix**: Export a `LoginForm` base component from `@ridendine/ui` that accepts `onSuccess` callback and `registerHref` prop. Each app wraps it with its own layout.

---

### 4. Dashboard Layout / Sidebar

**Pattern**: Structurally identical sidebar navigation in chef-admin and ops-admin

**What is duplicated**:
- Collapsible sidebar with icon + label nav items
- Active state detection via `usePathname()`
- User avatar + name in sidebar footer
- Mobile sidebar toggle (hamburger)
- CSS classes for open/collapsed state

**What differs**:
- Navigation items (menu, orders, payouts vs orders, chefs, drivers, finance)
- Brand color used for active state (brand-600 in chef-admin vs indigo-600 in ops-admin)
- Logo image

**Affected files**:
- `apps/chef-admin/src/components/layout/DashboardLayout.tsx`
- `apps/ops-admin/src/components/layout/OpsLayout.tsx`

**Why it's risky**: Layout bugs (accessibility, mobile collapse) must be fixed in 2 places. The color inconsistency means the apps look different without reason.

**Fix**: Add `Sidebar` and `DashboardLayout` base components to `@ridendine/ui`. Accept `navItems`, `logo`, and `activeColor` props. Both apps use the same component.

---

### 5. globals.css Brand Color Variables

**Pattern**: All 4 apps define the same brand hex values as CSS custom properties

**Example (repeated in each app)**:
```css
/* apps/*/src/app/globals.css */
:root {
  --brand-primary: #E85D26;
  --brand-teal: #1a9e8e;
  --brand-teal-dark: #1a7a6e;
}
```

The variable names differ slightly between apps:
- web: `--brand-primary`, `--brand-teal`
- chef-admin: `--color-brand`, `--color-teal`
- ops-admin: `--brand-600`, `--teal-600`
- driver-app: `--primary`, `--secondary`

**Why it's risky**: A brand color change requires 4 file edits with 4 different variable name conventions.

**Fix**: Define CSS custom properties in the shared Tailwind base config using `@layer base` in a shared CSS file exported from `packages/config`. Each app imports the shared base CSS instead of redefining.

---

### 6. Error and Not-Found Pages

**Pattern**: Each app has its own `error.tsx` and `not-found.tsx`

**What is duplicated**: Error message structure, "Go home" button, use of `ErrorState` from `@ridendine/ui`

**What differs**: Only the "home" href (`/` vs different dashboards)

**Affected files**: 8 files total (2 per app)

**Fix**: These are unlikely to drift significantly. Low priority. Could pass `homeHref` prop to a shared error page component.

---

### 7. Loading Pages

**Pattern**: Each app has its own `loading.tsx` and per-page loading skeletons

**What is duplicated**: Spinner usage, skeleton card pattern, layout wrapping

**What differs**: Layout matches each app's specific page structure

**Affected files**: Multiple per app

**Fix**: A shared `PageSkeleton` and `CardSkeleton` component in `@ridendine/ui` would reduce skeleton markup duplication.

---

### 8. ActorContext Construction

**Pattern**: Every app's engine-calling API routes construct an actor context with the same pattern

**What is duplicated**:
```typescript
// In every API route that calls the engine:
const session = await getSession(request);
const actor = await getChefActorContext(session.user.id);
const engine = getEngine();
const result = await engine.doSomething({ actor, ... });
```

The session fetch + actor context construction sequence is repeated across dozens of API routes.

**Fix**: Create a `withActor(role, handler)` higher-order function that wraps the session + actor context construction. Each API route exports `export const POST = withActor('chef', async (req, actor) => { ... })`.

---

## What Is Properly Shared

The following are correctly centralized and do not need consolidation:

| What | Package | Notes |
|------|---------|-------|
| Database repositories | `@ridendine/db` | Single source of truth for all DB access |
| Engine orchestrators | `@ridendine/engine` | All business logic in one place |
| TypeScript types | `@ridendine/types` | Shared types used across all apps |
| Zod validation schemas | `@ridendine/validation` | Schemas reused in API routes + forms |
| UI components (9) | `@ridendine/ui` | Button, Input, Card, Badge, etc. |
| Auth hooks | `@ridendine/auth` | useAuth, AuthProvider, getUserRoles |
| Tailwind config | `@ridendine/config` | Base config extended by all apps |
| ESLint config | `@ridendine/config` | Shared lint rules |
| TypeScript config | `@ridendine/config` | Shared tsconfig.base.json |
| Notification templates | `@ridendine/notifications` | Email templates (sending not wired) |
| Utility functions | `@ridendine/utils` | Date formatting, currency, etc. |

---

## Consolidation Recommendations

Prioritized by risk reduction:

| Priority | Item | Effort | Risk Reduction |
|----------|------|--------|---------------|
| 1 | Extract `createAuthMiddleware()` to `packages/auth` | LOW | CRITICAL (security-sensitive bypass logic) |
| 2 | Extract `getEngine()` factory to `packages/engine` | LOW | HIGH (contract drift prevention) |
| 3 | Extract `withActor()` HOF to `packages/auth` | LOW | HIGH (auth consistency across routes) |
| 4 | Shared CSS custom properties in config package | LOW | MEDIUM (brand color consistency) |
| 5 | Add `Sidebar`/`DashboardLayout` to `@ridendine/ui` | MEDIUM | MEDIUM (layout bug consolidation) |
| 6 | Add `LoginForm` base to `@ridendine/ui` | MEDIUM | MEDIUM (auth UX consistency) |
| 7 | Add `DataTable` to `@ridendine/ui` | HIGH | MEDIUM (table consistency) |
| 8 | Add `FormField` to `@ridendine/ui` | MEDIUM | LOW (form consistency) |
