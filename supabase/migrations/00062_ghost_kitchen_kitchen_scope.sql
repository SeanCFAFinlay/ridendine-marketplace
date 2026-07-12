-- ==========================================
-- GHOST-KITCHEN RE-SCOPE (forward-only)
-- 00062_ghost_kitchen_kitchen_scope.sql
--
-- The Kitchen OS tables (00054-00060) were ALREADY applied to production with
-- storefront_id scope, so the re-scope is a FORWARD migration that ALTERs the
-- live tables instead of editing history. Shared-ops tables move to kitchen_id
-- (commissary pool); labour cost-attribution tables become dual-scope;
-- storefront_id is kept but made nullable (routes now write kitchen_id only).
-- Idempotent + transactional. Also folds in pay_periods (Phase D.1).
-- ==========================================

-- Operator-ownership predicate (kitchen-level mirror of is_chef_of_storefront).
CREATE OR REPLACE FUNCTION public.is_operator_of_kitchen(k_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chef_kitchens ck
    JOIN chef_profiles cp ON cp.id = ck.chef_id
    WHERE ck.id = k_id AND cp.user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------------
-- 1) Fully re-scoped tables: add kitchen_id (backfill from storefront's
--    kitchen), enforce NOT NULL + FK, relax storefront_id to nullable.
-- ------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'storage_locations','inventory_items','inventory_stock_movements','inventory_counts',
    'inventory_waste_events','inventory_alerts','suppliers','supplier_items','purchase_orders',
    'receiving_batches','supplier_price_history','prep_tasks','prep_task_events',
    'production_batches','kitchen_staff','kitchen_shifts','time_entries',
    'kitchen_station_assignments','kitchen_stations'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS kitchen_id UUID', t);
    EXECUTE format('UPDATE %I x SET kitchen_id = cs.kitchen_id FROM chef_storefronts cs WHERE cs.id = x.storefront_id AND x.kitchen_id IS NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN kitchen_id SET NOT NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN storefront_id DROP NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(kitchen_id)', 'idx_'||t||'_kitchen', t);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t||'_kitchen_fk') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (kitchen_id) REFERENCES chef_kitchens(id) ON DELETE CASCADE', t, t||'_kitchen_fk');
    END IF;
  END LOOP;
END $$;

-- 1a) Unique (kitchen_id, name) where the table had unique (storefront_id, name).
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['storage_locations','inventory_items','suppliers','kitchen_stations']
  LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_'||t||'_kitchen_name') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I UNIQUE (kitchen_id, name)', 'uq_'||t||'_kitchen_name', t);
    END IF;
  END LOOP;
END $$;

-- 1b) inventory_stock_movements: brand-attribution + idempotency for auto-decrement.
ALTER TABLE inventory_stock_movements ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}';
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_movements_consume_order
  ON inventory_stock_movements ((metadata->>'order_id'), inventory_item_id)
  WHERE movement_type = 'consume_order';

-- ------------------------------------------------------------------
-- 2) Dual-scope: keep storefront_id (brand target), add kitchen_id (owner/RLS).
-- ------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['labor_allocations','labor_cost_snapshots']
  LOOP
    EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS kitchen_id UUID', t);
    EXECUTE format('UPDATE %I x SET kitchen_id = cs.kitchen_id FROM chef_storefronts cs WHERE cs.id = x.storefront_id AND x.kitchen_id IS NULL', t);
    EXECUTE format('ALTER TABLE %I ALTER COLUMN kitchen_id SET NOT NULL', t);
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON %I(kitchen_id)', 'idx_'||t||'_kitchen', t);
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = t||'_kitchen_fk') THEN
      EXECUTE format('ALTER TABLE %I ADD CONSTRAINT %I FOREIGN KEY (kitchen_id) REFERENCES chef_kitchens(id) ON DELETE CASCADE', t, t||'_kitchen_fk');
    END IF;
  END LOOP;
END $$;

-- ------------------------------------------------------------------
-- 3) RLS: swap chef->operator (manage) policies to is_operator_of_kitchen.
--    ops_read_* and service_role_* policies are unchanged (no scope column ref).
-- ------------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('storage_locations','chef_manage_own_storage_locations'),
    ('inventory_items','chef_manage_own_inventory_items'),
    ('inventory_counts','chef_manage_own_inventory_counts'),
    ('inventory_waste_events','chef_manage_own_inventory_waste'),
    ('inventory_alerts','chef_manage_own_inventory_alerts'),
    ('suppliers','chef_manage_own_suppliers'),
    ('supplier_items','chef_manage_own_supplier_items'),
    ('purchase_orders','chef_manage_own_purchase_orders'),
    ('receiving_batches','chef_manage_own_receiving_batches'),
    ('prep_tasks','chef_manage_own_prep_tasks'),
    ('production_batches','chef_manage_own_production_batches'),
    ('kitchen_staff','chef_manage_own_kitchen_staff'),
    ('kitchen_shifts','chef_manage_own_kitchen_shifts'),
    ('time_entries','chef_manage_own_time_entries'),
    ('kitchen_station_assignments','chef_manage_own_station_assignments'),
    ('kitchen_stations','chef_manage_own_kitchen_stations'),
    ('labor_allocations','chef_manage_own_labor_allocations'),
    ('labor_cost_snapshots','chef_manage_own_labor_cost_snapshots')
  ) AS x(tbl, oldpol)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.oldpol, r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'operator_manage_'||r.tbl, r.tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO authenticated USING (public.is_operator_of_kitchen(kitchen_id))', 'operator_manage_'||r.tbl, r.tbl);
  END LOOP;
END $$;

-- 3a) Read-only ledgers: chef_read_own -> operator_read (SELECT).
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM (VALUES
    ('inventory_stock_movements','chef_read_own_inventory_movements'),
    ('supplier_price_history','chef_read_own_supplier_price_history'),
    ('prep_task_events','chef_read_own_prep_task_events')
  ) AS x(tbl, oldpol)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.oldpol, r.tbl);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', 'operator_read_'||r.tbl, r.tbl);
    EXECUTE format('CREATE POLICY %I ON %I FOR SELECT TO authenticated USING (public.is_operator_of_kitchen(kitchen_id))', 'operator_read_'||r.tbl, r.tbl);
  END LOOP;
END $$;

-- 3b) Parent-scoped child tables: reach kitchen_id through the parent.
DROP POLICY IF EXISTS "chef_manage_own_inventory_count_lines" ON inventory_count_lines;
DROP POLICY IF EXISTS "operator_manage_inventory_count_lines" ON inventory_count_lines;
CREATE POLICY "operator_manage_inventory_count_lines" ON inventory_count_lines FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen((SELECT ic.kitchen_id FROM inventory_counts ic WHERE ic.id = inventory_count_lines.count_id)));

DROP POLICY IF EXISTS "chef_manage_own_purchase_order_lines" ON purchase_order_lines;
DROP POLICY IF EXISTS "operator_manage_purchase_order_lines" ON purchase_order_lines;
CREATE POLICY "operator_manage_purchase_order_lines" ON purchase_order_lines FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen((SELECT po.kitchen_id FROM purchase_orders po WHERE po.id = purchase_order_lines.purchase_order_id)));

DROP POLICY IF EXISTS "chef_manage_own_production_batch_inputs" ON production_batch_inputs;
DROP POLICY IF EXISTS "operator_manage_production_batch_inputs" ON production_batch_inputs;
CREATE POLICY "operator_manage_production_batch_inputs" ON production_batch_inputs FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen((SELECT pb.kitchen_id FROM production_batches pb WHERE pb.id = production_batch_inputs.batch_id)));

DROP POLICY IF EXISTS "chef_manage_own_production_batch_outputs" ON production_batch_outputs;
DROP POLICY IF EXISTS "operator_manage_production_batch_outputs" ON production_batch_outputs;
CREATE POLICY "operator_manage_production_batch_outputs" ON production_batch_outputs FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen((SELECT pb.kitchen_id FROM production_batches pb WHERE pb.id = production_batch_outputs.batch_id)));

-- ------------------------------------------------------------------
-- 4) pay_periods (Phase D.1) + freeze trigger.
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pay_periods (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id   UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  starts_on    DATE NOT NULL,
  ends_on      DATE NOT NULL,
  status       TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'exported')),
  locked_at    TIMESTAMPTZ,
  locked_by    UUID,
  exported_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (ends_on >= starts_on)
);
CREATE INDEX IF NOT EXISTS idx_pay_periods_kitchen ON pay_periods(kitchen_id, starts_on);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pay_periods_kitchen_range ON pay_periods(kitchen_id, starts_on, ends_on);

DROP TRIGGER IF EXISTS update_pay_periods_updated_at ON pay_periods;
CREATE TRIGGER update_pay_periods_updated_at BEFORE UPDATE ON pay_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION public.block_locked_time_entry_edits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pay_periods pp
    WHERE pp.kitchen_id = OLD.kitchen_id
      AND pp.status IN ('locked', 'exported')
      AND OLD.clock_in::date BETWEEN pp.starts_on AND pp.ends_on
  ) THEN
    RAISE EXCEPTION 'time entry falls in a locked pay period and cannot be modified';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_block_locked_time_entries ON time_entries;
CREATE TRIGGER trg_block_locked_time_entries
  BEFORE UPDATE OR DELETE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION public.block_locked_time_entry_edits();

ALTER TABLE pay_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "operator_manage_pay_periods" ON pay_periods;
CREATE POLICY "operator_manage_pay_periods" ON pay_periods FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_pay_periods" ON pay_periods;
CREATE POLICY "ops_read_pay_periods" ON pay_periods FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_pay_periods" ON pay_periods;
CREATE POLICY "service_role_pay_periods" ON pay_periods FOR ALL TO service_role
  USING (true) WITH CHECK (true);
