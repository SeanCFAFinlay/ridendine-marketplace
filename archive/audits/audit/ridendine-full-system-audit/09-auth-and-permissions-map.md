# 09 - Auth and Permissions Map

**Audit Date**: 2026-04-23
**Scope**: Authentication architecture, role model, middleware, RLS, security concerns
**Status**: SECURITY CONCERNS IDENTIFIED - bypass enabled by default in development

---

## Table of Contents

1. [Auth Provider](#auth-provider)
2. [Role Model](#role-model)
3. [Per-App Auth Middleware](#per-app-auth-middleware)
4. [Role Checking in Code](#role-checking-in-code)
5. [Row Level Security](#row-level-security)
6. [Security Concerns](#security-concerns)
7. [Permissions Matrix](#permissions-matrix)

---

## Auth Provider

**Provider**: Supabase Auth (email/password only)

**Documentation claims**: Google OAuth and Apple Sign-In mentioned in some docs
**Reality**: Neither Google nor Apple OAuth is implemented. No OAuth provider is registered. The social auth buttons are not present in any login page.

**Session management**:
- Supabase session tokens stored in cookies (SSR-compatible via `@supabase/ssr`)
- `packages/auth/src/index.ts` exports `createClient()`, `getSession()`, `getUserRoles()`
- Each app creates its own Supabase client via `@ridendine/db` or direct client creation
- Session refresh is handled by Supabase client middleware helper

**Token lifecycle**:
- Access tokens: 1 hour expiry (Supabase default)
- Refresh tokens: 7 days (Supabase default, not customized)
- No custom token rotation logic observed

---

## Role Model

Five distinct role types span four separate database tables:

### Customer Role

| Attribute | Value |
|-----------|-------|
| Table | `customers` |
| App | `apps/web` |
| Status check | `customers.status = 'active'` |
| Auth flow | Sign up → email confirm → active |
| RLS anchor | `auth.uid() = user_id` |

### Chef Role

| Attribute | Value |
|-----------|-------|
| Table | `chef_profiles` |
| App | `apps/chef-admin` |
| Status check | `chef_profiles.status = 'approved'` |
| Auth flow | Sign up → pending → ops approves → approved |
| RLS anchor | `auth.uid() = user_id` |
| Blocked if | status = 'pending' or 'suspended' |

### Driver Role

| Attribute | Value |
|-----------|-------|
| Table | `drivers` |
| App | `apps/driver-app` |
| Status check | `drivers.status = 'approved'` |
| Auth flow | Apply → pending → ops approves → approved |
| RLS anchor | `auth.uid() = user_id` |
| Blocked if | status = 'pending' or 'suspended' |

### Ops/Admin Roles (ops-admin app)

All ops roles share the `platform_users` table with a `role` column discriminator:

| Role | Access Level | Defined in Schema |
|------|-------------|------------------|
| `ops_agent` | Basic order/delivery management | YES |
| `ops_manager` | Full ops management + agent oversight | YES |
| `ops_admin` | All ops + config | YES |
| `finance_admin` | Finance-only access | YES |
| `super_admin` | Unrestricted | YES |
| `support` | Support ticket access | YES (schema only, no UI) |

The `support` role is defined in the `platform_users.role` enum but has no dedicated UI views in ops-admin and no route guards that grant it distinct permissions.

---

## Per-App Auth Middleware

All four apps have `src/middleware.ts` implementing the same pattern:

```
Request → Check BYPASS_AUTH env → If bypass: pass through
        → Check Supabase session → If no session: redirect to /login
        → Check role-specific table → If not found/approved: redirect
        → Pass through to route
```

### Bypass Logic (All Apps)

```typescript
// Pattern found in all 4 middleware.ts files
const bypassAuth = process.env.NODE_ENV === 'development' ||
  process.env.BYPASS_AUTH === 'true';

if (bypassAuth) {
  return NextResponse.next();
}
```

**Risk**: `NODE_ENV === 'development'` is true in any local development environment. Auth is completely skipped without any env var needing to be set. Any developer running locally has unrestricted access to all routes.

### Per-App Middleware Details

| App | File | Protected Routes | Redirect Target |
|-----|------|-----------------|----------------|
| `apps/web` | `src/middleware.ts` | `/account/*`, `/orders/*`, `/checkout` | `/login` |
| `apps/chef-admin` | `src/middleware.ts` | All except `/login`, `/register` | `/login` |
| `apps/ops-admin` | `src/middleware.ts` | All except `/login` | `/login` |
| `apps/driver-app` | `src/middleware.ts` | All except `/login`, `/register` | `/login` |

### Chef/Driver Status Gate

Chef-admin and driver-app have a secondary middleware check after session validation:

```typescript
// After session confirmed:
const profile = await getChefProfile(userId);
if (profile?.status !== 'approved') {
  return NextResponse.redirect('/pending-approval');
}
```

This prevents approved-auth-but-unapproved-profile access to protected dashboard routes.

---

## Role Checking in Code

### packages/auth getUserRoles()

`packages/auth/src/index.ts` exports a `getUserRoles()` function that queries all four role tables in sequence to determine a user's role(s).

**Problem**: This function is rarely called in actual API routes. Most routes use a different approach.

### getXActorContext() Pattern (Engine)

The engine package defines actor context constructors:

| Function | File | Checks |
|----------|------|--------|
| `getCustomerActorContext()` | `packages/engine/src/context/customer.ts` | customers table |
| `getChefActorContext()` | `packages/engine/src/context/chef.ts` | chef_profiles table |
| `getDriverActorContext()` | `packages/engine/src/context/driver.ts` | drivers table |
| `getOpsActorContext()` | `packages/engine/src/context/ops.ts` | platform_users table |

These functions validate the caller's identity against the appropriate table and return an actor context object. API routes that use the engine call these. API routes that do not use the engine implement ad-hoc checks or (historically) none at all.

### API Route Auth Coverage

| App | Routes with engine actor context | Routes with ad-hoc auth check | Routes with no auth check (post-fix) |
|-----|--------------------------------|------------------------------|--------------------------------------|
| `apps/web` | Most order/checkout routes | Cart routes | 0 (fixed) |
| `apps/chef-admin` | All menu/order routes | — | 0 (fixed) |
| `apps/ops-admin` | All engine routes | — | 0 (fixed in prior audit) |
| `apps/driver-app` | All delivery routes | — | 0 (fixed) |

Note: Prior audit identified `/api/chefs`, `/api/drivers`, `/api/customers` in ops-admin had zero auth. These were fixed. Residual risk remains for any newly added routes.

---

## Row Level Security

RLS is enabled on all 56 tables. Policy pattern by role:

| Table Group | Customer Policy | Chef Policy | Driver Policy | Ops Policy |
|-------------|----------------|-------------|---------------|------------|
| Chef tables | Read approved storefronts | Full own-row access | Read public chef data | Full access |
| Order tables | Own orders only | Own chef's orders | Assigned deliveries | Full access |
| Driver tables | None | None | Own row only | Full access |
| Platform tables | None | None | None | Full access |
| Engine tables | None | None | None | Full access |

Chef and driver RLS policies also gate on approval status at the database level, providing defense-in-depth beyond the middleware check.

---

## Security Concerns

### CONCERN 1: BYPASS_AUTH Enabled by Default in Development

**Severity**: HIGH
**File**: All 4 `middleware.ts` files
**Detail**: Any developer running `pnpm dev` has full unauthenticated access to all protected routes. This is intentional for development convenience but creates risk if:
- A developer accidentally deploys with `NODE_ENV=development`
- The `BYPASS_AUTH` env var is misconfigured in staging

**Recommendation**: Replace `NODE_ENV === 'development'` check with an explicit `BYPASS_AUTH=true` opt-in. Never bypass on env alone.

### CONCERN 2: No MFA for Ops Admin

**Severity**: HIGH
**Detail**: `platform_users` with `super_admin` or `finance_admin` roles have access to all financial and operational data. Supabase supports TOTP MFA but it is not enabled or enforced for any role.

**Recommendation**: Enforce MFA for `ops_admin`, `finance_admin`, and `super_admin` roles via Supabase MFA enrollment policy.

### CONCERN 3: No Rate Limiting on Auth Endpoints

**Severity**: MEDIUM
**Detail**: `/api/auth/login`, `/api/auth/register`, and password reset endpoints have no rate limiting middleware. Supabase Auth has internal rate limits but application-layer rate limiting is absent.

**Recommendation**: Add rate limiting middleware (e.g., Upstash Ratelimit) on auth routes.

### CONCERN 4: Stripe API Version Set to Future Date

**Severity**: MEDIUM
**File**: `packages/engine/src/integrations/stripe.ts` (or similar)
**Detail**: Stripe API version is configured as `2026-02-25.clover`. This is a beta/preview API version and may include breaking changes or features not yet stable.

**Recommendation**: Pin to a current stable Stripe API version (e.g., `2024-11-20.acacia`).

### CONCERN 5: support Role Has No UI Enforcement

**Severity**: LOW
**Detail**: `support` role is defined in the `platform_users.role` enum and RLS policies but has no distinct permission checks in ops-admin routes. A user with role `support` gets the same access as `ops_agent`.

**Recommendation**: Either implement support-specific route restrictions or remove the role from the enum to reduce confusion.

### CONCERN 6: No OAuth Despite Documentation Claims

**Severity**: LOW (user-facing)
**Detail**: Docs and possibly marketing materials reference Google/Apple sign-in. The feature does not exist.

**Recommendation**: Remove OAuth references from docs until implemented, or implement OAuth.

---

## Permissions Matrix

Full summary of what each role can access:

| Feature Area | Customer | Chef | Driver | ops_agent | ops_manager | finance_admin | super_admin |
|--------------|----------|------|--------|-----------|-------------|---------------|-------------|
| Browse storefronts | YES | YES | YES | YES | YES | YES | YES |
| Place orders | YES | NO | NO | NO | NO | NO | YES |
| Manage own profile | YES | YES | YES | NO | NO | NO | YES |
| View own orders | YES | YES (chef orders) | YES (assigned) | YES | YES | YES | YES |
| Manage menu items | NO | YES (own) | NO | NO | NO | NO | YES |
| Accept/reject orders | NO | YES (own) | NO | YES | YES | NO | YES |
| Manage deliveries | NO | NO | YES (assigned) | YES | YES | NO | YES |
| View all orders | NO | NO | NO | YES | YES | YES | YES |
| Approve chefs | NO | NO | NO | NO | YES | NO | YES |
| Approve drivers | NO | NO | NO | NO | YES | NO | YES |
| Process refunds | NO | NO | NO | YES | YES | YES | YES |
| View financial reports | NO | YES (own) | YES (own) | NO | NO | YES | YES |
| Platform settings | NO | NO | NO | NO | NO | NO | YES |
| Override engine decisions | NO | NO | NO | NO | YES | NO | YES |
