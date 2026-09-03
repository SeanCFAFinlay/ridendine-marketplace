---
name: gitnexus-area-components
description: "Skill for the Components area of ridendine-marketplace. 174 symbols across 25 files."
---

# Components

174 symbols | 25 files | Cohesion: 78%

## When to Use

- Working with code in `apps/`
- Understanding how KpiCard, Card, CardContent work
- Modifying components-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/driver-app/src/app/delivery/[id]/components/DeliveryDetail.tsx` | DeliveryDetail, advanceStatus, getNextAction, getStatusSteps, handleAction (+18) |
| `apps/driver-app/src/app/components/DriverDashboard.tsx` | CommandMetric, DriverDashboard, formatDeliveryStatus, formatDistance, formatExpiry (+17) |
| `packages/ui/src/components/platform.tsx` | ActionButton, AppShell, MetricCard, MoneyCard, OrderCard (+10) |
| `apps/driver-app/src/app/earnings/components/EarningsView.tsx` | EarningsView, formatMoney, requestInstant, FinanceMetric, centsToMajor (+8) |
| `apps/driver-app/src/app/history/components/HistoryView.tsx` | HistoryView, SummaryCard, formatDistance, formatMoney, formatStatus (+6) |
| `apps/driver-app/src/components/offer-alert.tsx` | CountdownBadge, OfferAlert, updateCountdown, respond, OfferStats (+6) |
| `apps/driver-app/src/app/profile/components/ProfileView.tsx` | FieldRow, ProfileView, handleSave, handleSetupPayouts, SummaryCard (+4) |
| `apps/ops-admin/src/components/global-search.tsx` | GlobalSearch, handleInput, search, searchChefs, searchCustomers (+2) |
| `packages/ui/src/components/card.tsx` | Card, CardContent, CardDescription, CardFooter, CardHeader (+1) |
| `apps/ops-admin/src/app/dashboard/analytics/components/event-metrics.tsx` | EventMetrics, fetchMetrics, MetricRow, PeriodToggle, buildMetrics (+1) |

## Entry Points

Start here when exploring this area:

- **`KpiCard`** (Function) — `apps/ops-admin/src/app/dashboard/analytics/components/kpi-card.tsx:44`
- **`Card`** (Function) — `packages/ui/src/components/card.tsx:19`
- **`CardContent`** (Function) — `packages/ui/src/components/card.tsx:70`
- **`CardDescription`** (Function) — `packages/ui/src/components/card.tsx:62`
- **`CardFooter`** (Function) — `packages/ui/src/components/card.tsx:78`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `KpiCard` | Function | `apps/ops-admin/src/app/dashboard/analytics/components/kpi-card.tsx` | 44 |
| `Card` | Function | `packages/ui/src/components/card.tsx` | 19 |
| `CardContent` | Function | `packages/ui/src/components/card.tsx` | 70 |
| `CardDescription` | Function | `packages/ui/src/components/card.tsx` | 62 |
| `CardFooter` | Function | `packages/ui/src/components/card.tsx` | 78 |
| `CardHeader` | Function | `packages/ui/src/components/card.tsx` | 42 |
| `CardTitle` | Function | `packages/ui/src/components/card.tsx` | 50 |
| `ActionButton` | Function | `packages/ui/src/components/platform.tsx` | 135 |
| `AppShell` | Function | `packages/ui/src/components/platform.tsx` | 30 |
| `MetricCard` | Function | `packages/ui/src/components/platform.tsx` | 179 |
| `MoneyCard` | Function | `packages/ui/src/components/platform.tsx` | 191 |
| `OrderCard` | Function | `packages/ui/src/components/platform.tsx` | 258 |
| `PayoutCard` | Function | `packages/ui/src/components/platform.tsx` | 195 |
| `SidebarNav` | Function | `packages/ui/src/components/platform.tsx` | 109 |
| `StatusBadge` | Function | `packages/ui/src/components/platform.tsx` | 157 |
| `TabNav` | Function | `packages/ui/src/components/platform.tsx` | 333 |
| `ToastMessage` | Function | `packages/ui/src/components/platform.tsx` | 353 |
| `TopNav` | Function | `packages/ui/src/components/platform.tsx` | 82 |
| `cn` | Function | `packages/ui/src/utils.ts` | 6 |
| `EarningsView` | Function | `apps/driver-app/src/app/earnings/components/EarningsView.tsx` | 177 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DeliveryDetail → NumOrNull` | cross_community | 5 |
| `HandleComplete → RefreshQueuedCount` | cross_community | 4 |
| `ChefsPage → Cn` | cross_community | 4 |
| `DriversPage → Cn` | cross_community | 4 |
| `HandleComplete → NumOrNull` | cross_community | 4 |
| `FinancePage → Cn` | cross_community | 4 |
| `FinanceRefundsPage → Cn` | cross_community | 4 |
| `OrdersPage → Cn` | cross_community | 4 |
| `AnalyticsPage → FromMock` | cross_community | 4 |
| `AnalyticsPage → FromMock` | cross_community | 4 |

## How to Explore

1. `context({name: "KpiCard"})` — see callers and callees
2. `query({search_query: "components"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
