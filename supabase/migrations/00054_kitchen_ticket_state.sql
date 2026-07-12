-- ==========================================
-- KITCHEN TICKET INTERNAL STATE (Stage 5)
-- 00054_kitchen_ticket_state.sql
--
-- Additive only. Introduces an INTERNAL kitchen workflow state that lives
-- alongside — and never replaces — the public order lifecycle. The public
-- order status machine (orders.status / orders.engine_status) is untouched;
-- these tables let a chef run prep/packing/station routing without changing
-- any customer-, ops-, or driver-facing status.
--
-- Notably "packing" exists ONLY as a kitchen_status here, not as a public
-- order status, satisfying the rule that internal kitchen states must not
-- leak into the public state machine.
--
-- RLS model:
--   * chefs           -> only their own storefront's rows
--   * ops/platform    -> read-only across all storefronts (monitoring)
--   * service_role    -> full access (all server-side writes)
--   * customers/drivers -> no access (no policy = denied)
--
-- kitchen_station_assignments (staff <-> station) is intentionally deferred
-- to the labour stage, where the kitchen_staff table is introduced.
-- ==========================================

-- ------------------------------------------------------------------
-- kitchen_stations: a chef's prep stations (grill, fry, cold, ...)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kitchen_stations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (storefront_id, name)
);

CREATE INDEX IF NOT EXISTS idx_kitchen_stations_storefront ON kitchen_stations(storefront_id, sort_order);

-- ------------------------------------------------------------------
-- kitchen_tickets: one internal kitchen ticket per order
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kitchen_tickets (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id      UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  order_id           UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  queue_entry_id     UUID REFERENCES kitchen_queue_entries(id) ON DELETE SET NULL,
  kitchen_status     TEXT NOT NULL DEFAULT 'new'
                       CHECK (kitchen_status IN (
                         'new', 'accepted', 'preparing', 'packing',
                         'ready', 'problem', 'completed', 'cancelled'
                       )),
  priority           INTEGER NOT NULL DEFAULT 0,
  station_id         UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  started_at         TIMESTAMPTZ,
  packing_started_at TIMESTAMPTZ,
  packed_at          TIMESTAMPTZ,
  ready_at           TIMESTAMPTZ,
  problem_reason     TEXT,
  notes              TEXT,
  metadata           JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One kitchen ticket per order.
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_storefront_status ON kitchen_tickets(storefront_id, kitchen_status);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_order ON kitchen_tickets(order_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_tickets_queue_entry ON kitchen_tickets(queue_entry_id);

-- ------------------------------------------------------------------
-- kitchen_ticket_items: per-line kitchen state (snapshot of order items)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kitchen_ticket_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id            UUID NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
  order_item_id        UUID REFERENCES order_items(id) ON DELETE SET NULL,
  menu_item_id         UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  station_id           UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'in_progress', 'done')),
  quantity             INTEGER NOT NULL DEFAULT 1,
  modifiers_snapshot   JSONB NOT NULL DEFAULT '[]',
  allergen_flags       TEXT[] NOT NULL DEFAULT '{}',
  special_instructions TEXT,
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_ticket ON kitchen_ticket_items(ticket_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_items_menu_item ON kitchen_ticket_items(menu_item_id);

-- ------------------------------------------------------------------
-- kitchen_ticket_events: immutable audit trail of kitchen state changes
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS kitchen_ticket_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id     UUID NOT NULL REFERENCES kitchen_tickets(id) ON DELETE CASCADE,
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  from_status   TEXT,
  to_status     TEXT,
  actor_user_id UUID,
  detail        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_events_ticket ON kitchen_ticket_events(ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_kitchen_ticket_events_storefront ON kitchen_ticket_events(storefront_id, created_at);

-- ------------------------------------------------------------------
-- order_pack_checks: packing / handoff checklist per order
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_pack_checks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id              UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  ticket_id             UUID REFERENCES kitchen_tickets(id) ON DELETE SET NULL,
  storefront_id         UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  checked_items         JSONB NOT NULL DEFAULT '[]',
  bag_count             INTEGER NOT NULL DEFAULT 1,
  utensils_included     BOOLEAN NOT NULL DEFAULT false,
  sauces_included       BOOLEAN NOT NULL DEFAULT false,
  allergy_label_applied BOOLEAN NOT NULL DEFAULT false,
  sealed                BOOLEAN NOT NULL DEFAULT false,
  photo_url             TEXT,
  completed_by          UUID,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- One pack checklist per order.
  UNIQUE (order_id)
);

CREATE INDEX IF NOT EXISTS idx_order_pack_checks_order ON order_pack_checks(order_id);
CREATE INDEX IF NOT EXISTS idx_order_pack_checks_ticket ON order_pack_checks(ticket_id);

-- ==========================================
-- updated_at triggers (reuse the shared function from 00001)
-- ==========================================
DROP TRIGGER IF EXISTS update_kitchen_stations_updated_at ON kitchen_stations;
CREATE TRIGGER update_kitchen_stations_updated_at
  BEFORE UPDATE ON kitchen_stations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kitchen_tickets_updated_at ON kitchen_tickets;
CREATE TRIGGER update_kitchen_tickets_updated_at
  BEFORE UPDATE ON kitchen_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kitchen_ticket_items_updated_at ON kitchen_ticket_items;
CREATE TRIGGER update_kitchen_ticket_items_updated_at
  BEFORE UPDATE ON kitchen_ticket_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_order_pack_checks_updated_at ON order_pack_checks;
CREATE TRIGGER update_order_pack_checks_updated_at
  BEFORE UPDATE ON order_pack_checks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE kitchen_stations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_tickets       ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_ticket_items  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_pack_checks     ENABLE ROW LEVEL SECURITY;

-- Helper expression used below (inlined per-policy, matching repo convention):
--   the row's storefront belongs to the authenticated chef.

-- ---- kitchen_stations ----
DROP POLICY IF EXISTS "chef_manage_own_kitchen_stations" ON kitchen_stations;
CREATE POLICY "chef_manage_own_kitchen_stations"
  ON kitchen_stations FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chef_storefronts cs
      JOIN chef_profiles cp ON cp.id = cs.chef_id
      WHERE cs.id = kitchen_stations.storefront_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ops_read_kitchen_stations" ON kitchen_stations;
CREATE POLICY "ops_read_kitchen_stations"
  ON kitchen_stations FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));

DROP POLICY IF EXISTS "service_role_kitchen_stations" ON kitchen_stations;
CREATE POLICY "service_role_kitchen_stations"
  ON kitchen_stations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- kitchen_tickets ----
DROP POLICY IF EXISTS "chef_manage_own_kitchen_tickets" ON kitchen_tickets;
CREATE POLICY "chef_manage_own_kitchen_tickets"
  ON kitchen_tickets FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chef_storefronts cs
      JOIN chef_profiles cp ON cp.id = cs.chef_id
      WHERE cs.id = kitchen_tickets.storefront_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ops_read_kitchen_tickets" ON kitchen_tickets;
CREATE POLICY "ops_read_kitchen_tickets"
  ON kitchen_tickets FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));

DROP POLICY IF EXISTS "service_role_kitchen_tickets" ON kitchen_tickets;
CREATE POLICY "service_role_kitchen_tickets"
  ON kitchen_tickets FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- kitchen_ticket_items (scoped via parent ticket) ----
DROP POLICY IF EXISTS "chef_manage_own_kitchen_ticket_items" ON kitchen_ticket_items;
CREATE POLICY "chef_manage_own_kitchen_ticket_items"
  ON kitchen_ticket_items FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM kitchen_tickets kt
      JOIN chef_storefronts cs ON cs.id = kt.storefront_id
      JOIN chef_profiles cp ON cp.id = cs.chef_id
      WHERE kt.id = kitchen_ticket_items.ticket_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ops_read_kitchen_ticket_items" ON kitchen_ticket_items;
CREATE POLICY "ops_read_kitchen_ticket_items"
  ON kitchen_ticket_items FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));

DROP POLICY IF EXISTS "service_role_kitchen_ticket_items" ON kitchen_ticket_items;
CREATE POLICY "service_role_kitchen_ticket_items"
  ON kitchen_ticket_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- kitchen_ticket_events (chef read-only; immutable audit trail) ----
DROP POLICY IF EXISTS "chef_read_own_kitchen_ticket_events" ON kitchen_ticket_events;
CREATE POLICY "chef_read_own_kitchen_ticket_events"
  ON kitchen_ticket_events FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chef_storefronts cs
      JOIN chef_profiles cp ON cp.id = cs.chef_id
      WHERE cs.id = kitchen_ticket_events.storefront_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ops_read_kitchen_ticket_events" ON kitchen_ticket_events;
CREATE POLICY "ops_read_kitchen_ticket_events"
  ON kitchen_ticket_events FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));

DROP POLICY IF EXISTS "service_role_kitchen_ticket_events" ON kitchen_ticket_events;
CREATE POLICY "service_role_kitchen_ticket_events"
  ON kitchen_ticket_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ---- order_pack_checks ----
DROP POLICY IF EXISTS "chef_manage_own_order_pack_checks" ON order_pack_checks;
CREATE POLICY "chef_manage_own_order_pack_checks"
  ON order_pack_checks FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM chef_storefronts cs
      JOIN chef_profiles cp ON cp.id = cs.chef_id
      WHERE cs.id = order_pack_checks.storefront_id
        AND cp.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "ops_read_order_pack_checks" ON order_pack_checks;
CREATE POLICY "ops_read_order_pack_checks"
  ON order_pack_checks FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));

DROP POLICY IF EXISTS "service_role_order_pack_checks" ON order_pack_checks;
CREATE POLICY "service_role_order_pack_checks"
  ON order_pack_checks FOR ALL TO service_role
  USING (true) WITH CHECK (true);
