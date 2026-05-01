-- ==========================================
-- CONTRACT DRIFT REPAIR MIGRATION
-- Migration: 00010_contract_drift_repair
-- Fixes: 
--   1. order_status_history: add previous_status, new_status columns (engine writes these; schema only had 'status')
--   2. driver_presence: normalize field names across code (schema has last_location_update, code uses last_location_at)
--   3. notifications: schema has 'body', some code paths insert 'message'
--   4. promo_codes: schema has starts_at/expires_at; checkout route used valid_from/valid_until
--   5. audit_logs: 00007 migration adds columns that may already exist via initial schema
--   6. delivery_events: RPC function referenced 'data' but column is 'event_data'
--   7. platform_settings: ensure base table exists for 00009 migration
--   8. drivers: add rating + total_deliveries used by get_available_drivers_near RPC
-- ==========================================

-- ==========================================
-- 1. ORDER STATUS HISTORY — Add previous_status / new_status
--    The engine orchestrator inserts {order_id, previous_status, new_status, changed_by, notes}
--    but the original schema only has {order_id, status, notes, changed_by}
--    We add the two new columns and create a backward-compat view/alias
-- ==========================================

ALTER TABLE order_status_history
  ADD COLUMN IF NOT EXISTS previous_status VARCHAR(50),
  ADD COLUMN IF NOT EXISTS new_status VARCHAR(50);

-- For backward compat: when only 'status' is provided, populate new_status from it
-- When new_status is provided, also update status so existing queries still work
CREATE OR REPLACE FUNCTION sync_order_status_history()
RETURNS TRIGGER AS $$
BEGIN
  -- If inserting with new_status but no status, copy new_status → status
  IF NEW.new_status IS NOT NULL AND (NEW.status IS NULL OR NEW.status = '') THEN
    NEW.status := NEW.new_status;
  END IF;
  -- If inserting with status but no new_status, copy status → new_status
  IF NEW.status IS NOT NULL AND NEW.new_status IS NULL THEN
    NEW.new_status := NEW.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_order_status_history_trigger ON order_status_history;
CREATE TRIGGER sync_order_status_history_trigger
  BEFORE INSERT ON order_status_history
  FOR EACH ROW EXECUTE FUNCTION sync_order_status_history();

-- ==========================================
-- 2. DRIVER PRESENCE — Normalize field names
--    Schema: last_location_update
--    Some code: last_location_at, last_updated_at, current_lat/current_lng vs last_location_lat/last_location_lng
--    Generated types: last_location_lat, last_location_lng, last_updated_at
--    Fix: add aliases so both sets of column names work via a view, and add missing columns
-- ==========================================

-- Add columns that generated types reference but may not exist
ALTER TABLE driver_presence
  ADD COLUMN IF NOT EXISTS last_location_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_location_lat DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS last_location_lng DECIMAL(11, 8),
  ADD COLUMN IF NOT EXISTS last_updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sync function: keep all field aliases consistent
CREATE OR REPLACE FUNCTION sync_driver_presence_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync current_lat/lng → last_location_lat/lng
  IF NEW.current_lat IS NOT NULL THEN
    NEW.last_location_lat := NEW.current_lat;
  END IF;
  IF NEW.current_lng IS NOT NULL THEN
    NEW.last_location_lng := NEW.current_lng;
  END IF;
  -- Sync last_location_update → last_location_at and last_updated_at
  IF NEW.last_location_update IS NOT NULL THEN
    NEW.last_location_at := NEW.last_location_update;
    NEW.last_updated_at := NEW.last_location_update;
  END IF;
  -- Sync last_location_at → last_location_update
  IF NEW.last_location_at IS NOT NULL AND NEW.last_location_update IS NULL THEN
    NEW.last_location_update := NEW.last_location_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_driver_presence_location_trigger ON driver_presence;
CREATE TRIGGER sync_driver_presence_location_trigger
  BEFORE INSERT OR UPDATE ON driver_presence
  FOR EACH ROW EXECUTE FUNCTION sync_driver_presence_location();

-- ==========================================
-- 3. NOTIFICATIONS — Add 'message' column as alias for 'body'
--    Schema: body TEXT NOT NULL
--    Engine orchestrator inserts: message TEXT
--    Fix: add message column with trigger to sync → body
-- ==========================================

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS message TEXT;

CREATE OR REPLACE FUNCTION sync_notification_body()
RETURNS TRIGGER AS $$
BEGIN
  -- If message provided but body not, copy message → body
  IF NEW.message IS NOT NULL AND (NEW.body IS NULL OR NEW.body = '') THEN
    NEW.body := NEW.message;
  END IF;
  -- If body provided but message not, copy body → message
  IF NEW.body IS NOT NULL AND NEW.message IS NULL THEN
    NEW.message := NEW.body;
  END IF;
  -- Ensure body is never null (it's NOT NULL in schema)
  IF NEW.body IS NULL THEN
    NEW.body := COALESCE(NEW.message, '');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_notification_body_trigger ON notifications;
CREATE TRIGGER sync_notification_body_trigger
  BEFORE INSERT OR UPDATE ON notifications
  FOR EACH ROW EXECUTE FUNCTION sync_notification_body();

-- ==========================================
-- 4. PROMO CODES — Add valid_from / valid_until aliases
--    Schema: starts_at, expires_at
--    Checkout route: valid_from, valid_until, max_uses, times_used
--    Fix: add alias columns + sync trigger
-- ==========================================

ALTER TABLE promo_codes
  ADD COLUMN IF NOT EXISTS valid_from TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS max_uses INTEGER,
  ADD COLUMN IF NOT EXISTS times_used INTEGER NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION sync_promo_code_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Sync starts_at ↔ valid_from
  IF NEW.starts_at IS NOT NULL AND NEW.valid_from IS NULL THEN
    NEW.valid_from := NEW.starts_at;
  ELSIF NEW.valid_from IS NOT NULL AND NEW.starts_at IS NULL THEN
    NEW.starts_at := NEW.valid_from;
  END IF;
  -- Sync expires_at ↔ valid_until
  IF NEW.expires_at IS NOT NULL AND NEW.valid_until IS NULL THEN
    NEW.valid_until := NEW.expires_at;
  ELSIF NEW.valid_until IS NOT NULL AND NEW.expires_at IS NULL THEN
    NEW.expires_at := NEW.valid_until;
  END IF;
  -- Sync usage_limit ↔ max_uses
  IF NEW.usage_limit IS NOT NULL AND NEW.max_uses IS NULL THEN
    NEW.max_uses := NEW.usage_limit;
  ELSIF NEW.max_uses IS NOT NULL AND NEW.usage_limit IS NULL THEN
    NEW.usage_limit := NEW.max_uses;
  END IF;
  -- Sync usage_count ↔ times_used
  IF NEW.usage_count IS NOT NULL THEN
    NEW.times_used := NEW.usage_count;
  ELSIF NEW.times_used IS NOT NULL THEN
    NEW.usage_count := NEW.times_used;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_promo_code_fields_trigger ON promo_codes;
CREATE TRIGGER sync_promo_code_fields_trigger
  BEFORE INSERT OR UPDATE ON promo_codes
  FOR EACH ROW EXECUTE FUNCTION sync_promo_code_fields();

-- Also fix the RPC function increment_promo_usage to update both columns
CREATE OR REPLACE FUNCTION increment_promo_usage(promo_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE promo_codes
  SET
    usage_count = COALESCE(usage_count, 0) + 1,
    times_used = COALESCE(times_used, 0) + 1,
    updated_at = NOW()
  WHERE id = promo_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION increment_promo_usage TO authenticated;

-- ==========================================
-- 5. DRIVERS — Add rating + total_deliveries
--    Used by get_available_drivers_near RPC but not in original schema
-- ==========================================

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3, 2) DEFAULT 5.00,
  ADD COLUMN IF NOT EXISTS total_deliveries INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(20),
  ADD COLUMN IF NOT EXISTS vehicle_description TEXT;

-- ==========================================
-- 6. DELIVERY_EVENTS — Fix RPC function that references 'data' instead of 'event_data'
--    The get_order_timeline RPC in 00008 queries delivery_events.data but column is event_data
-- ==========================================

CREATE OR REPLACE FUNCTION get_order_timeline(p_order_id UUID)
RETURNS TABLE (
  event_time TIMESTAMPTZ,
  event_type VARCHAR,
  event_data JSONB,
  actor_id UUID
) AS $$
BEGIN
  RETURN QUERY

  -- Order status history
  SELECT
    osh.created_at as event_time,
    'status_change'::VARCHAR as event_type,
    jsonb_build_object(
      'previous_status', osh.previous_status,
      'new_status', COALESCE(osh.new_status, osh.status),
      'notes', osh.notes
    ) as event_data,
    osh.changed_by as actor_id
  FROM order_status_history osh
  WHERE osh.order_id = p_order_id

  UNION ALL

  -- Delivery events (fix: was referencing 'data' but column is 'event_data')
  SELECT
    de.created_at as event_time,
    de.event_type,
    de.event_data as event_data,
    de.actor_id as actor_id
  FROM delivery_events de
  JOIN deliveries d ON d.id = de.delivery_id
  WHERE d.order_id = p_order_id

  UNION ALL

  -- Domain events
  SELECT
    dev.created_at as event_time,
    dev.event_type,
    dev.payload as event_data,
    dev.actor_user_id as actor_id
  FROM domain_events dev
  WHERE dev.entity_type = 'order'
    AND dev.entity_id = p_order_id

  ORDER BY event_time ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_order_timeline TO authenticated;

-- ==========================================
-- 7. PLATFORM_SETTINGS — Ensure base table exists
--    Migration 00009 does ALTER TABLE platform_settings but the table may not be created
--    This was likely in a prior migration not in the repo. Create it if missing.
-- ==========================================

CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key VARCHAR(100) NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  description TEXT,
  max_delivery_radius_km DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  platform_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 15.00,
  service_fee_percent DECIMAL(5,2) NOT NULL DEFAULT 8.00,
  hst_rate DECIMAL(5,2) NOT NULL DEFAULT 13.00,
  driver_payout_percent DECIMAL(5,2) NOT NULL DEFAULT 80.00,
  base_delivery_fee_cents INTEGER NOT NULL DEFAULT 399,
  chef_response_sla_minutes INTEGER NOT NULL DEFAULT 5,
  dispatch_timeout_minutes INTEGER NOT NULL DEFAULT 10,
  refund_window_hours INTEGER NOT NULL DEFAULT 24,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- platform_settings may already exist from 00004 without setting_key / setting_value — add first.
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS setting_key VARCHAR(100),
  ADD COLUMN IF NOT EXISTS setting_value JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS driver_payout_percent DECIMAL(5,2) DEFAULT 80.00,
  ADD COLUMN IF NOT EXISTS base_delivery_fee_cents INTEGER DEFAULT 399,
  ADD COLUMN IF NOT EXISTS chef_response_sla_minutes INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS dispatch_timeout_minutes INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS refund_window_hours INTEGER DEFAULT 24,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

UPDATE platform_settings
SET
  setting_key = COALESCE(setting_key, 'global'),
  setting_value = COALESCE(setting_value, '{}'::jsonb)
WHERE setting_key IS NULL;

-- Insert default settings if empty
INSERT INTO platform_settings (setting_key, setting_value)
SELECT 'global', '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM platform_settings WHERE setting_key = 'global');

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Platform settings readable by authenticated" ON platform_settings;
CREATE POLICY "Platform settings readable by authenticated" ON platform_settings
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Platform settings writable by ops" ON platform_settings;
CREATE POLICY "Platform settings writable by ops" ON platform_settings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_admin', 'ops_manager', 'super_admin')
      AND is_active = true
    )
  );

-- ==========================================
-- 8. AUDIT_LOGS — Ensure all columns exist
--    00007 migration adds columns but initial schema may already have them with different types
-- ==========================================

ALTER TABLE audit_logs
  ADD COLUMN IF NOT EXISTS actor_type VARCHAR(20) DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS actor_id UUID,
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS entity_id UUID,
  ADD COLUMN IF NOT EXISTS action VARCHAR(100),
  ADD COLUMN IF NOT EXISTS old_data JSONB,
  ADD COLUMN IF NOT EXISTS new_data JSONB,
  ADD COLUMN IF NOT EXISTS actor_role TEXT,
  ADD COLUMN IF NOT EXISTS reason TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB,
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

-- ==========================================
-- 9. OPS ROLE ALIGNMENT
--    platform_users.role has 'ops_admin' but engine ActorRole has 'ops_agent'/'ops_manager'
--    Fix: add ops_agent and ops_manager to the CHECK constraint 
-- ==========================================

-- Drop old constraint and add expanded one
ALTER TABLE platform_users DROP CONSTRAINT IF EXISTS platform_users_role_check;
ALTER TABLE platform_users ADD CONSTRAINT platform_users_role_check
  CHECK (role IN ('ops_admin', 'ops_agent', 'ops_manager', 'super_admin', 'support', 'finance_admin'));

-- ==========================================
-- 10. KITCHEN PHONE — chef_kitchens doesn't have phone but driver app queries it
--    driver deliveries [id] route queries: storefront.kitchen.phone, .address, .lat, .lng
--    Schema has: address_line1, address_line2, city, state, postal_code, lat, lng
--    Fix: add phone + address computed view / add address column
-- ==========================================

ALTER TABLE chef_kitchens
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20),
  ADD COLUMN IF NOT EXISTS address TEXT; -- Denormalized full address for driver display

-- Populate address from existing fields via trigger
CREATE OR REPLACE FUNCTION sync_kitchen_address()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.address IS NULL OR NEW.address = '' THEN
    NEW.address := TRIM(
      COALESCE(NEW.address_line1, '') ||
      CASE WHEN NEW.address_line2 IS NOT NULL AND NEW.address_line2 != '' 
           THEN ', ' || NEW.address_line2 ELSE '' END ||
      ', ' || COALESCE(NEW.city, '') ||
      ', ' || COALESCE(NEW.state, '') ||
      ' ' || COALESCE(NEW.postal_code, '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_kitchen_address_trigger ON chef_kitchens;
CREATE TRIGGER sync_kitchen_address_trigger
  BEFORE INSERT OR UPDATE ON chef_kitchens
  FOR EACH ROW EXECUTE FUNCTION sync_kitchen_address();

-- Backfill existing kitchens
UPDATE chef_kitchens SET address = TRIM(
  COALESCE(address_line1, '') ||
  CASE WHEN address_line2 IS NOT NULL AND address_line2 != '' 
       THEN ', ' || address_line2 ELSE '' END ||
  ', ' || COALESCE(city, '') ||
  ', ' || COALESCE(state, '') ||
  ' ' || COALESCE(postal_code, '')
) WHERE address IS NULL OR address = '';

-- ==========================================
-- 11. CHEF_STOREFRONTS — Add phone column (referenced in driver app queries)
-- ==========================================

ALTER TABLE chef_storefronts
  ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- ==========================================
-- 12. ORDER_ITEMS — Missing menu_item_name column that was referenced in OrderItem type
--    Schema has menu_item_name VARCHAR(200) -- already correct in 00001
--    But generated types don't include it. Verify it exists.
-- ==========================================

-- This is already in schema, just add index if missing
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON order_items(menu_item_id);

-- ==========================================
-- 13. DELIVERY_ASSIGNMENTS — Align with assignment_attempts
--    Schema has delivery_assignments with response IN ('accepted', 'rejected', 'expired')
--    00007 adds assignment_attempts with response IN ('pending', 'accepted', 'declined', 'expired', 'cancelled')
--    Driver app references assignment_attempts. Keep both but ensure consistency.
-- ==========================================

-- No change needed - both tables exist correctly

-- ==========================================
-- 14. ENSURE RLS ON AUDIT_LOGS
-- ==========================================

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_ops_all" ON audit_logs;
CREATE POLICY "audit_logs_ops_all" ON audit_logs
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_admin', 'ops_agent', 'ops_manager', 'finance_admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS "audit_logs_insert_all" ON audit_logs;
CREATE POLICY "audit_logs_insert_all" ON audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

