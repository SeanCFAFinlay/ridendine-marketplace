---
id: CMP-042
name: AuthMiddleware
layer: Adapter
subsystem: Auth
path: packages/auth/src/middleware.ts
language: TypeScript
loc: 126
---

# [[CMP-042]] AuthMiddleware

## Responsibility
Next.js middleware that validates session cookies and redirects unauthenticated requests to the login page.

## Public API
- `authMiddleware(request: NextRequest) -> NextResponse` — middleware handler for auth enforcement
- `withAuth(config) -> NextMiddleware` — middleware factory with route configuration

## Depends on (outbound)
- [[CMP-022]] ServerClient — reads session from cookies

## Depended on by (inbound)
- apps/web/src/middleware.ts — web app route protection
- apps/chef-admin/src/middleware.ts — chef admin route protection
- apps/ops-admin/src/middleware.ts — ops admin route protection
- apps/driver-app/src/middleware.ts — driver app route protection

## Reads config
- `BYPASS_AUTH` — development bypass flag; security risk if enabled in production — see [[FND-019]]

## Side effects
- Redirects unauthenticated requests
- Refreshes session token in cookie

## Tests
- ❓ UNKNOWN

## Smells / notes
- `BYPASS_AUTH` env var is a security risk — see [[FND-019]]
- RLS role mismatch may affect middleware role checks — see [[FND-020]]

## Source
`packages/auth/src/middleware.ts` (lines 1–126)
