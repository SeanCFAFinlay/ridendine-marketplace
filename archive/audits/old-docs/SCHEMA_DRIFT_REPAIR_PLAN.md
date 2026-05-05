# Schema Drift Repair Plan

## Overview

FND-002 and FND-003 identify tables defined in multiple migrations with conflicting schemas. These are mitigated at runtime by `CREATE TABLE IF NOT EXISTS` but represent maintenance hazards.

## Affected Tables

### 1. `promo_codes`
- **Migration 00001:** `code VARCHAR(50)`, `discount_value DECIMAL`, `min_order_amount DECIMAL`, `usage_limit INTEGER`, `usage_count INTEGER`, `starts_at TIMESTAMPTZ`, `expires_at TIMESTAMPTZ`
- **Migration 00004:** `code TEXT`, `discount_value DECIMAL`, `min_order_amount DECIMAL DEFAULT 0`, `max_uses INTEGER`, `used_count INTEGER`, `expires_at TIMESTAMPTZ`
- **Migration 00010:** Adds `valid_from`, `valid_until`, `max_uses`, `times_used` with sync trigger

**Status:** Working at runtime. The 00001 definition wins (created first). Later migrations add columns via ALTER TABLE IF NOT EXISTS. The sync trigger in 00010 bridges all field name aliases.

**Action:** Document canonical column set. No destructive changes needed.

### 2. `driver_locations`
- **Migration 00001:** Full schema with `accuracy`, `heading`, `speed`, `shift_id`, `recorded_at`
- **Migration 00004:** Simpler version with just `driver_id`, `lat`, `lng`, `recorded_at`, `created_at`

**Status:** 00001 wins. 00004 is a no-op due to IF NOT EXISTS.

**Action:** No repair needed. Remove 00004's duplicate definition in next schema cleanup.

### 3. `chef_payout_accounts`
- **Migration 00001:** `stripe_account_id VARCHAR(255)`, `is_verified BOOLEAN`
- **Migration 00004:** `stripe_account_id TEXT`, `stripe_account_status TEXT`, `payout_enabled BOOLEAN`

**Status:** 00001 wins. 00004 adds extra columns that don't exist because IF NOT EXISTS skips the CREATE.

**Action:** Add an additive migration to add the missing columns from 00004's definition.

### 4. `platform_settings` (FND-003)
- **Migration 00004:** Single-row table with fee percentages, HST rate, delivery config
- **Migration 00009:** ALTER TABLE adding dispatch/SLA/throttle columns
- **Migration 00010:** CREATE TABLE IF NOT EXISTS with `setting_key`/`setting_value` JSONB columns (different schema!)

**Status:** Depends on migration order. If 00004 runs first (it does), the table has the single-row format. 00010's CREATE TABLE IF NOT EXISTS is a no-op. But 00010 also does INSERT with `setting_key` column which may fail if that column doesn't exist.

**Action:** This is the highest-risk drift. Needs verification:
1. Check if `setting_key` column exists in production
2. If not, the INSERT in 00010 silently fails (which is OK — the platform uses the single-row format)
3. Add migration to explicitly add `setting_key` column if missing

## Recommended Additive Migration

Create `supabase/migrations/00011_schema_drift_cleanup.sql`:

```sql
-- Schema drift cleanup (FND-002, FND-003)
-- Adds missing columns from conflicting migration definitions
-- All changes are additive — no data loss

-- chef_payout_accounts: add columns from 00004 that were skipped
ALTER TABLE chef_payout_accounts
  ADD COLUMN IF NOT EXISTS stripe_account_status TEXT DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_enabled BOOLEAN DEFAULT FALSE;

-- platform_settings: ensure setting_key exists for 00010 compatibility
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS setting_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS setting_value JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS description TEXT;

-- Create unique index on setting_key if it doesn't exist
-- (safe even if column was just added — it will be all NULLs)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'platform_settings_setting_key_key'
  ) THEN
    CREATE UNIQUE INDEX platform_settings_setting_key_key ON platform_settings(setting_key)
      WHERE setting_key IS NOT NULL;
  END IF;
END $$;
```

## Manual Verification Required

Before applying the migration:
1. Connect to the Supabase database
2. Run: `SELECT column_name FROM information_schema.columns WHERE table_name = 'platform_settings' ORDER BY ordinal_position;`
3. Verify which columns exist
4. If `setting_key` already exists, the migration is safe to apply
5. If it doesn't, the migration will add it

## Status
- **Risk level:** Low (all changes are additive with IF NOT EXISTS)
- **Data loss potential:** None
- **Recommended:** Apply in next deployment after manual DB inspection
