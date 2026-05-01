# SUPABASE DATABASE SCHEMA (human-readable reference)

## Source of truth (Phase 1)

| Layer | Canonical location |
|-------|---------------------|
| **Database schema** | `supabase/migrations/` (`00001` through `00016` in this repository). |
| **Machine types** | `packages/db/src/generated/database.types.ts` — regenerate with `pnpm --filter @ridendine/db run db:generate`. The script tries **`supabase gen types --local`** (needs Docker + `supabase start`), then **`--db-url`** using **`DATABASE_URL`** from `.env.local` or `.env` (Postgres URI from Dashboard → Database). It **never truncates** the types file on failure. Passwords with special characters: the script retries with an encoded `postgresql://postgres:…` password segment. |
| **This document** | High-level entity map and relationships; update when migrations add or rename tables/columns **verified** against SQL migrations and regenerated types. |
| **Migration rationale** | [`docs/DATABASE_MIGRATION_NOTES.md`](DATABASE_MIGRATION_NOTES.md) — why each phase migration exists, rollback notes, follow-ups. |

**Order status events (IRR-009):** The physical table is **`order_status_history`**. Migration **`00016`** adds read view **`order_status_events`** as `SELECT * FROM order_status_history` (naming alias only; no duplicate storage). Prefer **`order_status_history`** in new SQL and engine queries; use the view where product language or external reports expect “events”.

---

## Chef Domain (8 Tables)

| Table | Description |
|-------|-------------|
| `chef_profiles` | Chef user profiles, status, bio |
| `chef_kitchens` | Physical kitchen locations |
| `chef_storefronts` | Public storefront (name, slug, ratings) |
| `chef_documents` | Verification docs (licenses, permits) |
| `chef_payout_accounts` | Stripe payout accounts |
| `chef_availability` | Operating hours per day |
| `chef_delivery_zones` | Delivery radius/polygon areas |

## Catalog Domain (5 Tables)

| Table | Description |
|-------|-------------|
| `menu_categories` | Food categories (Appetizers, Mains, etc) |
| `menu_items` | Individual dishes with prices |
| `menu_item_options` | Customizations (Size, Spice Level) |
| `menu_item_option_values` | Option choices (Small, Medium, Large) |
| `menu_item_availability` | Per-item schedule overrides |

## Customer Domain (5 Tables)

| Table | Description |
|-------|-------------|
| `customers` | Customer profiles |
| `customer_addresses` | Saved delivery addresses |
| `carts` | Shopping carts per storefront |
| `cart_items` | Items in cart with quantities |
| `favorites` | Favorited storefronts |

## Order Domain (7 Tables)

| Table | Description |
|-------|-------------|
| `orders` | Main order record (totals, status, payment) |
| `order_items` | Items in order with prices |
| `order_item_modifiers` | Selected options per item |
| `order_status_history` | Status change audit trail (`previous_status`, `new_status`, `status` — see `00010`) |
| `order_status_events` | **View** (Phase 3 `00016`): alias over `order_status_history` |
| `reviews` | Customer reviews and ratings |
| `promo_codes` | Discount codes (canonical vs alias columns — see **Promo codes (IRR-029)** below) |
| `support_tickets` | Customer support issues |

## Driver Domain (8 Tables)

| Table | Description |
|-------|-------------|
| `drivers` | Driver profiles and status |
| `driver_documents` | License, insurance, vehicle docs |
| `driver_vehicles` | Vehicle info (type, plates, color) |
| `driver_shifts` | Work sessions with earnings |
| `driver_presence` | Real-time online/offline status |
| `driver_locations` | GPS history during shifts |
| `driver_earnings` | Per-delivery earnings breakdown |
| `driver_payouts` | Payout records |

## Delivery Domain (4 Tables)

| Table | Description |
|-------|-------------|
| `deliveries` | Delivery record (pickup/dropoff, photos) |
| `delivery_assignments` | Driver assignment offers |
| `delivery_events` | Delivery audit log |
| `delivery_tracking_events` | GPS breadcrumbs during delivery |

## Platform Domain (5 Tables)

| Table | Description |
|-------|-------------|
| `platform_users` | Ops/admin user accounts (`role` CHECK: `ops_admin`, `ops_agent`, `ops_manager`, `super_admin`, `support`, `support_agent`, `finance_admin`, `finance_manager` — see `00015_phase2_platform_roles.sql`; legacy `support` is normalized to `support_agent` in app types) |
| `admin_notes` | Internal notes on entities |
| `notifications` | User notifications |
| `audit_logs` | System-wide audit trail |
| `payout_runs` | Batch payout processing |

---

## Engine and operations tables (central engine)

Defined primarily in `supabase/migrations/00007_central_engine_tables.sql` (plus RLS in later migrations):

| Table | Purpose |
|-------|---------|
| `domain_events` | Durable events (`event_type`, `entity_type`, `entity_id`, JSON payload, actor, `published`) |
| `order_exceptions` | Order incidents / SLA / escalation |
| `sla_timers` | SLA timers (`sla_type`, `deadline_at`, `status`) |
| `kitchen_queue_entries` | Per-storefront kitchen queue |
| `ledger_entries` | Financial ledger lines |
| `assignment_attempts` | Driver assignment attempts |
| `ops_override_logs` | Admin override records |
| `refund_cases` | Refund case workflow |
| `payout_adjustments` | Payout adjustments |
| `storefront_state_changes` | Storefront operational state changes |
| `system_alerts` | System-wide ops alerts (`alert_type`, `severity`, `acknowledged`) |

---

## Additional platform and analytics tables

| Table | Introduced / evolved in | Purpose |
|-------|-------------------------|---------|
| `platform_settings` | `00004_additions.sql`, `00009_ops_admin_control_plane.sql`, `00010_contract_drift_repair.sql` | Platform configuration and feature flags |
| `push_subscriptions` | `00004_additions.sql` | Push notification subscriptions |
| `chef_payouts` | `00004_additions.sql` | Chef payout records (detail alongside `payout_runs`) |
| `analytics_events` | `00013_analytics_events.sql` | Analytics / product events |
| `stripe_events_processed` | `00016_phase3_stripe_idempotency_order_events_promo.sql` | Stripe webhook idempotency ledger (`stripe_event_id` unique; no raw payload storage) |

The historical title “36 tables” referred to the **original core domain** sketch. The live schema includes the **additional** engine, analytics, platform, and payment-support tables above; use migrations and regenerated types for an authoritative inventory.

---

## Promo codes — canonical vs alias columns (IRR-029)

| Concept | **Canonical** (prefer for new writes) | **Alias / legacy** (kept in sync by `00010` trigger `sync_promo_code_fields`) |
|---------|----------------------------------------|-------------------------------------------------------------------------------|
| Validity window | `starts_at`, `expires_at` | `valid_from`, `valid_until` |
| Redemption limits | `usage_limit`, `usage_count` | `max_uses`, `times_used` |
| Active flag | `is_active` | — |
| Discount shape | `discount_type` (`percentage` \| `fixed`), `discount_value` | — |

Do **not** drop alias columns in Phase 3; checkout and ops code may still reference both sets until a later cleanup phase. `00012` adds a partial index on `(is_active, starts_at, expires_at)`.

---

## Stripe webhook idempotency (IRR-008)

| Table | Role |
|-------|------|
| `stripe_events_processed` | Durable record that a Stripe `event.id` was handled (or skipped as duplicate). **Runtime** insert-before-side-effect belongs in Phase **4** / **9** (`apps/web/src/app/api/webhooks/stripe/route.ts`); Phase 3 delivers schema only. |

---

## Known drift (verified Phase 1)

1. **`packages/db/src/generated/database.types.ts`** may **omit** tables that exist in migrations. Example: **`system_alerts`** exists in `00007_central_engine_tables.sql` but was **not** present in the committed generated `Database['public']['Tables']` map at verification time — `apps/ops-admin` references `system_alerts` and strict `pnpm typecheck` may fail until types are regenerated from a database that reflects all migrations.
2. **Regeneration** (`supabase gen types typescript --local`) requires a working **local** Supabase stack (Docker). If regeneration cannot be run, treat the committed types file as **stale risk** and schedule regeneration when Docker/Supabase local is available. **Warning:** the `db:generate` script redirects stdout to `database.types.ts`; if the CLI fails (e.g. Docker missing), the file can be **truncated** — restore with `git checkout -- packages/db/src/generated/database.types.ts`.
3. **Phase 3 objects** (`stripe_events_processed`, view `order_status_events`) appear in migration `00016` but may be **absent** from committed `database.types.ts` until regeneration succeeds.

---

## Key Relationships

```
chef_profiles
    └── chef_storefronts (1:1)
           └── menu_categories (1:many)
                  └── menu_items (1:many)
                         └── menu_item_options (1:many)
                                └── menu_item_option_values (1:many)

customers
    └── customer_addresses (1:many)
    └── carts (1:many per storefront)
           └── cart_items (1:many)
    └── favorites (1:many)
    └── orders (1:many)

orders
    └── order_items (1:many)
           └── order_item_modifiers (1:many)
    └── order_status_history (1:many)
    └── deliveries (1:1)
    └── reviews (1:1)

drivers
    └── driver_documents (1:many)
    └── driver_vehicles (1:many)
    └── driver_shifts (1:many)
    └── driver_presence (1:1)
    └── driver_locations (1:many)
    └── driver_earnings (1:many)
    └── deliveries (1:many)

deliveries
    └── delivery_assignments (1:many)
    └── delivery_events (1:many)
    └── delivery_tracking_events (1:many)
```

## Price Calculations

| Fee | Amount |
|-----|--------|
| Delivery Fee | $3.99 |
| Service Fee | 8% of subtotal |
| HST (Ontario) | 13% of (subtotal + fees) |

## Status Values

### Chef Status
- `pending` - Awaiting approval
- `approved` - Active chef
- `rejected` - Application rejected
- `suspended` - Temporarily suspended

### Driver Status
- `pending` - Awaiting approval
- `approved` - Active driver
- `rejected` - Application rejected
- `suspended` - Temporarily suspended

### Order Status
- `pending`, `accepted`, `preparing`, `ready`, `picked_up`, `delivered`, `completed`, `cancelled`, `failed`

### Delivery Status
- `pending`, `assigned`, `accepted`, `en_route_to_pickup`, `arrived_at_pickup`, `picked_up`, `en_route_to_dropoff`, `arrived_at_dropoff`, `delivered`, `completed`
