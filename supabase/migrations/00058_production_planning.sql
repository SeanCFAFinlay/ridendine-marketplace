-- ==========================================
-- PRODUCTION PLANNING (Stage 9)
-- 00058_production_planning.sql
--
-- Additive only. Persistent prep checklists (so progress survives refresh and
-- is shared across devices) and batch production that CONSUMES inventory
-- (consume_batch movements) and can produce prepared stock (outputs).
--
-- RLS mirrors 00054-00057: chef -> own storefront (is_chef_of_storefront);
-- ops -> read-only; service_role -> full; customers/drivers -> denied.
-- ==========================================

-- ------------------------------------------------------------------
-- prep_tasks: persistent prep checklist (source of truth, not React state)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prep_tasks (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id      UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  menu_item_id       UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  station_id         UUID REFERENCES kitchen_stations(id) ON DELETE SET NULL,
  title              TEXT NOT NULL,
  target_quantity    NUMERIC(14, 4),
  completed_quantity NUMERIC(14, 4) NOT NULL DEFAULT 0,
  status             TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  plan_date          DATE NOT NULL,
  assigned_to        UUID, -- FK added in the labour stage
  notes              TEXT,
  created_by         UUID,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prep_tasks_storefront_date ON prep_tasks(storefront_id, plan_date, status);

CREATE TABLE IF NOT EXISTS prep_task_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prep_task_id  UUID NOT NULL REFERENCES prep_tasks(id) ON DELETE CASCADE,
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  event_type    TEXT NOT NULL,
  from_status   TEXT,
  to_status     TEXT,
  actor_user_id UUID,
  detail        JSONB NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prep_task_events_task ON prep_task_events(prep_task_id, created_at);

-- ------------------------------------------------------------------
-- production_batches (+ inputs consumed / outputs produced)
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS production_batches (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id     UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  recipe_version_id UUID REFERENCES recipe_versions(id) ON DELETE SET NULL,
  menu_item_id      UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name              TEXT NOT NULL,
  planned_yield     NUMERIC(14, 4),
  actual_yield      NUMERIC(14, 4),
  waste_quantity    NUMERIC(14, 4) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  plan_date         DATE,
  started_at        TIMESTAMPTZ,
  completed_at      TIMESTAMPTZ,
  notes             TEXT,
  created_by        UUID,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_batches_storefront ON production_batches(storefront_id, plan_date, status);

CREATE TABLE IF NOT EXISTS production_batch_inputs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  quantity          NUMERIC(14, 4) NOT NULL DEFAULT 0,
  unit              TEXT,
  consumed          BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_batch_inputs_batch ON production_batch_inputs(batch_id);

CREATE TABLE IF NOT EXISTS production_batch_outputs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id          UUID NOT NULL REFERENCES production_batches(id) ON DELETE CASCADE,
  inventory_item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  menu_item_id      UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  quantity          NUMERIC(14, 4) NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_production_batch_outputs_batch ON production_batch_outputs(batch_id);

-- ==========================================
-- updated_at triggers (shared function from 00001)
-- ==========================================
DROP TRIGGER IF EXISTS update_prep_tasks_updated_at ON prep_tasks;
CREATE TRIGGER update_prep_tasks_updated_at BEFORE UPDATE ON prep_tasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_production_batches_updated_at ON production_batches;
CREATE TRIGGER update_production_batches_updated_at BEFORE UPDATE ON production_batches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE prep_tasks               ENABLE ROW LEVEL SECURITY;
ALTER TABLE prep_task_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batches       ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batch_inputs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_batch_outputs ENABLE ROW LEVEL SECURITY;

-- prep_tasks
DROP POLICY IF EXISTS "chef_manage_own_prep_tasks" ON prep_tasks;
CREATE POLICY "chef_manage_own_prep_tasks" ON prep_tasks FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_prep_tasks" ON prep_tasks;
CREATE POLICY "ops_read_prep_tasks" ON prep_tasks FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_prep_tasks" ON prep_tasks;
CREATE POLICY "service_role_prep_tasks" ON prep_tasks FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- prep_task_events (chef read-only; audit trail)
DROP POLICY IF EXISTS "chef_read_own_prep_task_events" ON prep_task_events;
CREATE POLICY "chef_read_own_prep_task_events" ON prep_task_events FOR SELECT TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_prep_task_events" ON prep_task_events;
CREATE POLICY "ops_read_prep_task_events" ON prep_task_events FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_prep_task_events" ON prep_task_events;
CREATE POLICY "service_role_prep_task_events" ON prep_task_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- production_batches
DROP POLICY IF EXISTS "chef_manage_own_production_batches" ON production_batches;
CREATE POLICY "chef_manage_own_production_batches" ON production_batches FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_production_batches" ON production_batches;
CREATE POLICY "ops_read_production_batches" ON production_batches FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_production_batches" ON production_batches;
CREATE POLICY "service_role_production_batches" ON production_batches FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- production_batch_inputs (scope via parent batch)
DROP POLICY IF EXISTS "chef_manage_own_production_batch_inputs" ON production_batch_inputs;
CREATE POLICY "chef_manage_own_production_batch_inputs" ON production_batch_inputs FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(
    (SELECT pb.storefront_id FROM production_batches pb WHERE pb.id = production_batch_inputs.batch_id)
  ));
DROP POLICY IF EXISTS "ops_read_production_batch_inputs" ON production_batch_inputs;
CREATE POLICY "ops_read_production_batch_inputs" ON production_batch_inputs FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_production_batch_inputs" ON production_batch_inputs;
CREATE POLICY "service_role_production_batch_inputs" ON production_batch_inputs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- production_batch_outputs (scope via parent batch)
DROP POLICY IF EXISTS "chef_manage_own_production_batch_outputs" ON production_batch_outputs;
CREATE POLICY "chef_manage_own_production_batch_outputs" ON production_batch_outputs FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(
    (SELECT pb.storefront_id FROM production_batches pb WHERE pb.id = production_batch_outputs.batch_id)
  ));
DROP POLICY IF EXISTS "ops_read_production_batch_outputs" ON production_batch_outputs;
CREATE POLICY "ops_read_production_batch_outputs" ON production_batch_outputs FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_production_batch_outputs" ON production_batch_outputs;
CREATE POLICY "service_role_production_batch_outputs" ON production_batch_outputs FOR ALL TO service_role
  USING (true) WITH CHECK (true);
