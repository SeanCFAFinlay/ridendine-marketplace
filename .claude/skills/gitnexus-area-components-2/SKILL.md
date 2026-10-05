---
name: gitnexus-area-components-2
description: "Skill for the _components area of ridendine-marketplace. 41 symbols across 22 files."
---

# _components

41 symbols | 22 files | Cohesion: 63%

## When to Use

- Working with code in `apps/`
- Understanding how PayoutsPage, ChefsColumn, DriversColumn work
- Modifying _components-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/ops-admin/src/app/dashboard/_components/orders-column.tsx` | OrdersColumn, etaLabel, formatAge, bucketForOrder, isTodayTs (+1) |
| `apps/ops-admin/src/app/dashboard/_components/drivers-column.tsx` | DriversColumn, pingLabel, readinessClass |
| `apps/ops-admin/src/app/dashboard/deliveries/page.tsx` | DeliveriesPage, getQueueName, getSearchParam |
| `apps/ops-admin/src/components/dashboard/alerts-panel.tsx` | AlertsPanel, getAlertStyles, getBadgeVariant |
| `packages/ui/src/components/badge.tsx` | Badge, DeliveryStatusBadge, OrderStatusBadge |
| `apps/ops-admin/src/app/dashboard/page.tsx` | DashboardPage, getEngineStatus, getPressureTone |
| `apps/ops-admin/src/app/dashboard/automation/page.tsx` | AutomationPage, toggleRule |
| `apps/ops-admin/src/app/dashboard/settings/maintenance-toggle.tsx` | MaintenanceToggle, toggle |
| `apps/ops-admin/src/app/dashboard/_components/ops-readiness.tsx` | OpsReadiness, ReadinessContent |
| `apps/ops-admin/src/lib/ops-sla.ts` | computeOrderSlaFlags, minutesSince |

## Entry Points

Start here when exploring this area:

- **`PayoutsPage`** (Function) — `apps/chef-admin/src/app/dashboard/payouts/page.tsx:23`
- **`ChefsColumn`** (Function) — `apps/ops-admin/src/app/dashboard/_components/chefs-column.tsx:5`
- **`DriversColumn`** (Function) — `apps/ops-admin/src/app/dashboard/_components/drivers-column.tsx:24`
- **`LiveBoard`** (Function) — `apps/ops-admin/src/app/dashboard/_components/live-board.tsx:19`
- **`OrdersColumn`** (Function) — `apps/ops-admin/src/app/dashboard/_components/orders-column.tsx:55`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `PayoutsPage` | Function | `apps/chef-admin/src/app/dashboard/payouts/page.tsx` | 23 |
| `ChefsColumn` | Function | `apps/ops-admin/src/app/dashboard/_components/chefs-column.tsx` | 5 |
| `DriversColumn` | Function | `apps/ops-admin/src/app/dashboard/_components/drivers-column.tsx` | 24 |
| `LiveBoard` | Function | `apps/ops-admin/src/app/dashboard/_components/live-board.tsx` | 19 |
| `OrdersColumn` | Function | `apps/ops-admin/src/app/dashboard/_components/orders-column.tsx` | 55 |
| `ActivityPage` | Function | `apps/ops-admin/src/app/dashboard/activity/page.tsx` | 13 |
| `AutomationPage` | Function | `apps/ops-admin/src/app/dashboard/automation/page.tsx` | 31 |
| `toggleRule` | Function | `apps/ops-admin/src/app/dashboard/automation/page.tsx` | 44 |
| `DeliveriesPage` | Function | `apps/ops-admin/src/app/dashboard/deliveries/page.tsx` | 26 |
| `IntegrationsPage` | Function | `apps/ops-admin/src/app/dashboard/integrations/page.tsx` | 5 |
| `MaintenanceToggle` | Function | `apps/ops-admin/src/app/dashboard/settings/maintenance-toggle.tsx` | 12 |
| `toggle` | Function | `apps/ops-admin/src/app/dashboard/settings/maintenance-toggle.tsx` | 28 |
| `SettingsPage` | Function | `apps/ops-admin/src/app/dashboard/settings/page.tsx` | 8 |
| `AlertsPanel` | Function | `apps/ops-admin/src/components/dashboard/alerts-panel.tsx` | 26 |
| `getAlertStyles` | Function | `apps/ops-admin/src/components/dashboard/alerts-panel.tsx` | 145 |
| `getBadgeVariant` | Function | `apps/ops-admin/src/components/dashboard/alerts-panel.tsx` | 156 |
| `CustomerMarketplaceHero` | Function | `apps/web/src/components/home/customer-marketplace-hero.tsx` | 12 |
| `StorefrontTrustPanel` | Function | `apps/web/src/components/storefront/storefront-trust-panel.tsx` | 21 |
| `Badge` | Function | `packages/ui/src/components/badge.tsx` | 52 |
| `DeliveryStatusBadge` | Function | `packages/ui/src/components/badge.tsx` | 127 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DashboardPage → FromMock` | cross_community | 4 |
| `DashboardPage → FromMock` | cross_community | 4 |
| `DashboardPage → From` | cross_community | 4 |
| `DashboardPage → From` | cross_community | 4 |
| `DashboardPage → CreateServerClient` | cross_community | 3 |
| `InventoryPage → Cn` | cross_community | 3 |
| `LabourPage → Cn` | cross_community | 3 |
| `SuppliersPage → Cn` | cross_community | 3 |
| `DeliveryDetailPage → Cn` | cross_community | 3 |
| `PromosPage → Cn` | cross_community | 3 |

## How to Explore

1. `context({name: "PayoutsPage"})` — see callers and callees
2. `query({search_query: "_components"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
