-- ==========================================
-- LABOUR TRACKING (Stage 10)
-- 00059_labour.sql
--
-- Additive only. Staff, shifts, and clock in/out. time_entries are the source
-- of truth for labour cost (hours × snapshotted hourly rate). Also introduces
-- kitchen_station_assignments, deferred from 00054 until kitchen_staff existed.
--
-- GHOST-KITCHEN SCOPE: staff, shifts, time entries and station assignments are
-- SHARED across every brand under a commissary kitchen, so they scope by
-- kitchen_id. Cost attribution back to a brand is DUAL-SCOPE:
--   * labor_allocations   -> kitchen_id (owner) + storefront_id (brand target)
--   * labor_cost_snapshots -> kitchen_id (owner) + storefront_id (per-brand day)
-- so a kitchen's daily labour = SUM of its brands' rows.
--
-- File/API names use US "labor"; UI labels read "Labour" (Canada).
--
-- RLS: operator -> own kitchen (is_operator_of_kitchen); ops -> read-only;
-- service_role -> full; customers/drivers -> denied.
-- ==========================================

CREATE TABLE IF NOT EXISTS kitchen_staff (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id    UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  user_id       UUID,
  name          TEXT NOT NULL,
  role          TEXT,
  station_id    UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  hourly_rate   NUMERIC(10, 2) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kitchen_staff_kitchen ON kitchen_staff(kitchen_id, is_active);

CREATE TABLE IF NOT EXISTS kitchen_shifts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id      UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  staff_id        UUID NOT NULL REFERENCES kitchen_staff(id) ON DELETE CASCADE,
  scheduled_start TIMESTAMPTZ NOT NULL,
  scheduled_end   TIMESTAMPTZ NOT NULL,
  role            TEXT,
  station_id      UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kitchen_shifts_kitchen ON kitchen_shifts(kitchen_id, scheduled_start);
CREATE INDEX IF NOT EXISTS idx_kitchen_shifts_staff ON kitchen_shifts(staff_id);

-- time_entries: actual clock in/out. Source of truth for labour cost.
CREATE TABLE IF NOT EXISTS time_entries (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id    UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES kitchen_staff(id) ON DELETE CASCADE,
  shift_id      UUID REFERENCES kitchen_shifts(id) ON DELETE SET NULL,
  clock_in      TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out     TIMESTAMPTZ,
  hourly_rate   NUMERIC(10, 2) NOT NULL DEFAULT 0, -- snapshot at clock-in
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_time_entries_kitchen ON time_entries(kitchen_id, clock_in);
CREATE INDEX IF NOT EXISTS idx_time_entries_open ON time_entries(staff_id) WHERE clock_out IS NULL;

-- labor_allocations: DUAL-SCOPE. Splits a day's shared labour cost onto the
-- brand (storefront) that drove it. kitchen_id = owner (RLS); storefront_id =
-- the brand the amount is attributed to. Written by the Phase C allocation job.
CREATE TABLE IF NOT EXISTS labor_allocations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id    UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  time_entry_id UUID REFERENCES time_entries(id) ON DELETE SET NULL,
  target_type   TEXT,
  target_id     UUID,
  amount        NUMERIC(12, 4) NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_labor_allocations_kitchen ON labor_allocations(kitchen_id, created_at);
CREATE INDEX IF NOT EXISTS idx_labor_allocations_storefront ON labor_allocations(storefront_id, created_at);

-- labor_cost_snapshots: DUAL-SCOPE per-brand daily labour rollup for close-of-day
-- and P&L. kitchen_id denormalized for RLS + kitchen totals (Σ brands).
CREATE TABLE IF NOT EXISTS labor_cost_snapshots (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id    UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,
  labor_cost    NUMERIC(12, 4) NOT NULL DEFAULT 0,
  labor_hours   NUMERIC(12, 4) NOT NULL DEFAULT 0,
  staff_count   INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (storefront_id, snapshot_date)
);
CREATE INDEX IF NOT EXISTS idx_labor_cost_snapshots_kitchen ON labor_cost_snapshots(kitchen_id, snapshot_date);

-- kitchen_station_assignments (deferred from 00054): staff <-> station.
CREATE TABLE IF NOT EXISTS kitchen_station_assignments (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kitchen_id    UUID NOT NULL REFERENCES chef_kitchens(id) ON DELETE CASCADE,
  staff_id      UUID NOT NULL REFERENCES kitchen_staff(id) ON DELETE CASCADE,
  station_id    UUID NOT NULL REFERENCES kitchen_stations(id) ON DELETE CASCADE,
  shift_id      UUID REFERENCES kitchen_shifts(id) ON DELETE SET NULL,
  assigned_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  released_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_kitchen_station_assignments_kitchen ON kitchen_station_assignments(kitchen_id);
CREATE INDEX IF NOT EXISTS idx_kitchen_station_assignments_station ON kitchen_station_assignments(station_id);

-- ==========================================
-- updated_at triggers (shared function from 00001)
-- ==========================================
DROP TRIGGER IF EXISTS update_kitchen_staff_updated_at ON kitchen_staff;
CREATE TRIGGER update_kitchen_staff_updated_at BEFORE UPDATE ON kitchen_staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_kitchen_shifts_updated_at ON kitchen_shifts;
CREATE TRIGGER update_kitchen_shifts_updated_at BEFORE UPDATE ON kitchen_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_time_entries_updated_at ON time_entries;
CREATE TRIGGER update_time_entries_updated_at BEFORE UPDATE ON time_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE kitchen_staff               ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_shifts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_entries                ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_allocations           ENABLE ROW LEVEL SECURITY;
ALTER TABLE labor_cost_snapshots        ENABLE ROW LEVEL SECURITY;
ALTER TABLE kitchen_station_assignments ENABLE ROW LEVEL SECURITY;

-- kitchen_staff
DROP POLICY IF EXISTS "chef_manage_own_kitchen_staff" ON kitchen_staff;
DROP POLICY IF EXISTS "operator_manage_kitchen_staff" ON kitchen_staff;
CREATE POLICY "operator_manage_kitchen_staff" ON kitchen_staff FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_kitchen_staff" ON kitchen_staff;
CREATE POLICY "ops_read_kitchen_staff" ON kitchen_staff FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_kitchen_staff" ON kitchen_staff;
CREATE POLICY "service_role_kitchen_staff" ON kitchen_staff FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- kitchen_shifts
DROP POLICY IF EXISTS "chef_manage_own_kitchen_shifts" ON kitchen_shifts;
DROP POLICY IF EXISTS "operator_manage_kitchen_shifts" ON kitchen_shifts;
CREATE POLICY "operator_manage_kitchen_shifts" ON kitchen_shifts FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_kitchen_shifts" ON kitchen_shifts;
CREATE POLICY "ops_read_kitchen_shifts" ON kitchen_shifts FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_kitchen_shifts" ON kitchen_shifts;
CREATE POLICY "service_role_kitchen_shifts" ON kitchen_shifts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- time_entries
DROP POLICY IF EXISTS "chef_manage_own_time_entries" ON time_entries;
DROP POLICY IF EXISTS "operator_manage_time_entries" ON time_entries;
CREATE POLICY "operator_manage_time_entries" ON time_entries FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_time_entries" ON time_entries;
CREATE POLICY "ops_read_time_entries" ON time_entries FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_time_entries" ON time_entries;
CREATE POLICY "service_role_time_entries" ON time_entries FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- labor_allocations (owner = kitchen)
DROP POLICY IF EXISTS "chef_manage_own_labor_allocations" ON labor_allocations;
DROP POLICY IF EXISTS "operator_manage_labor_allocations" ON labor_allocations;
CREATE POLICY "operator_manage_labor_allocations" ON labor_allocations FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_labor_allocations" ON labor_allocations;
CREATE POLICY "ops_read_labor_allocations" ON labor_allocations FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_labor_allocations" ON labor_allocations;
CREATE POLICY "service_role_labor_allocations" ON labor_allocations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- labor_cost_snapshots (owner = kitchen)
DROP POLICY IF EXISTS "chef_manage_own_labor_cost_snapshots" ON labor_cost_snapshots;
DROP POLICY IF EXISTS "operator_manage_labor_cost_snapshots" ON labor_cost_snapshots;
CREATE POLICY "operator_manage_labor_cost_snapshots" ON labor_cost_snapshots FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_labor_cost_snapshots" ON labor_cost_snapshots;
CREATE POLICY "ops_read_labor_cost_snapshots" ON labor_cost_snapshots FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_labor_cost_snapshots" ON labor_cost_snapshots;
CREATE POLICY "service_role_labor_cost_snapshots" ON labor_cost_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- kitchen_station_assignments
DROP POLICY IF EXISTS "chef_manage_own_station_assignments" ON kitchen_station_assignments;
DROP POLICY IF EXISTS "operator_manage_station_assignments" ON kitchen_station_assignments;
CREATE POLICY "operator_manage_station_assignments" ON kitchen_station_assignments FOR ALL TO authenticated
  USING (public.is_operator_of_kitchen(kitchen_id));
DROP POLICY IF EXISTS "ops_read_station_assignments" ON kitchen_station_assignments;
CREATE POLICY "ops_read_station_assignments" ON kitchen_station_assignments FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_station_assignments" ON kitchen_station_assignments;
CREATE POLICY "service_role_station_assignments" ON kitchen_station_assignments FOR ALL TO service_role
  USING (true) WITH CHECK (true);
