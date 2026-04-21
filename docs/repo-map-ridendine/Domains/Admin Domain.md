# Admin Domain

> Operations control plane — the most feature-rich app in the platform.

## Ownership

- **Primary App**: `apps/ops-admin` (port 3002)
- **DB Tables**: `platform_users`, `platform_settings`, `admin_notes`, `audit_logs`, `domain_events`, `ops_override_logs`, `system_alerts`, `order_exceptions`, `sla_timers`, `refund_cases`, `payout_adjustments`, `storefront_state_changes`, `support_tickets`
- **Repositories**: `ops.repository.ts`, `platform.repository.ts`, `support.repository.ts`, `finance.repository.ts`
- **Engine**: `OpsControlEngine`, `PlatformWorkflowEngine`, `SupportExceptionEngine`, `CommerceLedgerEngine`

## Role System

| Role | Access Level |
|------|-------------|
| `ops_agent` | Basic ops: view all, manage orders/deliveries/support |
| `ops_manager` | + Chef/driver governance, finance, settings |
| `finance_admin` | + Finance operations (refunds, payouts) |
| `super_admin` | Full access to everything |

## Dashboard Sections

### Command Center (`/dashboard`)
- Active orders, pending orders, ready orders
- Active deliveries, online/busy drivers
- Open exceptions, critical exceptions
- Pending refunds, paused storefronts, SLA breaches today
- Queue links: pending dispatch, escalated deliveries, orders needing action, support backlog, pending refunds, storefront risks

### Chef Governance (`/dashboard/chefs`)
- List all chefs with status
- Detail view with storefronts, revenue, orders
- Actions: approve, reject, suspend, unsuspend
- Storefront: publish, unpublish
- Pending approvals queue

### Customer Management (`/dashboard/customers`)
- List all customers
- Detail: account info, order snapshot, saved addresses, recent orders
- Read-only (no governance actions for customers)

### Dispatch Command Center (`/dashboard/deliveries`)
- Queue view: pending, active, escalated, stale
- Driver supply sidebar with coverage gaps
- Top candidates per delivery
- Delivery intervention console: manual assign, reassign, escalate, cancel, add notes

### Driver Governance (`/dashboard/drivers`)
- List all drivers with status
- Detail: profile, earnings, last known location, recent deliveries
- Actions: approve, reject, suspend, restore

### Order Management (`/dashboard/orders`)
- List with status filters
- Detail: order oversight, customer context, items, financial breakdown, exception review, audit timeline
- Actions: accept, reject, prepare, ready, cancel, complete, override

### Finance Operations (`/dashboard/finance`)
- **Role gate**: ops_manager, finance_admin, super_admin only
- Summary: captured revenue, pending refunds, pending adjustments, tax collected
- Chef/driver payable liabilities
- Refund queue: approve/deny
- Payout adjustment queue: release holds
- Ledger activity feed

### Support (`/dashboard/support`)
- Ticket queue with status filters
- Open exceptions sidebar with severity badges
- SLA status (at risk, breached)

### Platform Settings (`/dashboard/settings`)
- **Role gate**: ops_manager, super_admin only
- 9 numeric settings + 2 boolean toggles
- Controls dispatch, SLAs, fees, auto-pause behavior

### Live Map (`/dashboard/map`)
- Dynamic Leaflet import
- Real-time driver presence and delivery geography

### Analytics (`/dashboard/analytics`)
- Order metrics, financial overview, platform statistics
- Direct Supabase queries

## Engine API Routes

Ops-admin has the most extensive API surface with 25 endpoints, including a dedicated `/api/engine/` namespace for engine-mediated operations:

- `/api/engine/dashboard` — Dashboard stats + actions
- `/api/engine/dispatch` — Dispatch board + interventions
- `/api/engine/exceptions` — Exception queue + CRUD
- `/api/engine/finance` — Financial operations + actions
- `/api/engine/orders/[id]` — Order detail + actions
- `/api/engine/refunds` — Refund queue + actions
- `/api/engine/settings` — Platform rules CRUD
- `/api/engine/storefronts/[id]` — Storefront detail + actions

## Key Architectural Patterns

1. **Server components fetch data** → pass to client action components
2. **Modal-based interventions** for delivery and finance actions
3. **Role gating** via `hasRequiredRole()` on sensitive pages and APIs
4. **Audit trail** displayed on order and delivery detail pages
5. **Queue-based navigation** from dashboard to filtered views
6. **No direct DB mutations** — all through engine orchestrators
