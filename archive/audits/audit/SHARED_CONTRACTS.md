# Shared Contracts

**Date**: 2026-04-23
**Status**: Active — all contracts below are implemented and enforced as of Phase 2
**Verification**: TypeScript typecheck 12/12 pass (0 errors) | Engine tests 135/135 pass (7 test files)

---

## 1. API Response Format

Standardized in Phase 1, maintained and extended in Phase 2. All API routes in all four apps return one of three shapes.

### Success Response
```typescript
{
  success: true,
  data: T
}
```

### Error Response
```typescript
{
  success: false,
  error: {
    code: string,      // machine-readable (e.g. "NOT_FOUND", "UNAUTHORIZED")
    message: string,   // human-readable
    details?: object   // optional structured context
  }
}
```

### Paginated Success Response
```typescript
{
  success: true,
  data: {
    items: T[],
    total: number,
    page: number,
    limit: number,
    totalPages: number,
    hasMore: boolean
  }
}
```

### Source
Response helper functions: `successResponse<T>()`, `errorResponse()`, `paginatedResponse<T>()` in `@ridendine/utils`.

---

## 2. Pagination Contract

Applied to all ops-admin list endpoints as of Phase 2. Designed to be adopted by any future list endpoint across any app.

### Query Parameters
```
GET /api/orders?page=1&limit=20
```

Both parameters are optional. Defaults: `page=1`, `limit=20`. Maximum `limit` is 100.

### Schema
```typescript
// packages/validation/src/schemas/pagination.ts
import { z } from 'zod'

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type PaginationInput = z.infer<typeof paginationSchema>

export const cursorPaginationSchema = z.object({
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type CursorPaginationInput = z.infer<typeof cursorPaginationSchema>
```

Note: `z.coerce` is required because query parameters arrive as strings.

### Response Type
```typescript
// packages/utils/src/api.ts
export interface PaginatedData<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}
```

### Endpoints Using This Contract (Phase 2)
- `GET /api/orders` (ops-admin)
- `GET /api/chefs` (ops-admin)
- `GET /api/drivers` (ops-admin)
- `GET /api/customers` (ops-admin)

---

## 3. Validation Schema Structure

### File Location
All schemas in `packages/validation/src/schemas/`. Exported from `packages/validation/src/index.ts`.

### Domain Organization

| File | Domain |
|------|--------|
| `auth.ts` | Login, register, password reset, token refresh |
| `chef.ts` | Storefront create/update, menu item CRUD, availability |
| `customer.ts` | Profile update, address management, preferences |
| `driver.ts` | Availability toggle, location update, delivery action |
| `order.ts` | Create order, order actions, review submission |
| `ops.ts` | Admin actions, refund, override, user management |
| `notifications.ts` | Create notification, update, subscribe |
| `pagination.ts` | Page-based and cursor-based pagination |
| `common.ts` | UUID, phone, email, address sub-schemas |

### Naming Conventions
- Action schemas: `{action}{Domain}Schema` — e.g., `createMenuItemSchema`, `updateChefProfileSchema`
- Route-specific variants: `route{Action}{Domain}Schema` — e.g., `routeCreateMenuItemSchema`
- All schemas export an inferred type: `type FooInput = z.infer<typeof fooSchema>`

### Usage Pattern
```typescript
// In a route handler
import { createMenuItemSchema } from '@ridendine/validation'

const body = await request.json()
const parsed = createMenuItemSchema.safeParse(body)
if (!parsed.success) {
  return errorResponse('VALIDATION_ERROR', parsed.error.flatten())
}
```

---

## 4. Role Definitions

Single source of truth: `packages/types/src/roles.ts`. Imported by auth, engine, and all middleware configs.

### AppRole Enum
```typescript
export enum AppRole {
  Customer    = 'customer',
  Chef        = 'chef',
  Driver      = 'driver',
  OpsAdmin    = 'ops_admin',
  OpsAgent    = 'ops_agent',
  OpsManager  = 'ops_manager',
  FinanceAdmin = 'finance_admin',
  SuperAdmin  = 'super_admin',
  Support     = 'support',
}
```

### Role Group Constants
```typescript
export const PLATFORM_ROLES: AppRole[] = [
  AppRole.OpsAdmin,
  AppRole.OpsAgent,
  AppRole.OpsManager,
  AppRole.FinanceAdmin,
  AppRole.SuperAdmin,
  AppRole.Support,
]

export const FINANCE_ROLES: AppRole[] = [
  AppRole.OpsManager,
  AppRole.FinanceAdmin,
  AppRole.SuperAdmin,
]

export const GOVERNANCE_ROLES: AppRole[] = [
  AppRole.OpsManager,
  AppRole.SuperAdmin,
]
```

### Helper Functions
```typescript
export function isPlatformRole(role: AppRole): boolean
export function isFinanceRole(role: AppRole): boolean
export function isGovernanceRole(role: AppRole): boolean
```

---

## 5. Middleware Contract

All four apps use `createAuthMiddleware` from `@ridendine/auth/middleware`.

### Factory Signature
```typescript
createAuthMiddleware(config: AuthMiddlewareConfig): NextMiddleware

interface AuthMiddlewareConfig {
  // Routes accessible without authentication
  publicRoutes: string[]

  // Where to redirect unauthenticated users
  loginRoute: string

  // Where to redirect already-authenticated users who visit auth pages
  authenticatedRedirect?: string

  // Routes that are auth pages (login, register) — redirect if already authed
  authRoutes?: string[]

  // Selective protection mode (used by web app):
  // only these routes require auth; all others are public
  protectedRoutes?: string[]
}
```

### App Configurations

**web** (customer app): Uses `protectedRoutes` mode. Only `/orders`, `/profile`, `/checkout`, `/addresses` require auth. All browse/search pages are public.

**chef-admin**: Uses `publicRoutes` mode. Only `/auth/login` and `/auth/register` are public. All dashboard routes require chef role.

**ops-admin**: Uses `publicRoutes` mode. Only `/auth/login` is public. All routes require a platform role.

**driver-app**: Uses `publicRoutes` mode. Only `/auth/login` is public. All routes require driver role.

---

## 6. Engine Access Contract

All engine access in route handlers goes through `@ridendine/engine/server`. Direct engine instantiation in app code is prohibited.

### Primary Exports
```typescript
// Singleton engine instance
import { getEngine } from '@ridendine/engine/server'

// Actor context helpers (extract actor from Next.js request)
import {
  getCustomerActorContext,
  getChefActorContext,
  getDriverActorContext,
  getOpsActorContext,
} from '@ridendine/engine/server'

// Ownership verifiers (throw if actor does not own resource)
import {
  verifyChefOwnsOrder,
  verifyChefOwnsMenuItem,
  verifyDriverOwnsDelivery,
} from '@ridendine/engine/server'
```

### Usage Pattern in Route Handlers
```typescript
import { getChefActorContext, verifyChefOwnsOrder } from '@ridendine/engine/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const actor = await getChefActorContext(req)
  if (!actor) return errorResponse('UNAUTHORIZED', 'Authentication required')

  await verifyChefOwnsOrder(actor, params.id)

  const engine = getEngine()
  const result = await engine.orders.acceptOrder(params.id, actor)
  return successResponse(result)
}
```

---

## 7. Layout Contract

Defined in `packages/types/src/layout.ts`. Not yet consumed by components — establishes the interface for Phase 3 shared layout work.

```typescript
interface LayoutConfig {
  appId: string
  appName: string
  hasSidebar: boolean
  hasHeader: boolean
  navigation: NavSection[]
  requiredRole?: AppRole | AppRole[]
  themeColor?: string
}

interface NavSection {
  label?: string
  items: NavItem[]
}

interface NavItem {
  label: string
  href: string
  icon?: string
  children?: NavItem[]
  badge?: string | number
  requiredRoles?: AppRole[]
}

interface PageMeta {
  title: string
  description?: string
  breadcrumbs?: BreadcrumbItem[]
}

interface BreadcrumbItem {
  label: string
  href?: string
}
```

---

## 8. Notification Contract

Internal notifications only as of Phase 2. External delivery (email/SMS) is not yet wired.

### Engine Notification Triggers

| Event | Notification Fired | Recipient |
|-------|--------------------|-----------|
| Order accepted by chef | `ORDER_ACCEPTED` | Customer |
| Order completed | `ORDER_COMPLETED` | Customer |

### Schema
```typescript
// packages/validation/src/schemas/notifications.ts
export const createNotificationSchema = z.object({
  userId: z.string().uuid(),
  type: z.string(),
  title: z.string().max(200),
  body: z.string().max(1000),
  data: z.record(z.unknown()).optional(),
})

export const updateNotificationSchema = z.object({
  read: z.boolean(),
})

export const subscribeSchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string(),
    auth: z.string(),
  }),
})
```

### Templates
Notification body text is generated by `@ridendine/notifications` template functions. The `NotificationSender` class in `packages/engine/src/core/notification-sender.ts` calls templates and writes results to the `notifications` table via `@ridendine/db`.
