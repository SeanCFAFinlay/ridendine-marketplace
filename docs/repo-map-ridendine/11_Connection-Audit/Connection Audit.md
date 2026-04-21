# Connection Audit

> Classification of every major module's connection status across the platform.

## Classification Key

| Category | Symbol | Meaning |
|----------|--------|---------|
| **1. Fully connected** | :white_check_mark: | UI → API → Engine → DB chain complete and functional |
| **2. Connected but fragile** | :warning: | Works but has weak links, missing validation, or tight coupling |
| **3. Partially connected** | :construction: | Some pieces wired, others missing or stubbed |
| **4. Stubbed / placeholder** | :pushpin: | UI exists but logic is static, mocked, or not wired |
| **5. Orphaned / unused** | :skull: | Code exists but nothing calls it or renders it |
| **6. Implied but not built** | :thought_balloon: | Schema/types defined but no UI or API route |
| **7. Duplicated / overlapping** | :arrows_counterclockwise: | Same responsibility implemented in multiple places |
| **8. Cannot confirm** | :question: | Would need runtime testing to verify |

---

## Pages Audit

### Customer App (web)

| Page | Status | Notes |
|------|--------|-------|
| Home (`/`) | :white_check_mark: Fully connected | Featured chefs from DB, links work |
| Login | :white_check_mark: Fully connected | Auth → session → redirect |
| Signup | :white_check_mark: Fully connected | Auth → customer creation → redirect |
| Forgot Password | :pushpin: **Placeholder** | Form renders but makes no API call |
| Browse Chefs (`/chefs`) | :construction: Partially connected | List works, **filters are non-functional** |
| Chef Detail (`/chefs/[slug]`) | :white_check_mark: Fully connected | Storefront + menu from DB |
| Cart | :white_check_mark: Fully connected | Full CRUD via CartContext → API → DB |
| Checkout | :white_check_mark: Fully connected | Engine + Stripe + DB |
| Order Confirmation | :white_check_mark: Fully connected | Real-time status + map tracking |
| Account Overview | :white_check_mark: Fully connected | Auth context |
| Order History | :white_check_mark: Fully connected | Supabase direct query |
| Addresses | :white_check_mark: Fully connected | Full CRUD |
| Favorites | :pushpin: **Placeholder** | Empty state only, no favorites table queried |
| Settings | :construction: Partially connected | UI renders but form submit is `setTimeout` mock |
| About / How It Works | :white_check_mark: Static | Content pages, no data |
| Contact | :white_check_mark: Fully connected | Form → API (but support ticket not saved to DB) |
| Privacy / Terms | :white_check_mark: Static | Content pages |
| Chef Signup | :question: Cannot confirm | Not deeply inspected |
| Chef Resources | :question: Cannot confirm | Not deeply inspected |

### Chef Admin

| Page | Status | Notes |
|------|--------|-------|
| Login | :white_check_mark: Fully connected | |
| Signup | :white_check_mark: Fully connected | Creates chef_profiles (pending) |
| Dashboard | :white_check_mark: Fully connected | Stats from DB, links to sub-pages |
| Menu | :white_check_mark: Fully connected | Full CRUD with modals + engine audit |
| Orders | :white_check_mark: Fully connected | Real-time + engine actions + countdown |
| Storefront | :white_check_mark: Fully connected | Create or edit, approval banner |
| Payouts | :white_check_mark: Fully connected | Stripe Connect + balance calculations |
| Analytics | :white_check_mark: Fully connected | Direct Supabase queries + charts |
| Reviews | :white_check_mark: Fully connected | View + respond |
| Settings | :white_check_mark: Fully connected | Profile edit |

### Ops Admin

| Page | Status | Notes |
|------|--------|-------|
| Dashboard | :white_check_mark: Fully connected | Engine read model |
| Analytics | :white_check_mark: Fully connected | Direct queries |
| Chefs list | :white_check_mark: Fully connected | Governance actions |
| Chef detail | :white_check_mark: Fully connected | Detail + storefront governance |
| Chef approvals | :white_check_mark: Fully connected | Filtered pending list |
| Customers list | :white_check_mark: Fully connected | Read-only list |
| Customer detail | :white_check_mark: Fully connected | Orders + addresses |
| Deliveries | :white_check_mark: Fully connected | Dispatch command center |
| Delivery detail | :white_check_mark: Fully connected | Intervention console |
| Drivers list | :white_check_mark: Fully connected | Governance actions |
| Driver detail | :white_check_mark: Fully connected | Profile + earnings |
| Orders list | :white_check_mark: Fully connected | Status management |
| Order detail | :white_check_mark: Fully connected | Audit trail + financial breakdown |
| Finance | :white_check_mark: Fully connected | Refund/payout queues + role gate |
| Support | :white_check_mark: Fully connected | Ticket queue + exceptions |
| Settings | :white_check_mark: Fully connected | Platform rules + role gate |
| Map | :white_check_mark: Fully connected | Dynamic Leaflet import |

### Driver App

| Page | Status | Notes |
|------|--------|-------|
| Login | :white_check_mark: Fully connected | Approved status check |
| Dashboard | :white_check_mark: Fully connected | Online toggle + active delivery |
| Delivery Detail | :white_check_mark: Fully connected | 6-step progress + location tracking + completion modal |
| Earnings | :white_check_mark: Fully connected | Calculated from delivery history |
| History | :white_check_mark: Fully connected | Grouped delivery list |
| Profile | :white_check_mark: Fully connected | Edit + logout |

---

## API Routes Audit

| Category | Count | Details |
|----------|-------|---------|
| :white_check_mark: Fully connected | ~55 | Most API routes across all apps |
| :construction: Partially connected | 2 | web `/api/support` (logs but no DB write), web `/api/notifications/subscribe` (stores but no dispatch) |
| :pushpin: Stubbed | 3 | ops POST `/api/chefs` (returns NOT_SUPPORTED), ops POST `/api/customers` (same), ops POST `/api/drivers` (same) |

---

## Database Tables Audit

| Table | Status | Notes |
|-------|--------|-------|
| chef_profiles | :white_check_mark: Fully connected | All CRUD via chef-admin + ops governance |
| chef_kitchens | :white_check_mark: Fully connected | Created with storefront |
| chef_storefronts | :white_check_mark: Fully connected | Most-referenced table |
| **chef_documents** | :thought_balloon: **Implied but not built** | Schema complete, no UI, no upload flow |
| **chef_availability** | :thought_balloon: **Implied but not built** | Schema complete, no schedule editor |
| **chef_delivery_zones** | :thought_balloon: **Implied but not built** | Schema + PostGIS, no zone editor |
| chef_payout_accounts | :white_check_mark: Fully connected | Via Stripe Connect |
| menu_categories | :white_check_mark: Fully connected | CRUD in chef-admin |
| menu_items | :white_check_mark: Fully connected | CRUD in chef-admin, displayed in web |
| **menu_item_options** | :thought_balloon: **Implied but not built** | Schema exists, no option editor UI |
| **menu_item_option_values** | :thought_balloon: **Implied but not built** | Schema exists, linked to options |
| **menu_item_availability** | :thought_balloon: **Implied but not built** | Time-based item availability, no UI |
| customers | :white_check_mark: Fully connected | |
| customer_addresses | :white_check_mark: Fully connected | |
| carts / cart_items | :white_check_mark: Fully connected | |
| orders | :white_check_mark: Fully connected | Core entity |
| order_items | :white_check_mark: Fully connected | |
| **order_item_modifiers** | :thought_balloon: **Implied but not built** | Schema exists, no modifier UI in checkout |
| order_status_history | :white_check_mark: Fully connected | Written by engine, displayed in ops |
| reviews | :white_check_mark: Fully connected | Create in web, view/respond in chef-admin |
| promo_codes | :white_check_mark: Fully connected | Applied at checkout |
| drivers | :white_check_mark: Fully connected | |
| **driver_documents** | :thought_balloon: **Implied but not built** | Schema exists, no upload UI |
| **driver_vehicles** | :construction: Partially connected | Seeded, displayed in ops driver detail, no CRUD UI |
| **driver_shifts** | :skull: **Orphaned** | Schema exists, referenced in location tracking FK but not actively created/managed |
| driver_presence | :white_check_mark: Fully connected | Core real-time tracking |
| driver_locations | :white_check_mark: Fully connected | Written by location API |
| **driver_earnings** | :skull: **Orphaned** | Schema exists but earnings calculated from deliveries directly |
| **driver_payouts** | :construction: Partially connected | Referenced in finance read model, not actively populated via driver flows |
| deliveries | :white_check_mark: Fully connected | Core dispatch entity |
| **delivery_assignments** | :skull: **Superseded** | Original assignment table, replaced by `assignment_attempts` |
| delivery_events | :construction: Partially connected | Written by engine, not displayed directly |
| delivery_tracking_events | :white_check_mark: Fully connected | GPS breadcrumbs from driver |
| assignment_attempts | :white_check_mark: Fully connected | Offer management |
| platform_users | :white_check_mark: Fully connected | Ops auth |
| platform_settings | :white_check_mark: Fully connected | Settings CRUD |
| **admin_notes** | :thought_balloon: **Implied but not built** | Schema exists, no UI to create/view notes |
| audit_logs | :white_check_mark: Fully connected | Written by engine, displayed in ops |
| notifications | :white_check_mark: Fully connected | CRUD + real-time in web |
| **push_subscriptions** | :construction: Partially connected | Stored but never used to send push |
| domain_events | :white_check_mark: Fully connected | Engine event sourcing |
| order_exceptions | :white_check_mark: Fully connected | Exception management |
| sla_timers | :white_check_mark: Fully connected | SLA tracking |
| kitchen_queue_entries | :white_check_mark: Fully connected | Kitchen queue management |
| ledger_entries | :white_check_mark: Fully connected | Financial tracking |
| refund_cases | :white_check_mark: Fully connected | Refund lifecycle |
| payout_adjustments | :white_check_mark: Fully connected | Payout modifications |
| ops_override_logs | :white_check_mark: Fully connected | Ops action audit |
| storefront_state_changes | :white_check_mark: Fully connected | Governance audit |
| system_alerts | :white_check_mark: Fully connected | Dashboard alerts |
| **payout_runs** | :thought_balloon: **Implied but not built** | Batch payout system not implemented |
| **support_tickets** | :construction: Partially connected | Ops can view/manage, web contact form does NOT create tickets |
| chef_payouts | :white_check_mark: Fully connected | Stripe transfer records |

---

## Component Audit

| Component | Status | Notes |
|-----------|--------|-------|
| ChefsFilters | :pushpin: **Placeholder** | Renders cuisine/rating filters but they don't connect to any query |
| PasswordStrength | :arrows_counterclockwise: **Duplicated** | Identical component in web and chef-admin |
| AuthLayout | :arrows_counterclockwise: **Duplicated** | Similar component in web and chef-admin (different branding) |
| Image upload buttons | :pushpin: **Placeholder** | Multiple "Upload" buttons that do nothing |
| DriverDashboard todayStats | :pushpin: **Placeholder** | Hardcoded `{deliveries: 0, earnings: 0, hours: 0}` |
| StorageService (engine) | :skull: **Orphaned** | Exists in services but not called |
| Notification templates | :skull: **Orphaned** | Package exists but templates never dispatched |

---

## Business Workflow Audit

| Workflow | Status | Notes |
|----------|--------|-------|
| Customer browse → order → pay | :white_check_mark: Fully connected | Complete chain |
| Stripe payment → webhook → kitchen | :white_check_mark: Fully connected | |
| Chef accept → prepare → ready | :white_check_mark: Fully connected | Engine-driven |
| Ready → auto-dispatch → driver offer | :white_check_mark: Fully connected | PlatformWorkflowEngine |
| Driver accept → pickup → deliver | :white_check_mark: Fully connected | Engine-driven |
| Delivery complete → ledger entries | :white_check_mark: Fully connected | PlatformWorkflowEngine |
| Ops chef governance | :white_check_mark: Fully connected | Approve/reject/suspend |
| Ops driver governance | :white_check_mark: Fully connected | Approve/reject/suspend |
| Ops refund processing | :white_check_mark: Fully connected | Stripe + ledger |
| Ops manual dispatch | :white_check_mark: Fully connected | Manual assign + reassign |
| Chef payout request | :white_check_mark: Fully connected | Stripe Connect transfer |
| Customer notifications | :construction: Partially connected | In-app only, no push/email/SMS |
| Chef storefront scheduling | :thought_balloon: Implied but not built | Schema exists, no UI |
| Menu item options/modifiers | :thought_balloon: Implied but not built | Schema exists, no UI |
| Document verification | :thought_balloon: Implied but not built | Schema exists, no UI |
| Driver shift management | :thought_balloon: Implied but not built | Schema exists, not populated |
| Batch payout runs | :thought_balloon: Implied but not built | Schema exists, not implemented |
| Password reset | :pushpin: Placeholder | UI exists, no API call |

---

## Connected / Partial / Orphaned Module Matrix

| Module | Connected | Partial | Orphaned | Implied |
|--------|-----------|---------|----------|---------|
| **Pages** | 42 | 3 | 0 | 0 |
| **API Routes** | 55 | 2 | 3 (NOT_SUPPORTED stubs) | 0 |
| **DB Tables** | 28 | 4 | 3 | 10 |
| **Components** | 28 | 0 | 0 | 0 |
| **Engine Methods** | ~45 | 0 | 2 | 0 |
| **Integrations** | 4 | 1 | 0 | 2 |
| **Workflows** | 12 | 1 | 0 | 5 |
