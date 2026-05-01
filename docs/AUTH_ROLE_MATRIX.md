# Auth and role matrix (Phase 2)

This document is the **canonical reference** for who may access which surfaces. Server routes are the source of enforcement (`guardPlatformApi` in `@ridendine/engine/server`); UI route visibility is never sufficient alone.

## Roles

| Role | Origin | Notes |
|------|--------|--------|
| `customer` | `customers` row | Marketplace buyer |
| `chef` | `chef_profiles` (approved) | Vendor |
| `driver` | `drivers` (approved) | Delivery |
| `ops_admin` | `platform_users.role` | Operations admin |
| `ops_agent` | `platform_users.role` | Front-line ops |
| `ops_manager` | `platform_users.role` | Escalated ops |
| `finance_admin` | `platform_users.role` | Finance (legacy name) |
| `finance_manager` | `platform_users.role` | Finance |
| `super_admin` | `platform_users.role` | Full platform control |
| `support` / `support_agent` | DB `support` or `support_agent` | Normalized to `support_agent` in actor context |

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

## Ops-admin API capabilities

Capabilities are checked with `guardPlatformApi(actor, capability)` (see `packages/engine/src/services/platform-api-guards.ts`).

| Capability | Allowed `ActorRole` values (summary) |
|------------|--------------------------------------|
| `platform_settings` | `super_admin` only |
| `finance_refunds_read` | `finance_admin`, `finance_manager`, `super_admin` |
| `finance_refunds_request` | Ops line + finance roles + `super_admin` |
| `finance_refunds_sensitive` | `finance_admin`, `finance_manager`, `super_admin` |
| `finance_payouts` | Same as finance refunds sensitive |
| `finance_engine` | Finance roles + `super_admin` |
| `finance_export_ledger` | Finance roles + `super_admin` |
| `ops_export_operational` | Ops line (`ops_agent`, `ops_admin`, `ops_manager`, `super_admin`) |
| `ops_orders_read` / `ops_orders_write` | Ops line |
| `ops_entity_read` | Ops line (directory lists: chefs, drivers, customers) |
| `order_override` | `ops_admin`, `ops_manager`, `super_admin` |
| `audit_timeline_read` | `super_admin` only (order audit trail omitted for others) |
| `dispatch_read` / `dispatch_write` | Ops line |
| `exceptions_read` / `exceptions_write` | Ops line |
| `dashboard_read` | Ops line + finance roles |
| `dashboard_actions` | Ops line |
| `analytics_read` | Ops line + finance roles |
| `support_queue` | `support_agent` + ops line (`ops_agent`, `ops_admin`, `ops_manager`, `super_admin`) — **not** `finance_admin` / `finance_manager` (Phase 12 guard + `platform-wiring` test). |
| `announcements` | `ops_admin`, `ops_manager`, `super_admin` |
| `promos` | `ops_admin`, `ops_manager`, finance roles, `super_admin` |
| `team_list` | `ops_admin`, `ops_manager`, `super_admin` |
| `team_manage` | `super_admin` only |
| `customers_read` | Ops line |
| `customers_write` | `ops_admin`, `ops_manager`, `super_admin` |
| `chefs_governance` / `drivers_governance` | `ops_admin`, `ops_manager`, `super_admin` |
| `deliveries_read` / `deliveries_write` | Ops line |
| `engine_rules` / `engine_maintenance` | `ops_admin`, `ops_manager`, `super_admin` |
| `storefront_ops` | `ops_admin`, `ops_manager`, `super_admin` |
| `engine_health` | Ops line + finance + `support_agent` |

## Processor / cron routes

`POST` handlers under `apps/ops-admin/src/app/api/engine/processors/**` require **`CRON_SECRET` (Bearer)** or **`ENGINE_PROCESSOR_TOKEN` (`x-processor-token`)** — not end-user session. They are excluded from normal session middleware where configured; token validation is fail-closed when secrets are unset.

## `BYPASS_AUTH` (IRR-030)

Defined in `packages/auth/src/middleware.ts`:

- If `BYPASS_AUTH === 'true'` and `NODE_ENV === 'production'`, middleware **throws** at startup (fail closed).
- In non-production, bypass skips Supabase session checks (local/dev only).

Covered by `packages/auth/src/middleware.test.ts`.

## Database roles

`platform_users.role` CHECK constraint is extended in migration `00015_phase2_platform_roles.sql` to allow `support_agent` and `finance_manager` alongside existing values.

## Change control

Updates to this matrix should accompany updates to `platform-api-guards.ts` and ops route handlers.

**Next phase:** Phase 3 (database foundation) only — out of scope here.
