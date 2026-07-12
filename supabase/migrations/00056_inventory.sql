-- ==========================================
-- INVENTORY (Stage 7)
-- 00056_inventory.sql
--
-- Additive only. Stock tracking with a MOVEMENT LEDGER as the source of truth.
-- inventory_items.current_quantity is a cache; inventory_stock_movements is the
-- authoritative history (on-hand = sum of movement quantities).
--
-- GHOST-KITCHEN SCOPE: inventory is a SHARED pool owned by the commissary
-- kitchen (chef_kitchens), not a single brand storefront. Rows scope by
-- kitchen_id so every brand under a kitchen draws from one pool. Per-brand
-- attribution (which brand's order consumed stock) travels on the movement's
-- metadata, never by splitting the pool.
--
-- RLS: operator -> own kitchen (via is_operator_of_kitchen); ops -> read-only;
-- service_role -> full; customers/drivers -> denied.
-- ==========================================

-- ------------------------------------------------------------------
-- storage_locations
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS storage_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id    UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('fridge', 'freezer', 'dry', 'other')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kitchen_id, name)
);
CREATE INDEX IF NOT EXISTS idx_storage_locations_kitchen ON storage_locations(kitchen_id);

-- ------------------------------------------------------------------
-- inventory_items (current_quantity is a CACHE; ledger is the truth)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id          UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  category            TEXT,
  unit                TEXT NOT NULL DEFAULT 'unit',
  current_quantity    NUMERIC(14, 4) NOT NULL DEFAULT 0,
  par_quantity        NUMERIC(14, 4),
  reorder_point       NUMERIC(14, 4),
  cost_per_unit       NUMERIC(12, 4) NOT NULL DEFAULT 0,
  preferred_supplier_id UUID, -- FK added in the supplier stage
  storage_location_id UUID REFERENCES storage_locations(id) ON DELETE SET NULL,
  expiry_date         DATE,
  lot_code            TEXT,
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kitchen_id, name)
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_kitchen ON inventory_items(kitchen_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(kitchen_id, is_active);

-- Now that inventory_items exists, wire the deferred FK from 00055.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'recipe_ingredients_inventory_item_fk'
  ) THEN
    ALTER TABLE recipe_ingredients
      ADD CONSTRAINT recipe_ingredients_inventory_item_fk
      FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ------------------------------------------------------------------
-- inventory_stock_movements (signed quantity ledger; source of truth)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_stock_movements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id        UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type     TEXT NOT NULL CHECK (movement_type IN (
                      'receive', 'consume_order', 'consume_batch', 'waste',
                      'adjustment', 'count_correction', 'transfer', 'return'
                    )),
  quantity          NUMERIC(14, 4) NOT NULL, -- signed: + adds stock, - removes
  unit_cost         NUMERIC(12, 4),
  reference_type    TEXT,
  reference_id      UUID,
  -- Brand attribution + idempotency for shared-pool auto-decrement (Phase B):
  -- a consume_order movement carries { order_id, storefront_id } so on-hand stays
  -- kitchen-wide while usage/cost can be attributed to the brand whose order
  -- consumed it. Completing the same order twice is a no-op: skip when a movement
  -- with metadata->>'order_id' already exists (see idx_inventory_movements_order).
  metadata          JSONB NOT NULL DEFAULT '{}',
  note              TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_stock_movements(inventory_item_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_kitchen ON inventory_stock_movements(kitchen_id, created_at);
-- One consume_order movement per (order, item): the DB backstop that makes
-- shared-pool auto-decrement idempotent even under a duplicate order.completed
-- (the writer aggregates to one movement per item, so this never false-conflicts).
-- Also serves the "has this order already decremented?" lookup.
CREATE UNIQUE INDEX IF NOT EXISTS uq_inventory_movements_consume_order
  ON inventory_stock_movements ((metadata->>'order_id'), inventory_item_id)
  WHERE movement_type = 'consume_order';

-- ------------------------------------------------------------------
-- inventory_counts / inventory_count_lines
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_counts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id    UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  counted_by    UUID,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_kitchen ON inventory_counts(kitchen_id, created_at);

CREATE TABLE IF NOT EXISTS inventory_count_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id          UUID NOT NULL REFERENCES inventory_counts(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  counted_quantity  NUMERIC(14, 4) NOT NULL,
  system_quantity   NUMERIC(14, 4),
  variance          NUMERIC(14, 4),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_count_lines_count ON inventory_count_lines(count_id);

-- ------------------------------------------------------------------
-- inventory_waste_events
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_waste_events (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id        UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity          NUMERIC(14, 4) NOT NULL,
  reason            TEXT,
  cost_value        NUMERIC(12, 4),
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_waste_kitchen ON inventory_waste_events(kitchen_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_waste_item ON inventory_waste_events(inventory_item_id, created_at);

-- ------------------------------------------------------------------
-- inventory_alerts
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id        UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  alert_type        TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'stockout', 'expiring_soon', 'expired')),
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  detail            JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_kitchen ON inventory_alerts(kitchen_id, status);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_item ON inventory_alerts(inventory_item_id);

-- ==========================================
-- updated_at triggers (shared function from 00001)
-- ==========================================
DROP TRIGGER IF EXISTS update_storage_locations_updated_at ON storage_locations;
CREATE TRIGGER update_storage_locations_updated_at BEFORE UPDATE ON storage_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_inventory_items_updated_at ON inventory_items;
CREATE TRIGGER update_inventory_items_updated_at BEFORE UPDATE ON inventory_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE storage_locations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_counts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_count_lines     ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_waste_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_alerts          ENABLE ROW LEVEL SECURITY;

-- storage_locations
DROP POLICY IF EXISTS "chef_manage_own_storage_locations" ON storage_locations;
DROP POLICY IF EXISTS "operator_manage_storage_locations" ON storage_locations;
CREATE POLICY "operator_manage_storage_locations" ON storage_locations FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_storage_locations" ON storage_locations;
CREATE POLICY "ops_read_storage_locations" ON storage_locations FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_storage_locations" ON storage_locations;
CREATE POLICY "service_role_storage_locations" ON storage_locations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_items
DROP POLICY IF EXISTS "chef_manage_own_inventory_items" ON inventory_items;
DROP POLICY IF EXISTS "operator_manage_inventory_items" ON inventory_items;
CREATE POLICY "operator_manage_inventory_items" ON inventory_items FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_inventory_items" ON inventory_items;
CREATE POLICY "ops_read_inventory_items" ON inventory_items FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_items" ON inventory_items;
CREATE POLICY "service_role_inventory_items" ON inventory_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_stock_movements (operator read-only; movements are an audit ledger)
DROP POLICY IF EXISTS "chef_read_own_inventory_movements" ON inventory_stock_movements;
DROP POLICY IF EXISTS "operator_read_inventory_movements" ON inventory_stock_movements;
CREATE POLICY "operator_read_inventory_movements" ON inventory_stock_movements FOR SELECT TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_inventory_movements" ON inventory_stock_movements;
CREATE POLICY "ops_read_inventory_movements" ON inventory_stock_movements FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_movements" ON inventory_stock_movements;
CREATE POLICY "service_role_inventory_movements" ON inventory_stock_movements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_counts
DROP POLICY IF EXISTS "chef_manage_own_inventory_counts" ON inventory_counts;
DROP POLICY IF EXISTS "operator_manage_inventory_counts" ON inventory_counts;
CREATE POLICY "operator_manage_inventory_counts" ON inventory_counts FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_inventory_counts" ON inventory_counts;
CREATE POLICY "ops_read_inventory_counts" ON inventory_counts FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_counts" ON inventory_counts;
CREATE POLICY "service_role_inventory_counts" ON inventory_counts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_count_lines (scope via parent count's kitchen_id)
DROP POLICY IF EXISTS "chef_manage_own_inventory_count_lines" ON inventory_count_lines;
DROP POLICY IF EXISTS "operator_manage_inventory_count_lines" ON inventory_count_lines;
CREATE POLICY "operator_manage_inventory_count_lines" ON inventory_count_lines FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(
    (SELECT ic.kitchen_id FROM inventory_counts ic WHERE ic.id = inventory_count_lines.count_id)
  ));
DROP POLICY IF EXISTS "ops_read_inventory_count_lines" ON inventory_count_lines;
CREATE POLICY "ops_read_inventory_count_lines" ON inventory_count_lines FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_count_lines" ON inventory_count_lines;
CREATE POLICY "service_role_inventory_count_lines" ON inventory_count_lines FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_waste_events
DROP POLICY IF EXISTS "chef_manage_own_inventory_waste" ON inventory_waste_events;
DROP POLICY IF EXISTS "operator_manage_inventory_waste" ON inventory_waste_events;
CREATE POLICY "operator_manage_inventory_waste" ON inventory_waste_events FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_inventory_waste" ON inventory_waste_events;
CREATE POLICY "ops_read_inventory_waste" ON inventory_waste_events FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_waste" ON inventory_waste_events;
CREATE POLICY "service_role_inventory_waste" ON inventory_waste_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_alerts
DROP POLICY IF EXISTS "chef_manage_own_inventory_alerts" ON inventory_alerts;
DROP POLICY IF EXISTS "operator_manage_inventory_alerts" ON inventory_alerts;
CREATE POLICY "operator_manage_inventory_alerts" ON inventory_alerts FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_inventory_alerts" ON inventory_alerts;
CREATE POLICY "ops_read_inventory_alerts" ON inventory_alerts FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_alerts" ON inventory_alerts;
CREATE POLICY "service_role_inventory_alerts" ON inventory_alerts FOR ALL TO service_role
  USING (true) WITH CHECK (true);
