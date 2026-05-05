# SUPABASE DATABASE SCHEMA (human-readable reference)

## Source of truth (post-Phase 2 rebuild)

| Layer | Canonical location |
|-------|---------------------|
| **Database schema** | `supabase/migrations/` (`00001` through `00025` in this repository; **Phase 0** = `00019_business_engine.sql`; **Phase 2 rebuild** = `00024_canonical_consolidation.sql` + `00025_rls_role_alignment.sql`). |
| **Machine types** | `packages/db/src/generated/database.types.ts` — regenerate with `pnpm --filter @ridendine/db run db:generate`. The script tries **`supabase gen types --local`** (needs Docker + `supabase start`), then **`--db-url`** using **`DATABASE_URL`** from `.env.local` or `.env` (Postgres URI from Dashboard → Database). It **never truncates** the types file on failure. Passwords with special characters: the script retries with an encoded `postgresql://postgres:…` password segment. |
| **This document** | High-level entity map and relationships; the **contract** for what the schema should look like after `00024` + `00025` apply. Update when later migrations add or rename tables/columns. |
| **Migration rationale** | `archive/audits/old-docs/DATABASE_MIGRATION_NOTES.md` (archived in Phase 1; consult only as historical reference). |

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
| `orders` | Main order record (totals, **`status`** legacy, **`engine_status`** canonical engine, **`public_stage`** customer-safe projection — see `00019`) |
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
| `drivers` | Driver profiles and status (**`instant_payouts_enabled`** in `00019`) |
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
| `deliveries` | Delivery record (pickup/dropoff, photos; **routing/ETA cache columns** in `00019`: polylines, leg meters/seconds, `eta_*`, `route_progress_pct`, `routing_*`) |
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
| `ledger_entries` | Financial ledger lines (**`idempotency_key`** + partial unique index in `00019`) |
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
| `platform_settings` | `00004_additions.sql`, `00009_ops_admin_control_plane.sql`, `00010_contract_drift_repair.sql`, `00012_schema_drift_cleanup.sql`, `00024_canonical_consolidation.sql` | Platform configuration. **Canonical shape** is a single wide row (`platform_fee_percent`, `service_fee_percent`, `hst_rate`, `min_order_amount`, … `storefront_pause_on_sla_breach`) — see `packages/db/src/repositories/platform.repository.ts` for the full column list. The `setting_key`/`setting_value`/`description` columns from `00010` are orphan reservations (no application code uses them); they remain in the table for backward compatibility but are documented as deprecated via `COMMENT ON COLUMN` in `00024`. |
| `push_subscriptions` | `00004_additions.sql` | Push notification subscriptions |
| `chef_payouts` | `00004_additions.sql` | Chef payout records (detail alongside `payout_runs`) |
| `analytics_events` | `00013_analytics_events.sql` | Analytics / product events |
| `stripe_events_processed` | `00016_phase3_stripe_idempotency_order_events_promo.sql` | Stripe webhook idempotency ledger (`stripe_event_id` unique; no raw payload storage) |
| `platform_accounts` | `00019_business_engine.sql` | Materialized balances (`chef_payable`, `driver_payable`, `platform_revenue`) updated from `ledger_entries` |
| `stripe_reconciliation` | `00019_business_engine.sql` | Links `stripe_events_processed` to `ledger_entries` for finance reconciliation |
| `service_areas` | `00019_business_engine.sql` | Marketplace geofences + optional per-area dispatch tuning (`offer_ttl_seconds`, `max_offer_attempts`, etc.) |
| `instant_payout_requests` | `00019_business_engine.sql` | Driver instant payout request queue (Stripe wiring Phase 5) |

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

## RLS helper functions (Phase 2 rebuild — `00025`)

`00025_rls_role_alignment.sql` introduces three SQL helper functions that RLS policies use to encapsulate role-set checks. Each runs as `SECURITY DEFINER` and is `STABLE`, so a policy can call it without leaking `platform_users` access to non-staff users.

| Function | Returns `true` when the caller's `platform_users.role` is in |
|----------|--------------------------------------------------------------|
| `is_platform_staff(uid uuid)` | `ops_admin, ops_agent, ops_manager, super_admin, support_agent, finance_admin, finance_manager` |
| `is_finance_staff(uid uuid)`  | `finance_admin, finance_manager, super_admin` |
| `is_support_staff(uid uuid)`  | `support_agent, ops_agent, ops_admin, ops_manager, super_admin` |

All three additionally require `platform_users.is_active = true`; a `NULL` `uid` returns `false`.

`00025` refactors verbose `EXISTS (SELECT 1 FROM platform_users WHERE role IN (...))` patterns introduced in `00011_rls_role_alignment.sql` to call the appropriate helper, and the pgTAP suite at `supabase/tests/rls/role_alignment.sql` enforces correctness on every `supabase db reset`. **Phase 5 (RBAC enforcement)** layers a per-route capability matrix on top of these helpers.

---

## Known drift (post-Phase 2 rebuild)

**Resolved by Phase 2 rebuild (`00024` / `00025`):**

- **FND-002 / FND-003** (schema drift, duplicate table definitions for `platform_settings`, `promo_codes`, `driver_locations`, `chef_payout_accounts`) — `00012_schema_drift_cleanup.sql` performed the additive normalization; `00024_canonical_consolidation.sql` adds defensive `ADD COLUMN IF NOT EXISTS` repetition (idempotent — silently skips on already-applied DBs) and `COMMENT ON COLUMN` documentation marking orphan/deprecated columns. No data is modified, no columns are dropped.
- **FND-020** (RLS role mismatch — policies referenced literal `'ops_admin'` while `platform_users.role` CHECK accepted seven other values) — `00011_rls_role_alignment.sql` had already replaced literal `'ops_admin'` policies with `role IN (...)`. `00025_rls_role_alignment.sql` introduces the `is_platform_staff` / `is_finance_staff` / `is_support_staff` helpers and refactors the verbose role-IN policies to call them.

**Still pending (out of Phase 2 scope):**

1. **`packages/db/src/generated/database.types.ts`** is regenerated against the local DB at the end of Phase 2 (`pnpm db:generate`). If you ever regenerate from a stale schema, type drift returns. Treat the generated file as a snapshot, not a contract. **Warning:** the `db:generate` script redirects stdout to `database.types.ts`; if the CLI fails (e.g. Docker missing), the file can be **truncated** — restore with `git checkout -- packages/db/src/generated/database.types.ts`.
2. The empty `supabase/migrations/20260501080818_phase_b_security_rls_hardening.sql` file shares a name suffix with `00017_phase_b_security_rls_hardening.sql` but contains no SQL. It is harmless but confusing. Phase 12 launch checklist will revisit whether to remove it (would require migration history rewrite, which is out of scope here).
3. Phase 6 (Stripe correctness) will move tax/fee constants (`HST_RATE`, `SERVICE_FEE_PERCENT`) from `packages/engine/src/constants.ts` into the `platform_settings` row; the schema is already capable, only the runtime read path needs to change.

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
