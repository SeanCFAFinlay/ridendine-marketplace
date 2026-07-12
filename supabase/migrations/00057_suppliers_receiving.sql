-- ==========================================
-- SUPPLIERS & RECEIVING (Stage 8)
-- 00057_suppliers_receiving.sql
--
-- Additive only. Purchasing + receiving that feeds the inventory ledger:
-- receiving a purchase order creates `receive` stock movements (Stage 7) and
-- records supplier price history so FUTURE recipe costs can update — while
-- historical recipe_cost_snapshots stay stable.
--
-- GHOST-KITCHEN SCOPE: suppliers, catalogue, POs and receiving are SHARED by
-- the commissary kitchen (one supplier list buys for every brand), so they
-- scope by kitchen_id.
--
-- RLS: operator -> own kitchen (is_operator_of_kitchen); ops -> read-only;
-- service_role -> full; customers/drivers -> denied.
-- ==========================================

CREATE TABLE IF NOT EXISTS suppliers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id    UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  contact_name  TEXT,
  email         TEXT,
  phone         TEXT,
  notes         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kitchen_id, name)
);
CREATE INDEX IF NOT EXISTS idx_suppliers_kitchen ON suppliers(kitchen_id);

-- Supplier catalogue: what a supplier sells, at a pack size + pack cost.
CREATE TABLE IF NOT EXISTS supplier_items (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id       UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  kitchen_id        UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  supplier_sku      TEXT,
  name              TEXT NOT NULL,
  pack_size         NUMERIC(14, 4) NOT NULL DEFAULT 1, -- base units per pack
  pack_unit         TEXT,
  unit_cost         NUMERIC(12, 4) NOT NULL DEFAULT 0, -- cost per pack
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_items_supplier ON supplier_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_supplier_items_kitchen ON supplier_items(kitchen_id);
CREATE INDEX IF NOT EXISTS idx_supplier_items_inventory ON supplier_items(inventory_item_id);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id    UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  supplier_id   UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  status        TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'received', 'cancelled')),
  reference     TEXT,
  notes         TEXT,
  total_cost    NUMERIC(14, 4) NOT NULL DEFAULT 0,
  expected_at   TIMESTAMPTZ,
  submitted_at  TIMESTAMPTZ,
  received_at   TIMESTAMPTZ,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_kitchen ON purchase_orders(kitchen_id, status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_supplier ON purchase_orders(supplier_id);

CREATE TABLE IF NOT EXISTS purchase_order_lines (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  supplier_item_id  UUID REFERENCES supplier_items(id) ON DELETE SET NULL,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  description       TEXT,
  quantity          NUMERIC(14, 4) NOT NULL DEFAULT 0, -- number of packs ordered
  pack_size         NUMERIC(14, 4) NOT NULL DEFAULT 1,
  unit_cost         NUMERIC(12, 4) NOT NULL DEFAULT 0, -- cost per pack
  received_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0, -- packs received so far
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_purchase_order_lines_po ON purchase_order_lines(purchase_order_id);

CREATE TABLE IF NOT EXISTS receiving_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id        UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES purchase_orders(id) ON DELETE SET NULL,
  received_by       UUID,
  note              TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_receiving_batches_kitchen ON receiving_batches(kitchen_id, created_at);
CREATE INDEX IF NOT EXISTS idx_receiving_batches_po ON receiving_batches(purchase_order_id);

CREATE TABLE IF NOT EXISTS supplier_price_history (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_item_id UUID NOT NULL REFERENCES supplier_items(id) ON DELETE CASCADE,
  kitchen_id       UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  unit_cost        NUMERIC(12, 4) NOT NULL,
  pack_size        NUMERIC(14, 4),
  source           TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'receiving')),
  effective_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_price_history_item ON supplier_price_history(supplier_item_id, effective_at);

-- ==========================================
-- updated_at triggers (shared function from 00001)
-- ==========================================
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplier_items_updated_at ON supplier_items;
CREATE TRIGGER update_supplier_items_updated_at BEFORE UPDATE ON supplier_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_purchase_orders_updated_at ON purchase_orders;
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE suppliers              ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_items         ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_order_lines   ENABLE ROW LEVEL SECURITY;
ALTER TABLE receiving_batches      ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_price_history ENABLE ROW LEVEL SECURITY;

-- suppliers
DROP POLICY IF EXISTS "chef_manage_own_suppliers" ON suppliers;
DROP POLICY IF EXISTS "operator_manage_suppliers" ON suppliers;
CREATE POLICY "operator_manage_suppliers" ON suppliers FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_suppliers" ON suppliers;
CREATE POLICY "ops_read_suppliers" ON suppliers FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_suppliers" ON suppliers;
CREATE POLICY "service_role_suppliers" ON suppliers FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- supplier_items
DROP POLICY IF EXISTS "chef_manage_own_supplier_items" ON supplier_items;
DROP POLICY IF EXISTS "operator_manage_supplier_items" ON supplier_items;
CREATE POLICY "operator_manage_supplier_items" ON supplier_items FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_supplier_items" ON supplier_items;
CREATE POLICY "ops_read_supplier_items" ON supplier_items FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_supplier_items" ON supplier_items;
CREATE POLICY "service_role_supplier_items" ON supplier_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- purchase_orders
DROP POLICY IF EXISTS "chef_manage_own_purchase_orders" ON purchase_orders;
DROP POLICY IF EXISTS "operator_manage_purchase_orders" ON purchase_orders;
CREATE POLICY "operator_manage_purchase_orders" ON purchase_orders FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_purchase_orders" ON purchase_orders;
CREATE POLICY "ops_read_purchase_orders" ON purchase_orders FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_purchase_orders" ON purchase_orders;
CREATE POLICY "service_role_purchase_orders" ON purchase_orders FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- purchase_order_lines (scope via parent PO's kitchen_id)
DROP POLICY IF EXISTS "chef_manage_own_purchase_order_lines" ON purchase_order_lines;
DROP POLICY IF EXISTS "operator_manage_purchase_order_lines" ON purchase_order_lines;
CREATE POLICY "operator_manage_purchase_order_lines" ON purchase_order_lines FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(
    (SELECT po.kitchen_id FROM purchase_orders po WHERE po.id = purchase_order_lines.purchase_order_id)
  ));
DROP POLICY IF EXISTS "ops_read_purchase_order_lines" ON purchase_order_lines;
CREATE POLICY "ops_read_purchase_order_lines" ON purchase_order_lines FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_purchase_order_lines" ON purchase_order_lines;
CREATE POLICY "service_role_purchase_order_lines" ON purchase_order_lines FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- receiving_batches
DROP POLICY IF EXISTS "chef_manage_own_receiving_batches" ON receiving_batches;
DROP POLICY IF EXISTS "operator_manage_receiving_batches" ON receiving_batches;
CREATE POLICY "operator_manage_receiving_batches" ON receiving_batches FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_receiving_batches" ON receiving_batches;
CREATE POLICY "ops_read_receiving_batches" ON receiving_batches FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_receiving_batches" ON receiving_batches;
CREATE POLICY "service_role_receiving_batches" ON receiving_batches FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- supplier_price_history (operator read-only; audit trail)
DROP POLICY IF EXISTS "chef_read_own_supplier_price_history" ON supplier_price_history;
DROP POLICY IF EXISTS "operator_read_supplier_price_history" ON supplier_price_history;
CREATE POLICY "operator_read_supplier_price_history" ON supplier_price_history FOR SELECT TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_supplier_price_history" ON supplier_price_history;
CREATE POLICY "ops_read_supplier_price_history" ON supplier_price_history FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_supplier_price_history" ON supplier_price_history;
CREATE POLICY "service_role_supplier_price_history" ON supplier_price_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);
