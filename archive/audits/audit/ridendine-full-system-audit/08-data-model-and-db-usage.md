# 08 - Data Model and Database Usage Audit

**Audit Date**: 2026-04-23
**Scope**: All 56 Supabase tables, 22 repositories, 8 RPC functions, 10 migrations
**Status**: CRITICAL ISSUES FOUND - 22 tables unreferenced, stale generated types

---

## Table of Contents

1. [Schema Overview](#schema-overview)
2. [Domain Breakdown](#domain-breakdown)
3. [Repository Coverage](#repository-coverage)
4. [Unreferenced Tables (Critical)](#unreferenced-tables-critical)
5. [RPC Function Usage](#rpc-function-usage)
6. [Migration History](#migration-history)
7. [Generated Types Staleness](#generated-types-staleness)
8. [Risk Summary](#risk-summary)

---

## Schema Overview

| Metric | Count |
|--------|-------|
| Total tables | 56 |
| Tables with code references | 34 |
| Tables with zero code references | 22 |
| Repositories in @ridendine/db | 22 |
| RPC functions defined | 8 |
| RPC functions called in code | 2 |
| Migrations applied | 10 |
| Types file currency | Stale (missing migrations 7-10) |

---

## Domain Breakdown

### Chef Domain (8 tables)

| Table | Migration | Referenced in Code | Repository |
|-------|-----------|-------------------|------------|
| `chef_profiles` | 00001 | YES | chef.repository.ts |
| `chef_kitchens` | 00001 | YES | chef.repository.ts |
| `chef_storefronts` | 00001 | YES | storefront.repository.ts |
| `chef_documents` | 00001 | **NO** | — |
| `chef_payout_accounts` | 00001 | YES | finance.repository.ts |
| `chef_availability` | 00001 | **NO** | — |
| `chef_delivery_zones` | 00001 | **NO** | — |
| `chef_payouts` | 00004 | **NO** | — |

Chef-domain gap: 4 of 8 tables are unreferenced. Document verification, schedule management, delivery zone configuration, and payout records are schema-only features.

### Catalog Domain (5 tables)

| Table | Migration | Referenced in Code | Repository |
|-------|-----------|-------------------|------------|
| `menu_categories` | 00001 | YES | menu.repository.ts |
| `menu_items` | 00001 | YES | menu.repository.ts |
| `menu_item_options` | 00001 | **NO** | — |
| `menu_item_option_values` | 00001 | **NO** | — |
| `menu_item_availability` | 00001 | **NO** | — |

Catalog gap: Item customization (options/modifiers) and per-item availability windows are defined but never used. Menu items cannot have variants or add-ons through the application layer.

### Customer Domain (5 tables)

| Table | Migration | Referenced in Code | Repository |
|-------|-----------|-------------------|------------|
| `customers` | 00001 | YES | customer.repository.ts |
| `customer_addresses` | 00001 | YES | address.repository.ts |
| `carts` | 00001 | YES | cart.repository.ts |
| `cart_items` | 00001 | YES | cart.repository.ts |
| `favorites` | 00001 | **NO** | — |

Customer gap: Favorites table has no CRUD endpoints and no UI. The feature is completely unimplemented.

### Order Domain (7 tables)

| Table | Migration | Referenced in Code | Repository |
|-------|-----------|-------------------|------------|
| `orders` | 00001 | YES | order.repository.ts |
| `order_items` | 00001 | YES | order.repository.ts |
| `order_item_modifiers` | 00001 | YES | order.repository.ts |
| `order_status_history` | 00001 | YES | order.repository.ts |
| `reviews` | 00001 | YES | order.repository.ts |
| `promo_codes` | 00001 | YES | promo.repository.ts |
| `support_tickets` | 00001 | YES | support.repository.ts |

Order domain is fully covered. All 7 tables have repository bindings and application references.

### Driver Domain (8 tables)

| Table | Migration | Referenced in Code | Repository |
|-------|-----------|-------------------|------------|
| `drivers` | 00001 | YES | driver.repository.ts |
| `driver_documents` | 00001 | **NO** | — |
| `driver_vehicles` | 00001 | **NO** | — |
| `driver_shifts` | 00001 | **NO** | — |
| `driver_presence` | 00001 | YES | driver-presence.repository.ts |
| `driver_locations` | 00001 | YES | driver.repository.ts |
| `driver_earnings` | 00001 | **NO** | — |
| `driver_payouts` | 00001 | **NO** | — |

Driver gap: 5 of 8 tables unreferenced. Document verification, vehicle records, shift scheduling, earnings tracking, and payout records are all schema-only.

### Delivery Domain (4 tables)

| Table | Migration | Referenced in Code | Repository |
|-------|-----------|-------------------|------------|
| `deliveries` | 00001 | YES | delivery.repository.ts |
| `delivery_assignments` | 00001 | **NO** (code uses `assignment_attempts`) | — |
| `delivery_events` | 00001 | YES | delivery.repository.ts |
| `delivery_tracking_events` | 00001 | YES | delivery.repository.ts |

Delivery gap: `delivery_assignments` exists in schema but the engine uses `assignment_attempts` (engine tables) instead. This is a naming mismatch — two tables serve overlapping purposes.

### Platform Domain (5 tables)

| Table | Migration | Referenced in Code | Repository |
|-------|-----------|-------------------|------------|
| `platform_users` | 00001 | YES | platform.repository.ts |
| `admin_notes` | 00001 | YES | ops.repository.ts |
| `notifications` | 00001 | YES | platform.repository.ts |
| `audit_logs` | 00001 | **NO** | — |
| `payout_runs` | 00001 | **NO** | — |

Platform gap: `audit_logs` is written by the engine's AuditLogger but never queried in application code (no audit log UI). `payout_runs` has no associated code.

### Engine Tables (11 tables)

| Table | Migration | Referenced in Code | Repository |
|-------|-----------|-------------------|------------|
| `domain_events` | 00001 | **NO** | — |
| `order_exceptions` | 00001 | YES | ops.repository.ts |
| `sla_timers` | 00001 | **NO** | — |
| `kitchen_queue_entries` | 00001 | **NO** | — |
| `ledger_entries` | 00001 | YES | finance.repository.ts |
| `assignment_attempts` | 00001 | YES | delivery.repository.ts |
| `ops_override_logs` | 00001 | **NO** | — |
| `refund_cases` | 00001 | YES | finance.repository.ts |
| `payout_adjustments` | 00001 | YES | finance.repository.ts |
| `storefront_state_changes` | 00001 | **NO** | — |
| `system_alerts` | 00001 | **NO** | — |

Engine gap: 6 of 11 engine tables are unreferenced. The domain event bus, SLA timer, kitchen queue, ops override audit trail, storefront state history, and system alert tables are schema-only. The engine code declares intent to use these but does not follow through.

### Settings (2 tables)

| Table | Migration | Referenced in Code | Repository |
|-------|-----------|-------------------|------------|
| `platform_settings` | 00001 | YES | platform.repository.ts |
| `push_subscriptions` | 00001 | YES | platform.repository.ts |

Both settings tables are referenced. Push subscription storage works; push sending does not (see file 13).

---

## Repository Coverage

All 22 repositories in `packages/db/src/repositories/`:

| Repository File | Primary Tables Served |
|----------------|----------------------|
| `order.repository.ts` | orders, order_items, order_item_modifiers, order_status_history, reviews |
| `chef.repository.ts` | chef_profiles, chef_kitchens |
| `driver.repository.ts` | drivers, driver_locations |
| `storefront.repository.ts` | chef_storefronts |
| `menu.repository.ts` | menu_categories, menu_items |
| `cart.repository.ts` | carts, cart_items |
| `customer.repository.ts` | customers |
| `address.repository.ts` | customer_addresses |
| `driver-presence.repository.ts` | driver_presence |
| `delivery.repository.ts` | deliveries, delivery_events, delivery_tracking_events, assignment_attempts |
| `promo.repository.ts` | promo_codes |
| `finance.repository.ts` | ledger_entries, refund_cases, payout_adjustments, chef_payout_accounts |
| `ops.repository.ts` | order_exceptions, admin_notes |
| `platform.repository.ts` | platform_users, notifications, platform_settings, push_subscriptions |
| `support.repository.ts` | support_tickets |

Note: No repository exists for chef_documents, chef_availability, chef_delivery_zones, chef_payouts, menu_item_options, menu_item_option_values, menu_item_availability, driver_documents, driver_vehicles, driver_shifts, driver_earnings, driver_payouts, payout_runs, favorites, domain_events, sla_timers, kitchen_queue_entries, ops_override_logs, storefront_state_changes, system_alerts, or audit_logs.

---

## Unreferenced Tables (Critical)

The following 22 tables exist in the Supabase schema but have zero references in application code or repositories:

| # | Table | Domain | Feature Gap |
|---|-------|--------|-------------|
| 1 | `chef_documents` | Chef | Document upload and verification |
| 2 | `chef_availability` | Chef | Schedule/hours management |
| 3 | `chef_delivery_zones` | Chef | Delivery radius configuration |
| 4 | `chef_payouts` | Chef | Chef payout records |
| 5 | `menu_item_options` | Catalog | Item option groups |
| 6 | `menu_item_option_values` | Catalog | Specific option choices |
| 7 | `menu_item_availability` | Catalog | Per-item availability windows |
| 8 | `driver_documents` | Driver | Driver document upload/verification |
| 9 | `driver_vehicles` | Driver | Vehicle registration records |
| 10 | `driver_shifts` | Driver | Shift scheduling |
| 11 | `driver_earnings` | Driver | Earnings per delivery |
| 12 | `driver_payouts` | Driver | Driver payout records |
| 13 | `payout_runs` | Platform | Batch payout run records |
| 14 | `delivery_assignments` | Delivery | Superseded by assignment_attempts |
| 15 | `favorites` | Customer | Chef/dish favoriting |
| 16 | `domain_events` | Engine | Event sourcing bus |
| 17 | `sla_timers` | Engine | SLA deadline tracking |
| 18 | `kitchen_queue_entries` | Engine | Kitchen queue management |
| 19 | `ops_override_logs` | Engine | Ops manual override audit |
| 20 | `storefront_state_changes` | Engine | Storefront state history |
| 21 | `system_alerts` | Engine | System-level alert records |
| 22 | `audit_logs` | Platform | Application audit trail |

These tables consume schema space, have RLS policies configured, and appear in the generated types file. None produce data in the running application. They represent planned-but-unimplemented features or dead schema from prior design iterations.

---

## RPC Function Usage

8 RPC functions are defined in Supabase migrations:

| RPC Function | Defined In | Called In Code | Location |
|-------------|-----------|---------------|----------|
| `get_ops_dashboard_stats` | migration 00003 | YES | `apps/ops-admin/src/app/api/dashboard/route.ts` |
| `increment_promo_usage` | migration 00003 | YES | `packages/engine/src/orchestrators/order.orchestrator.ts` |
| `get_driver_proximity_score` | migration 00003 | NO | — |
| `get_chef_earnings_summary` | migration 00003 | NO | — |
| `get_storefront_metrics` | migration 00003 | NO | — |
| `get_platform_health_check` | migration 00003 | NO | — |
| `calculate_delivery_fee` | migration 00003 | NO | — |
| `get_active_sla_violations` | migration 00003 | NO | — |

6 of 8 RPC functions are dead code at the database layer. Their absence means:
- Driver proximity scoring falls back to approximate calculation in application code
- Chef earnings summaries are not computed server-side
- Storefront metrics are absent or approximated
- Platform health check is unused
- Delivery fee calculation is application-side only
- SLA violations are never surfaced

---

## Migration History

| Migration | File | Summary |
|-----------|------|---------|
| 00001 | `initial_schema.sql` | Full schema: all 56 tables, indexes, RLS |
| 00002 | `rls_policies.sql` | Extended RLS policy definitions |
| 00003 | `rpc_functions.sql` | 8 RPC function definitions |
| 00004 | `chef_payouts_table.sql` | Added `chef_payouts` table |
| 00005 | `driver_presence_index.sql` | Performance index on driver_presence |
| 00006 | `storefront_slugs.sql` | Unique constraint on storefront slug |
| 00007 | `order_metadata_column.sql` | Added `metadata` JSONB to orders |
| 00008 | `delivery_fee_column.sql` | Added `delivery_fee` column to deliveries |
| 00009 | `platform_fee_column.sql` | Added `platform_fee` to ledger_entries |
| 00010 | `contract_drift_repair.sql` | Backwards-compat triggers for field naming mismatches |

Migration 00010 is a workaround migration. It adds PostgreSQL triggers to map mismatched column names between what the engine writes and what the schema defines. This indicates contract drift accumulated over time between the engine code and the database schema. The triggers keep the application functional but are a maintenance liability.

---

## Generated Types Staleness

**File**: `packages/db/src/types/database.types.ts`

**Last regenerated**: After migration 00006 (estimated based on missing columns)

**Missing from generated types**:
- `orders.metadata` (added migration 00007)
- `deliveries.delivery_fee` (added migration 00008)
- `ledger_entries.platform_fee` (added migration 00009)
- All trigger functions from migration 00010

**Impact**: TypeScript code referencing these columns will not get type errors at compile time, but the columns exist and are used. Any future `db:generate` run will add these columns and may expose previously hidden type errors in callers.

**Action required**: Run `pnpm db:generate` and fix all resulting TypeScript errors before the next release.

---

## Risk Summary

| Risk | Severity | Tables Affected | Impact |
|------|----------|----------------|--------|
| 22 unreferenced tables | HIGH | See list above | Dead schema; schema drift over time |
| 6 dead RPC functions | MEDIUM | — | Database-level logic unused |
| Stale generated types | HIGH | 3 columns across 3 tables | Type safety gap; hidden bugs |
| delivery_assignments vs assignment_attempts naming conflict | MEDIUM | 2 tables | Confusing schema; potential double-write |
| Migration 00010 trigger workarounds | MEDIUM | Multiple | Tech debt; maintenance liability |
| No repository for 22 tables | HIGH | All unreferenced tables | Cannot be accessed safely through package boundary |
