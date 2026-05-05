# Auth Role Matrix (Phase 5 — Centralized RBAC)

Phase 5 centralizes all platform role-based access control into `packages/engine/src/services/platform-api-guards.ts`. Server routes are the canonical enforcement layer (`guardPlatformApi` in `@ridendine/engine/server`); UI route visibility is never sufficient alone. All 24 capabilities are defined in `packages/types/src/capabilities.ts` and the `CAPABILITY_ROLES` map in the guards module is the single source of truth.

## Roles

| Role | Origin | Notes |
|------|--------|--------|
| `customer` | `customers` row | Marketplace buyer |
| `chef_user` | `chef_profiles` (approved) | Vendor |
| `driver` | `drivers` (approved) | Delivery |
| `ops_admin` | `platform_users.role` | Operations admin |
| `ops_agent` | `platform_users.role` | Front-line ops |
| `ops_manager` | `platform_users.role` | Escalated ops |
| `finance_admin` | `platform_users.role` | Finance (legacy name, normalized) |
| `finance_manager` | `platform_users.role` | Finance |
| `super_admin` | `platform_users.role` | Full platform control |
| `support_agent` | DB `support` or `support_agent` | Normalized to `support_agent` in actor context |

Engine `ActorContext.role` maps DB `platform_users.role` via `getOpsActorContext()` (inactive users are rejected).

## Apps

| App | Customer | Chef | Driver | Platform roles |
|-----|----------|------|--------|------------------|
| `apps/web` | Yes | — | — | No |
| `apps/chef-admin` | — | Yes | — | No |
| `apps/driver-app` | — | — | Yes | No |
| `apps/ops-admin` | No | No | No | Yes (must have active `platform_users` row) |

## HTTP semantics

| Situation | Status |
|-----------|--------|
| No session / unknown user | **401** `UNAUTHORIZED` |
| Session OK but role not allowed for capability | **403** `FORBIDDEN` |

## Checkout policy (IRR-002)

**OPTION A — enforced**

- `/checkout` is protected by `apps/web/src/middleware.ts` (session required before checkout UI).
- `POST /api/checkout` requires `getCustomerActorContext()`; unauthenticated callers receive **401**.

Guest checkout is **not** supported in this configuration.

## Capability × Role matrix

`✓` = allowed. Blank = denied.

| Capability | super_admin | ops_admin | ops_manager | ops_agent | finance_admin | finance_manager | support_agent | customer | chef_user | driver |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `platform_settings` | ✓ | | | | | | | | | |
| `finance_refunds_read` | ✓ | | | | ✓ | ✓ | | | | |
| `finance_refunds_sensitive` | ✓ | | | | ✓ | ✓ | | | | |
| `finance_refunds_request` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| `finance_payouts` | ✓ | | | | ✓ | ✓ | | | | |
| `finance_engine` | ✓ | | | | ✓ | ✓ | | | | |
| `finance_export_ledger` | ✓ | | | | ✓ | ✓ | | | | |
| `ops_export_operational` | ✓ | ✓ | ✓ | ✓ | | | ✓ | | | |
| `ops_orders_read` | ✓ | ✓ | ✓ | ✓ | | | ✓ | | | |
| `ops_orders_write` | ✓ | ✓ | ✓ | ✓ | | | | | | |
| `ops_entity_read` | ✓ | ✓ | ✓ | ✓ | | | ✓ | | | |
| `order_override` | ✓ | ✓ | ✓ | | | | | | | |
| `audit_timeline_read` | ✓ | ✓ | ✓ | | | | | | | |
| `dispatch_read` | ✓ | ✓ | ✓ | ✓ | | | | | | |
| `dispatch_write` | ✓ | ✓ | ✓ | ✓ | | | | | | |
| `exceptions_read` | ✓ | ✓ | ✓ | ✓ | | | ✓ | | | |
| `exceptions_write` | ✓ | ✓ | ✓ | ✓ | | | | | | |
| `dashboard_read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| `dashboard_actions` | ✓ | ✓ | ✓ | ✓ | | | | | | |
| `analytics_read` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | | |
| `support_queue` | ✓ | ✓ | ✓ | ✓ | | | ✓ | | | |
| `announcements` | ✓ | ✓ | ✓ | | | | | | | |
| `promos` | ✓ | ✓ | ✓ | | ✓ | ✓ | | | | |
| `team_list` | ✓ | ✓ | ✓ | | | | | | | |
| `team_manage` | ✓ | | | | | | | | | |
| `customers_read` | ✓ | ✓ | ✓ | ✓ | | | ✓ | | | |
| `customers_write` | ✓ | ✓ | ✓ | | | | | | | |
| `chefs_governance` | ✓ | ✓ | ✓ | | | | | | | |
| `drivers_governance` | ✓ | ✓ | ✓ | | | | | | | |
| `deliveries_read` | ✓ | ✓ | ✓ | ✓ | | | ✓ | | | |
| `deliveries_write` | ✓ | ✓ | ✓ | ✓ | | | | | | |
| `engine_rules` | ✓ | ✓ | ✓ | | | | | | | |
| `engine_maintenance` | ✓ | ✓ | ✓ | | | | | | | |
| `storefront_ops` | ✓ | ✓ | ✓ | | | | | | | |
| `engine_health` | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | | | |

## Role-set groupings

These named sets appear in `platform-api-guards.ts` and document which roles share access patterns.

| Set name | Roles included |
|---|---|
| `SUPER` | `super_admin` |
| `FINANCE` | `finance_admin`, `finance_manager`, `super_admin` |
| `OPS_LINE` | `ops_agent`, `ops_admin`, `ops_manager`, `super_admin` |
| `OPS_GOVERNANCE` | `ops_admin`, `ops_manager`, `super_admin` |
| `OPS_READ` | `OPS_LINE` + `support_agent` |
| `DISPATCH_OPS` | Same as `OPS_LINE` |
| `ANALYTICS_READ` | `ops_agent`, `ops_admin`, `ops_manager`, `finance_admin`, `finance_manager`, `super_admin` |
| `SUPPORT_QUEUE` | `support_agent`, `ops_agent`, `ops_admin`, `ops_manager`, `super_admin` |
| `OPS_COMMS` | Same as `OPS_GOVERNANCE` |
| `PROMO_ROLES` | `ops_admin`, `ops_manager`, `finance_admin`, `finance_manager`, `super_admin` |
| `OPS_AND_FINANCE` | `OPS_LINE` + `finance_admin`, `finance_manager` |

## How to add a new capability

1. **Add the string literal** to the `PlatformCapability` union in `packages/types/src/capabilities.ts`.
2. **Add a row** in the `CAPABILITY_ROLES` map in `packages/engine/src/services/platform-api-guards.ts`, assigning one of the named role-sets (or a custom set).
3. **Add test cases** in `packages/engine/src/services/platform-api-guards.test.ts` covering at least one allowed role and one denied role for the new capability.

## Processor / cron routes

`POST` handlers under `apps/ops-admin/src/app/api/engine/processors/**` and `apps/ops-admin/src/app/api/cron/**` require **`CRON_SECRET` (Bearer)** or **`ENGINE_PROCESSOR_TOKEN` (`x-processor-token`)** — not end-user session. They are excluded from normal session middleware where configured; token validation is fail-closed when secrets are unset.

## `ALLOW_DEV_AUTOLOGIN` (Phase 5)

Defined in `packages/auth/src/middleware.ts`:

- If `ALLOW_DEV_AUTOLOGIN === 'true'` **and** `NODE_ENV !== 'production'`, middleware returns `next()` immediately (session check skipped for local dev convenience).
- In production, `NODE_ENV === 'production'` ensures the env value is never honored regardless of what is set.

> **Note:** `BYPASS_AUTH` was removed in Phase 5 and replaced by `ALLOW_DEV_AUTOLOGIN`. Any references to `BYPASS_AUTH` in code are a bug. The regression test in `packages/auth/src/middleware.test.ts` asserts the string is absent from middleware source.

## Database roles

`platform_users.role` CHECK constraint is extended in migration `00015_phase2_platform_roles.sql` to allow `support_agent` and `finance_manager` alongside existing values.

## Change control

Updates to this matrix must accompany updates to `packages/types/src/capabilities.ts`, `platform-api-guards.ts`, and the corresponding ops route handlers. Run `pnpm audit:guards` after any route changes to verify no state-changing route is left unguarded.
