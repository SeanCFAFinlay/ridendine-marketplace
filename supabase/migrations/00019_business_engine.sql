-- ==========================================
-- PHASE 0 — Business engine schema & contract foundation
-- Ridendine ops-admin / marketplace ledger / customer-safe projection
-- Additive only: does not remove orders.status, engine_status, or working code paths.
-- ==========================================
-- Customer privacy: public_stage is the only customer-facing lifecycle projection.
-- Raw driver/chef coordinates are NOT stored in this migration; apps must never
-- broadcast coordinates on public customer channels (enforced in Phase 2+).
-- ==========================================
-- SYNC: orders_public_stage_from_engine() must match
--       packages/types/src/public-order-stage.ts → mapEngineStatusToPublicStage()
-- ==========================================

-- --------------------------------------------------------------------------
-- 1. Customer-safe projection on orders (derived from engine_status)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION orders_public_stage_from_engine(p_engine TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE COALESCE(trim(p_engine), '')
    -- Placed / payment / kitchen intake
    WHEN 'draft' THEN 'placed'
    WHEN 'checkout_pending' THEN 'placed'
    WHEN 'payment_authorized' THEN 'placed'
    WHEN 'pending' THEN 'placed'
    -- Terminal / negative paths
    WHEN 'payment_failed' THEN 'cancelled'
    WHEN 'rejected' THEN 'cancelled'
    WHEN 'cancel_requested' THEN 'cancelled'
    WHEN 'cancelled' THEN 'cancelled'
    WHEN 'failed' THEN 'cancelled'
    WHEN 'exception' THEN 'cancelled'
    -- Kitchen + dispatch up to pickup
    WHEN 'accepted' THEN 'cooking'
    WHEN 'preparing' THEN 'cooking'
    WHEN 'ready' THEN 'cooking'
    WHEN 'dispatch_pending' THEN 'cooking'
    WHEN 'driver_offered' THEN 'cooking'
    WHEN 'driver_assigned' THEN 'cooking'
    WHEN 'driver_en_route_pickup' THEN 'cooking'
    -- Courier has the order
    WHEN 'picked_up' THEN 'on_the_way'
    WHEN 'driver_en_route_dropoff' THEN 'on_the_way'
    WHEN 'driver_en_route_customer' THEN 'on_the_way'
    -- Delivered
    WHEN 'delivered' THEN 'delivered'
    WHEN 'completed' THEN 'delivered'
    -- Refunds
    WHEN 'refund_pending' THEN 'refunded'
    WHEN 'refunded' THEN 'refunded'
    WHEN 'partially_refunded' THEN 'refunded'
    ELSE 'placed'
  END;
$$;

COMMENT ON FUNCTION orders_public_stage_from_engine(TEXT) IS
  'Maps orders.engine_status → orders.public_stage (customer-safe). Keep in sync with mapEngineStatusToPublicStage() in packages/types/src/public-order-stage.ts.';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS public_stage TEXT;

UPDATE orders
SET public_stage = orders_public_stage_from_engine(engine_status)
WHERE public_stage IS NULL;

ALTER TABLE orders
  ALTER COLUMN public_stage SET NOT NULL;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_public_stage_check;
ALTER TABLE orders
  ADD CONSTRAINT orders_public_stage_check
  CHECK (public_stage IN ('placed', 'cooking', 'on_the_way', 'delivered', 'cancelled', 'refunded'));

CREATE OR REPLACE FUNCTION orders_sync_public_stage_from_engine()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.public_stage := orders_public_stage_from_engine(NEW.engine_status);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_sync_public_stage_trg ON orders;
CREATE TRIGGER orders_sync_public_stage_trg
  BEFORE INSERT OR UPDATE OF engine_status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION orders_sync_public_stage_from_engine();

COMMENT ON COLUMN orders.public_stage IS
  'Customer-safe lifecycle projection (Phase 0). Derived from engine_status; legacy orders.status is unchanged.';

CREATE INDEX IF NOT EXISTS idx_orders_public_stage_created_at
  ON orders (public_stage, created_at DESC);

-- --------------------------------------------------------------------------
-- 2. Deliveries — routing / ETA cache (populated by Phase 1 engine)
-- --------------------------------------------------------------------------

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS route_to_pickup_polyline TEXT,
  ADD COLUMN IF NOT EXISTS route_to_pickup_meters INTEGER,
  ADD COLUMN IF NOT EXISTS route_to_pickup_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS eta_pickup_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS route_to_dropoff_polyline TEXT,
  ADD COLUMN IF NOT EXISTS route_to_dropoff_meters INTEGER,
  ADD COLUMN IF NOT EXISTS route_to_dropoff_seconds INTEGER,
  ADD COLUMN IF NOT EXISTS eta_dropoff_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS route_progress_pct NUMERIC(5, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS routing_provider TEXT DEFAULT 'osrm',
  ADD COLUMN IF NOT EXISTS routing_computed_at TIMESTAMPTZ;

COMMENT ON COLUMN deliveries.route_to_dropoff_polyline IS
  'Encoded route polyline for customer progress UI (no live GPS in public payload; Phase 2).';

-- --------------------------------------------------------------------------
-- 3. platform_accounts — materialized balances (ledger-driven)
-- --------------------------------------------------------------------------
-- platform_revenue uses fixed sentinel owner UUID (not a real user).
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_type TEXT NOT NULL
    CHECK (account_type IN ('chef_payable', 'driver_payable', 'platform_revenue')),
  owner_id UUID NOT NULL,
  balance_cents BIGINT NOT NULL DEFAULT 0,
  pending_payout_cents BIGINT NOT NULL DEFAULT 0,
  lifetime_earned_cents BIGINT NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'CAD',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (account_type, owner_id)
);

COMMENT ON TABLE platform_accounts IS
  'Materialized balances from ledger_entries (Phase 0). chef_payable.owner_id is storefront_id when ledger entity_type is storefront. platform_revenue uses owner_id = 00000000-0000-0000-0000-000000000001 (sentinel).';

COMMENT ON COLUMN platform_accounts.owner_id IS
  'chef_payable: storefront or chef UUID from ledger. driver_payable: driver UUID. platform_revenue: sentinel UUID.';

-- --------------------------------------------------------------------------
-- 4. stripe_reconciliation (FK to stripe_events_processed.stripe_event_id)
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS stripe_reconciliation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL
    REFERENCES stripe_events_processed (stripe_event_id)
    ON DELETE CASCADE,
  ledger_entry_ids UUID[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'unmatched'
    CHECK (status IN ('matched', 'unmatched', 'disputed', 'manual_resolved')),
  variance_cents BIGINT NOT NULL DEFAULT 0,
  notes TEXT,
  resolved_by UUID REFERENCES platform_users (id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (stripe_event_id)
);

CREATE INDEX IF NOT EXISTS idx_stripe_reconciliation_status
  ON stripe_reconciliation (status, created_at DESC);

COMMENT ON TABLE stripe_reconciliation IS
  'Links Stripe webhook rows (stripe_events_processed) to ledger_entries for finance ops (Phase 5).';

-- --------------------------------------------------------------------------
-- 5. service_areas — marketplace geofence + per-area dispatch tuning
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS service_areas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  polygon GEOGRAPHY (POLYGON, 4326) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  surge_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 1.000,
  dispatch_radius_km NUMERIC(8, 3),
  offer_ttl_seconds INTEGER,
  max_offer_attempts INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_service_areas_polygon
  ON service_areas USING GIST (polygon);

CREATE INDEX IF NOT EXISTS idx_service_areas_active
  ON service_areas (is_active)
  WHERE is_active = true;

COMMENT ON TABLE service_areas IS
  'Operational geofences; Phase 7 UI edits polygons. Seed one default active area in this migration.';

-- Default seed polygon (Toronto bbox — replace in ops for your launch city)
INSERT INTO service_areas (name, polygon, is_active, dispatch_radius_km, offer_ttl_seconds, max_offer_attempts)
SELECT
  'Default launch area',
  ST_MakeEnvelope(-79.65, 43.58, -79.15, 43.85, 4326)::geography,
  true,
  15.0,
  90,
  3
WHERE NOT EXISTS (SELECT 1 FROM service_areas LIMIT 1);

-- --------------------------------------------------------------------------
-- 6. Drivers — instant payout opt-in (Phase 5 executes Stripe)
-- --------------------------------------------------------------------------

ALTER TABLE drivers
  ADD COLUMN IF NOT EXISTS instant_payouts_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN drivers.instant_payouts_enabled IS
  'Driver opt-in for Stripe Instant Payouts (Phase 5).';

-- --------------------------------------------------------------------------
-- 7. instant_payout_requests
-- --------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS instant_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES drivers (id) ON DELETE CASCADE,
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  fee_cents BIGINT NOT NULL CHECK (fee_cents >= 0),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'executing', 'executed', 'failed', 'cancelled')),
  stripe_payout_id TEXT,
  failure_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  executed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_instant_payout_requests_driver_status
  ON instant_payout_requests (driver_id, status);

COMMENT ON TABLE instant_payout_requests IS
  'Queued instant payout requests for drivers (Phase 5 Stripe wiring).';

-- --------------------------------------------------------------------------
-- 8. ledger_entries — idempotency for duplicate-safe inserts
-- --------------------------------------------------------------------------

ALTER TABLE ledger_entries
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ledger_entries_idempotency_key
  ON ledger_entries (idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ledger_entries_metadata_chef_id
  ON ledger_entries ((metadata ->> 'chef_id'))
  WHERE metadata ? 'chef_id';

CREATE INDEX IF NOT EXISTS idx_ledger_entries_metadata_driver_id
  ON ledger_entries ((metadata ->> 'driver_id'))
  WHERE metadata ? 'driver_id';

COMMENT ON COLUMN ledger_entries.idempotency_key IS
  'Optional dedupe key (e.g. chef_payable:order_<uuid>). Unique when set.';

-- --------------------------------------------------------------------------
-- 9. platform_accounts balance trigger (SECURITY DEFINER; ledger insert)
-- --------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION ledger_entries_touch_platform_accounts()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta BIGINT := NEW.amount_cents::bigint;
  v_currency TEXT := COALESCE(NULLIF(trim(NEW.currency), ''), 'CAD');
  v_owner UUID;
  v_platform_sentinel CONSTANT uuid := '00000000-0000-0000-0000-000000000001'::uuid;
BEGIN
  IF NEW.entry_type = 'chef_payable' AND NEW.entity_id IS NOT NULL THEN
    INSERT INTO platform_accounts (account_type, owner_id, balance_cents, pending_payout_cents, lifetime_earned_cents, currency)
    VALUES ('chef_payable', NEW.entity_id, v_delta, 0, GREATEST(v_delta, 0), v_currency)
    ON CONFLICT (account_type, owner_id) DO UPDATE SET
      balance_cents = platform_accounts.balance_cents + EXCLUDED.balance_cents,
      lifetime_earned_cents = platform_accounts.lifetime_earned_cents + GREATEST(EXCLUDED.balance_cents, 0),
      currency = EXCLUDED.currency,
      updated_at = NOW();
  ELSIF NEW.entry_type IN ('driver_payable', 'tip_payable') THEN
    v_owner := COALESCE(NEW.entity_id, (NEW.metadata ->> 'driver_id')::uuid);
    IF v_owner IS NULL THEN
      RETURN NEW;
    END IF;
    INSERT INTO platform_accounts (account_type, owner_id, balance_cents, pending_payout_cents, lifetime_earned_cents, currency)
    VALUES ('driver_payable', v_owner, v_delta, 0, GREATEST(v_delta, 0), v_currency)
    ON CONFLICT (account_type, owner_id) DO UPDATE SET
      balance_cents = platform_accounts.balance_cents + EXCLUDED.balance_cents,
      lifetime_earned_cents = platform_accounts.lifetime_earned_cents + GREATEST(EXCLUDED.balance_cents, 0),
      currency = EXCLUDED.currency,
      updated_at = NOW();
  ELSIF NEW.entry_type = 'platform_fee' THEN
    INSERT INTO platform_accounts (account_type, owner_id, balance_cents, pending_payout_cents, lifetime_earned_cents, currency)
    VALUES ('platform_revenue', v_platform_sentinel, v_delta, 0, GREATEST(v_delta, 0), v_currency)
    ON CONFLICT (account_type, owner_id) DO UPDATE SET
      balance_cents = platform_accounts.balance_cents + EXCLUDED.balance_cents,
      lifetime_earned_cents = platform_accounts.lifetime_earned_cents + GREATEST(EXCLUDED.balance_cents, 0),
      currency = EXCLUDED.currency,
      updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ledger_entries_touch_platform_accounts_trg ON ledger_entries;
CREATE TRIGGER ledger_entries_touch_platform_accounts_trg
  AFTER INSERT ON ledger_entries
  FOR EACH ROW
  EXECUTE FUNCTION ledger_entries_touch_platform_accounts();

-- --------------------------------------------------------------------------
-- 10. RLS (pattern: platform_users EXISTS, mirror ledger / finance access)
-- --------------------------------------------------------------------------

ALTER TABLE platform_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stripe_reconciliation ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE instant_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY platform_accounts_finance_ops_select
  ON platform_accounts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.user_id = auth.uid()
        AND pu.is_active = true
        AND pu.role IN (
          'ops_admin', 'ops_agent', 'ops_manager',
          'finance_admin', 'finance_manager', 'super_admin'
        )
    )
  );

CREATE POLICY stripe_reconciliation_finance_ops_select
  ON stripe_reconciliation
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.user_id = auth.uid()
        AND pu.is_active = true
        AND pu.role IN (
          'ops_admin', 'ops_agent', 'ops_manager',
          'finance_admin', 'finance_manager', 'super_admin'
        )
    )
  );

CREATE POLICY stripe_reconciliation_finance_ops_update
  ON stripe_reconciliation
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.user_id = auth.uid()
        AND pu.is_active = true
        AND pu.role IN ('finance_admin', 'finance_manager', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.user_id = auth.uid()
        AND pu.is_active = true
        AND pu.role IN ('finance_admin', 'finance_manager', 'super_admin')
    )
  );

CREATE POLICY stripe_reconciliation_finance_ops_insert
  ON stripe_reconciliation
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.user_id = auth.uid()
        AND pu.is_active = true
        AND pu.role IN ('finance_admin', 'finance_manager', 'super_admin')
    )
  );

CREATE POLICY service_areas_select_authenticated
  ON service_areas
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY service_areas_ops_write
  ON service_areas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.user_id = auth.uid()
        AND pu.is_active = true
        AND pu.role IN ('ops_admin', 'ops_manager', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.user_id = auth.uid()
        AND pu.is_active = true
        AND pu.role IN ('ops_admin', 'ops_manager', 'super_admin')
    )
  );

CREATE POLICY instant_payout_requests_driver_select
  ON instant_payout_requests
  FOR SELECT
  TO authenticated
  USING (
    driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid())
  );

CREATE POLICY instant_payout_requests_driver_insert
  ON instant_payout_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    driver_id IN (SELECT d.id FROM drivers d WHERE d.user_id = auth.uid())
  );

CREATE POLICY instant_payout_requests_ops_finance_all
  ON instant_payout_requests
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.user_id = auth.uid()
        AND pu.is_active = true
        AND pu.role IN (
          'ops_admin', 'ops_agent', 'ops_manager',
          'finance_admin', 'finance_manager', 'super_admin'
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM platform_users pu
      WHERE pu.user_id = auth.uid()
        AND pu.is_active = true
        AND pu.role IN (
          'ops_admin', 'ops_agent', 'ops_manager',
          'finance_admin', 'finance_manager', 'super_admin'
        )
    )
  );
