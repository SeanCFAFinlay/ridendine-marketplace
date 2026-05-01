# Phase 4 — Auth, RBAC, service-role audit

## 1. Service role exposure to client

| Check | Result | Evidence |
|-------|--------|----------|
| `NEXT_PUBLIC_*` contains `SERVICE_ROLE` / `SECRET` | **NOT FOUND** in grep of env naming patterns | `.env.example` naming only in baseline; CI uses placeholders |
| `createAdminClient` imported in `"use client"` bundles | **NOT FOUND** in targeted grep — clients use route handlers / server components | Standard Next split |

**Verdict:** **VERIFIED** — no obvious client bundle service-role pattern (static audit; runtime bundle inspect not run).

## 2. Ops / platform API enforcement

| Mechanism | Location | Status |
|-----------|----------|--------|
| `guardPlatformApi` + capability constants | `packages/engine/src/services/platform-api-guards.ts` | **VERIFIED** — typed role sets (OPS_READ, FINANCE_EXPORT, etc.) |
| Tests deny wrong roles | `platform-api-guards.test.ts` | **VERIFIED** — 13 tests |

## 3. Web customer middleware

| Area | File | Notes |
|------|------|--------|
| Protected routes incl. checkout | `apps/web/src/middleware.ts` | IRR-002 Option A — must stay aligned with `AUTH_ROLE_MATRIX.md` |

## 4. BYPASS_AUTH production guard

| Area | File | Status |
|------|------|--------|
| Throws in production | `packages/auth/src/middleware.ts` | **VERIFIED** — `middleware.test.ts` (9 tests) |

## 5. Webhook privileged access

| Order | Behavior |
|-------|----------|
| 1 | Read raw body |
| 2 | `constructEvent` — **signature first** |
| 3 | `createAdminClient` + claim idempotency | `apps/web/src/app/api/webhooks/stripe/route.ts` |

**Verdict:** **VERIFIED** — no DB mutation before signature success path.

## 6. Chef / driver isolation

| App | Pattern | Risk |
|-----|---------|------|
| chef-admin | `getChefActorContext` / admin client in routes | **PARTIAL** — requires per-route confirmation chef_id from actor, not URL alone |
| driver-app | `getDriverActorContext`, delivery ownership gates | **VERIFIED** at high level per Phase 8 tracker + engine `dispatch-engine-driver-guards.test.ts` |

## 7. Middleware vs API enforcement

- **UI hiding is insufficient** — APIs must re-check. Checkout and web customer APIs use `getCustomerActorContext` / engine — **good**.
- Ops pages still need **API** guards — pattern is centralized in engine guards — **good**.

## 8. Outstanding (IRR-003)

**Confirmed gap:** Comprehensive audit of **every** `apps/web/src/app/api/**` handler using `createAdminClient` for tenant scoping + automated cross-tenant tests — **not complete**.
