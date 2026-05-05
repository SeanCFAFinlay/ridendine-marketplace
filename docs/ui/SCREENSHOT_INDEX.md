# Screenshot Index

Run `scripts/ui/generate-ui-screenshots.ts` against a running web dev server to populate `docs/ui/screenshots`.

| Page | Route | Screenshot | Design intent | Components |
| --- | --- | --- | --- | --- |
| Customer home | `/ui-blueprint/customer-home` | `docs/ui/screenshots/customer-home.png` | Marketplace discovery and active order awareness | AppShell, PageHeader, MetricCard, MapPlaceholder, LiveFeed |
| Customer menu | `/ui-blueprint/customer-menu` | `docs/ui/screenshots/customer-menu.png` | Chef menu with sticky cart | TabNav, OrderCard, DrawerPanel |
| Customer checkout | `/ui-blueprint/customer-checkout` | `docs/ui/screenshots/customer-checkout.png` | Cart, address, fees, and payment state | OrderCard, PayoutCard, ActionButton |
| Customer order tracking | `/ui-blueprint/customer-order-tracking` | `docs/ui/screenshots/customer-order-tracking.png` | ETA, map, and timeline | MapPlaceholder, OrderTimeline |
| Chef dashboard | `/ui-blueprint/chef-dashboard` | `docs/ui/screenshots/chef-dashboard.png` | Live kitchen operating view | MetricCard, DataTable, LiveFeed |
| Chef orders | `/ui-blueprint/chef-orders` | `docs/ui/screenshots/chef-orders.png` | Kanban-style queue and detail drawer | OrderCard, DrawerPanel, OrderTimeline |
| Chef menu manager | `/ui-blueprint/chef-menu-manager` | `docs/ui/screenshots/chef-menu-manager.png` | Menu sections and item availability | TabNav, OrderCard |
| Driver home | `/ui-blueprint/driver-home` | `docs/ui/screenshots/driver-home.png` | Online state and offers | MetricCard, MapPlaceholder |
| Driver offer | `/ui-blueprint/driver-offer` | `docs/ui/screenshots/driver-offer.png` | Fast accept/reject offer screen | MapPlaceholder, OrderCard |
| Driver active delivery | `/ui-blueprint/driver-active-delivery` | `docs/ui/screenshots/driver-active-delivery.png` | Route and status progression | MapPlaceholder, OrderTimeline |
| Ops dashboard | `/ui-blueprint/ops-dashboard` | `docs/ui/screenshots/ops-dashboard.png` | Command center overview | MetricCard, DataTable, LiveFeed |
| Ops dispatch | `/ui-blueprint/ops-dispatch` | `docs/ui/screenshots/ops-dispatch.png` | Assignment and map workflow | MapPlaceholder, FilterBar, DrawerPanel |
| Ops finance | `/ui-blueprint/ops-finance` | `docs/ui/screenshots/ops-finance.png` | Revenue and reconciliation health | MoneyCard, PayoutCard, DataTable |
| Ops payouts | `/ui-blueprint/ops-payouts` | `docs/ui/screenshots/ops-payouts.png` | Payout review and approvals | PayoutCard, DataTable |
| Ops reconciliation | `/ui-blueprint/ops-reconciliation` | `docs/ui/screenshots/ops-reconciliation.png` | Stripe and ledger matching | DataTable, StatusBadge |
| Ops system health | `/ui-blueprint/ops-system-health` | `docs/ui/screenshots/ops-system-health.png` | API, DB, webhook, cron, and queue status | MetricCard, HealthDot |
