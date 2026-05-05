# Ops-Admin Status Matrix

Updated: 2026-04-04

This matrix reflects the actual repo state after the ops-admin control-plane implementation pass. Authority paths now center on `packages/engine`, `packages/db`, persisted `platform_settings`, and queue-first delivery/finance/support views.

## Route Inventory

| Route | Purpose | Authority Source | Data Source | Maturity | Action Capability | Test Coverage |
| --- | --- | --- | --- | --- | --- | --- |
| `/dashboard` | Marketplace control center | `engine.ops.getDashboard()` | `get_ops_dashboard_stats` RPC + support/delivery/driver read models | authoritative | queue routing only | engine validation + typecheck |
| `/dashboard/deliveries` | Dispatch command center | `engine.ops.getDispatchCommandCenter()` | delivery, assignment, exception, driver supply read models | authoritative | queue filters and manual intervention entry point | dispatch scoring tests |
| `/dashboard/deliveries/[id]` | Delivery intervention console | `engine.ops.getDeliveryInterventionDetail()` + `engine.dispatch` + `engine.support` | delivery detail read model, assignment attempts, events, notes, tracking | authoritative | assign, reassign, retry, escalate, acknowledge, cancel, note | dispatch scoring tests + typecheck |
| `/dashboard/finance` | Finance review workstation | `engine.ops.getFinanceOperations()` + `engine.commerce` | ledger, refunds, payout adjustments, liabilities | authoritative | approve/deny refund, release hold | finance summary tests |
| `/dashboard/settings` | Persisted platform rules | `engine.ops.getPlatformRules()` / `updatePlatformRules()` | `platform_settings` | authoritative | persisted rule updates with audit log | platform settings validation tests |
| `/dashboard/support` | Support backlog + exception watch | `db.getOpsSupportQueue()` + `engine.support` | support tickets + exception queue + SLA read model | partial | queue filters only | typecheck |
| `/dashboard/orders` | Order queue and oversight | mixed app + engine | order repository + engine order workflows | partial | existing order controls | existing repo only |
| `/dashboard/orders/[id]` | Order detail and intervention | mixed app + engine | order detail repository + engine workflows | partial | existing order controls | existing repo only |
| `/dashboard/chefs` | Chef/storefront governance | `engine.platform` + repo reads | chef/storefront repository | partial | approve, suspend, publish, pause | existing repo only |
| `/dashboard/chefs/approvals` | Chef approvals | `engine.platform` | chef approval repository | partial | approve/reject | existing repo only |
| `/dashboard/chefs/[id]` | Chef governance detail | `engine.platform` | chef detail repository | partial | chef and storefront interventions | existing repo only |
| `/dashboard/drivers` | Driver governance | `engine.platform` + repo reads | driver repository | partial | approve/suspend/reactivate | existing repo only |
| `/dashboard/drivers/[id]` | Driver detail | mixed app + engine | driver detail repository | partial | governance actions | existing repo only |
| `/dashboard/customers` | Customer oversight | repo reads | customer repository | partial | read-first | existing repo only |
| `/dashboard/customers/[id]` | Customer detail | repo reads | customer detail repository | honest but incomplete | no direct credits/messaging | existing repo only |
| `/dashboard/map` | Geographic visibility | mixed app reads | delivery + driver map queries | partial | read-only | existing repo only |
| `/dashboard/analytics` | Reporting surface | ad hoc page queries | analytics reads | partial | read-only | existing repo only |

## Control-Plane Changes

- Dashboard metrics now come from a single engine-backed read model instead of ad hoc page calculations.
- Dispatch now has a queue-first board backed by shared delivery, assignment, exception, and driver-supply read models.
- Delivery detail is now an intervention console with engine-backed actions only.
- Platform rules are persisted in `platform_settings` and govern dispatch/finance thresholds.
- Finance now exposes review actions without pretending payout rails are implemented.
- Audit logging now stores actor role, reason, and metadata for ops actions.

## Known Deferred Areas

- Order, chef, driver, customer, map, and analytics pages still need the same normalization pattern used for dispatch, finance, settings, and dashboard.
- Support queue is improved and linked to SLA/exception state, but it is not yet a fully unified support-plus-exception command surface.
- Coverage gaps are area-based heuristics from current address/location data, not route optimization.
- Payout execution remains intentionally out of scope until real payout rails are implemented.
