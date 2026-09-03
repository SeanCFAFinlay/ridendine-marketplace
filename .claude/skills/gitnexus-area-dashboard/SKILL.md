---
name: gitnexus-area-dashboard
description: "Skill for the Dashboard area of ridendine-marketplace. 38 symbols across 17 files."
---

# Dashboard

38 symbols | 17 files | Cohesion: 79%

## When to Use

- Working with code in `apps/`
- Understanding how supabase, supabase, supabase work
- Modifying dashboard-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/chef-admin/src/app/dashboard/page.tsx` | DashboardPage, EmptyStorefront, StatCard, buildReadiness, formatStatus (+5) |
| `apps/ops-admin/src/components/dashboard/orders-heatmap.tsx` | supabase, OrdersHeatmap, fetchData, formatHour, getIntensityColor |
| `apps/ops-admin/src/components/dashboard/real-time-stats.tsx` | supabase, RealTimeStats, fetchInitial, formatTime, getStatusColor |
| `apps/ops-admin/src/components/dashboard/revenue-chart.tsx` | supabase, RevenueChart, fetchData |
| `packages/db/src/realtime/events.ts` | isRecord, parseBroadcastEnvelope, parseOrdersRealtimeRow |
| `apps/chef-admin/src/app/dashboard/payouts/page.tsx` | supabase |
| `apps/chef-admin/src/app/dashboard/reviews/page.tsx` | supabase |
| `apps/chef-admin/src/hooks/use-storefront-orders-realtime.ts` | supabase |
| `apps/driver-app/src/app/profile/components/ProfileView.tsx` | supabase |
| `apps/ops-admin/src/components/dashboard/alerts-panel.tsx` | supabase |

## Entry Points

Start here when exploring this area:

- **`supabase`** (Function) — `apps/chef-admin/src/app/dashboard/payouts/page.tsx:30`
- **`supabase`** (Function) — `apps/chef-admin/src/app/dashboard/reviews/page.tsx:30`
- **`supabase`** (Function) — `apps/chef-admin/src/hooks/use-storefront-orders-realtime.ts:34`
- **`supabase`** (Function) — `apps/driver-app/src/app/profile/components/ProfileView.tsx:116`
- **`supabase`** (Function) — `apps/ops-admin/src/components/dashboard/alerts-panel.tsx:30`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `supabase` | Function | `apps/chef-admin/src/app/dashboard/payouts/page.tsx` | 30 |
| `supabase` | Function | `apps/chef-admin/src/app/dashboard/reviews/page.tsx` | 30 |
| `supabase` | Function | `apps/chef-admin/src/hooks/use-storefront-orders-realtime.ts` | 34 |
| `supabase` | Function | `apps/driver-app/src/app/profile/components/ProfileView.tsx` | 116 |
| `supabase` | Function | `apps/ops-admin/src/components/dashboard/alerts-panel.tsx` | 30 |
| `supabase` | Function | `apps/ops-admin/src/components/dashboard/orders-heatmap.tsx` | 10 |
| `supabase` | Function | `apps/ops-admin/src/components/dashboard/real-time-stats.tsx` | 19 |
| `supabase` | Function | `apps/ops-admin/src/components/dashboard/revenue-chart.tsx` | 17 |
| `supabase` | Function | `apps/ops-admin/src/components/global-search.tsx` | 82 |
| `supabase` | Function | `apps/ops-admin/src/components/ops-alerts.tsx` | 57 |
| `supabase` | Function | `apps/web/src/components/notifications/notification-bell.tsx` | 53 |
| `supabase` | Function | `apps/web/src/lib/orders/use-order-stream.ts` | 83 |
| `supabase` | Function | `packages/auth/src/hooks/use-user.ts` | 19 |
| `createBrowserClient` | Function | `packages/db/src/client/browser.ts` | 7 |
| `DashboardPage` | Function | `apps/chef-admin/src/app/dashboard/page.tsx` | 429 |
| `RealTimeStats` | Function | `apps/ops-admin/src/components/dashboard/real-time-stats.tsx` | 15 |
| `fetchInitial` | Function | `apps/ops-admin/src/components/dashboard/real-time-stats.tsx` | 29 |
| `formatTime` | Function | `apps/ops-admin/src/components/dashboard/real-time-stats.tsx` | 94 |
| `getStatusColor` | Function | `apps/ops-admin/src/components/dashboard/real-time-stats.tsx` | 82 |
| `opsOrdersChannel` | Function | `packages/db/src/realtime/channels.ts` | 21 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `DashboardPage → FromMock` | cross_community | 4 |
| `DashboardPage → FromMock` | cross_community | 4 |
| `DashboardPage → From` | cross_community | 4 |
| `DashboardPage → From` | cross_community | 4 |
| `DashboardPage → CreateServerClient` | cross_community | 3 |
| `SignupPage → CreateBrowserClient` | cross_community | 3 |

## How to Explore

1. `context({name: "supabase"})` — see callers and callees
2. `query({search_query: "dashboard"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
