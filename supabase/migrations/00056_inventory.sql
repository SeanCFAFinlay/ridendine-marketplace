-- ==========================================
-- INVENTORY (Stage 7)
-- 00056_inventory.sql
--
-- Additive only. Stock tracking with a MOVEMENT LEDGER as the source of truth.
-- inventory_items.current_quantity is a cache; inventory_stock_movements is the
-- authoritative history (on-hand = sum of movement quantities).
--
-- RLS mirrors 00054/00055: chef -> own storefront (via is_chef_of_storefront);
-- ops -> read-only; service_role -> full; customers/drivers -> denied.
-- ==========================================

-- ------------------------------------------------------------------
-- storage_locations
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS storage_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  type          TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('fridge', 'freezer', 'dry', 'other')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (storefront_id, name)
);
CREATE INDEX IF NOT EXISTS idx_storage_locations_storefront ON storage_locations(storefront_id);

-- ------------------------------------------------------------------
-- inventory_items (current_quantity is a CACHE; ledger is the truth)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id       UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
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
  UNIQUE (storefront_id, name)
);
CREATE INDEX IF NOT EXISTS idx_inventory_items_storefront ON inventory_items(storefront_id);
CREATE INDEX IF NOT EXISTS idx_inventory_items_active ON inventory_items(storefront_id, is_active);

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
  storefront_id     UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  movement_type     TEXT NOT NULL CHECK (movement_type IN (
                      'receive', 'consume_order', 'consume_batch', 'waste',
                      'adjustment', 'count_correction', 'transfer', 'return'
                    )),
  quantity          NUMERIC(14, 4) NOT NULL, -- signed: + adds stock, - removes
  unit_cost         NUMERIC(12, 4),
  reference_type    TEXT,
  reference_id      UUID,
  note              TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_item ON inventory_stock_movements(inventory_item_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_movements_storefront ON inventory_stock_movements(storefront_id, created_at);

-- ------------------------------------------------------------------
-- inventory_counts / inventory_count_lines
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_counts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'completed', 'cancelled')),
  counted_by    UUID,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_inventory_counts_storefront ON inventory_counts(storefront_id, created_at);

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
  storefront_id     UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  quantity          NUMERIC(14, 4) NOT NULL,
  reason            TEXT,
  cost_value        NUMERIC(12, 4),
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_waste_storefront ON inventory_waste_events(storefront_id, created_at);
CREATE INDEX IF NOT EXISTS idx_inventory_waste_item ON inventory_waste_events(inventory_item_id, created_at);

-- ------------------------------------------------------------------
-- inventory_alerts
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id     UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  alert_type        TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'stockout', 'expiring_soon', 'expired')),
  status            TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  detail            JSONB NOT NULL DEFAULT '{}',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at       TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_inventory_alerts_storefront ON inventory_alerts(storefront_id, status);
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
CREATE POLICY "chef_manage_own_storage_locations" ON storage_locations FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_storage_locations" ON storage_locations;
CREATE POLICY "ops_read_storage_locations" ON storage_locations FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_storage_locations" ON storage_locations;
CREATE POLICY "service_role_storage_locations" ON storage_locations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_items
DROP POLICY IF EXISTS "chef_manage_own_inventory_items" ON inventory_items;
CREATE POLICY "chef_manage_own_inventory_items" ON inventory_items FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_inventory_items" ON inventory_items;
CREATE POLICY "ops_read_inventory_items" ON inventory_items FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_items" ON inventory_items;
CREATE POLICY "service_role_inventory_items" ON inventory_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_stock_movements (chef read-only; movements are an audit ledger)
DROP POLICY IF EXISTS "chef_read_own_inventory_movements" ON inventory_stock_movements;
CREATE POLICY "chef_read_own_inventory_movements" ON inventory_stock_movements FOR SELECT TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_inventory_movements" ON inventory_stock_movements;
CREATE POLICY "ops_read_inventory_movements" ON inventory_stock_movements FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_movements" ON inventory_stock_movements;
CREATE POLICY "service_role_inventory_movements" ON inventory_stock_movements FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_counts
DROP POLICY IF EXISTS "chef_manage_own_inventory_counts" ON inventory_counts;
CREATE POLICY "chef_manage_own_inventory_counts" ON inventory_counts FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_inventory_counts" ON inventory_counts;
CREATE POLICY "ops_read_inventory_counts" ON inventory_counts FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_counts" ON inventory_counts;
CREATE POLICY "service_role_inventory_counts" ON inventory_counts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_count_lines (scope via parent count)
DROP POLICY IF EXISTS "chef_manage_own_inventory_count_lines" ON inventory_count_lines;
CREATE POLICY "chef_manage_own_inventory_count_lines" ON inventory_count_lines FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(
    (SELECT ic.storefront_id FROM inventory_counts ic WHERE ic.id = inventory_count_lines.count_id)
  ));
DROP POLICY IF EXISTS "ops_read_inventory_count_lines" ON inventory_count_lines;
CREATE POLICY "ops_read_inventory_count_lines" ON inventory_count_lines FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_count_lines" ON inventory_count_lines;
CREATE POLICY "service_role_inventory_count_lines" ON inventory_count_lines FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_waste_events
DROP POLICY IF EXISTS "chef_manage_own_inventory_waste" ON inventory_waste_events;
CREATE POLICY "chef_manage_own_inventory_waste" ON inventory_waste_events FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_inventory_waste" ON inventory_waste_events;
CREATE POLICY "ops_read_inventory_waste" ON inventory_waste_events FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_waste" ON inventory_waste_events;
CREATE POLICY "service_role_inventory_waste" ON inventory_waste_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- inventory_alerts
DROP POLICY IF EXISTS "chef_manage_own_inventory_alerts" ON inventory_alerts;
CREATE POLICY "chef_manage_own_inventory_alerts" ON inventory_alerts FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_inventory_alerts" ON inventory_alerts;
CREATE POLICY "ops_read_inventory_alerts" ON inventory_alerts FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_inventory_alerts" ON inventory_alerts;
CREATE POLICY "service_role_inventory_alerts" ON inventory_alerts FOR ALL TO service_role
  USING (true) WITH CHECK (true);
