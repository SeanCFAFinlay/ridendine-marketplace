# Database Type Regeneration Guide

## Status: BLOCKED — Requires Running Supabase Instance

The generated types file at `packages/db/src/generated/database.types.ts` is **stale**. It contains 28 tables but the schema now has 56+ tables after migrations 00007–00010.

## How to Regenerate

### Option A: Local Supabase (recommended)

```bash
# Start local Supabase (requires Docker)
npx supabase start

# Apply all migrations
npx supabase db reset

# Regenerate types
pnpm db:generate
```

### Option B: Remote Supabase

```bash
# Link to your remote project
npx supabase link --project-ref YOUR_PROJECT_REF

# Regenerate types from remote schema
npx supabase gen types typescript --linked > packages/db/src/generated/database.types.ts
```

## What Changes

After regeneration, `database.types.ts` will include types for all tables added in migrations 00007–00010:

- `domain_events`
- `order_exceptions`
- `sla_timers`
- `kitchen_queue_entries`
- `ledger_entries`
- `assignment_attempts`
- `ops_override_logs`
- `refund_cases`
- `payout_adjustments`
- `storefront_state_changes`
- `system_alerts`
- `platform_settings` (full schema)
- `push_subscriptions`
- `chef_payouts`

It will also include new columns added to existing tables:
- `orders.engine_status`, `orders.rejection_reason`, etc.
- `chef_storefronts.storefront_state`, `chef_storefronts.is_paused`, etc.
- `drivers.rating`, `drivers.total_deliveries`
- `driver_presence.last_location_at`, `driver_presence.last_location_lat/lng`
- `menu_items.is_sold_out`, `menu_items.daily_limit`

## Why It Matters

Without regenerated types:
- Repositories accessing engine tables (finance, ops, support) lack type safety
- New columns on existing tables cause `as any` casts
- IDE autocompletion is incomplete for 28 tables

## After Regeneration

1. Run `pnpm typecheck` to verify no type errors
2. Remove any `as any` casts that were workarounds for missing types
3. Commit the regenerated file
