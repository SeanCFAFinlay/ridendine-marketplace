-- ==========================================
-- RECIPES & FOOD COST (Stage 6)
-- 00055_recipes_and_costing.sql
--
-- Additive only. Connects menu items to versioned recipes, ingredient costs,
-- and packaging so a chef can see real food cost, margin, and food-cost %.
--
-- Historical profitability must stay stable: recipe_cost_snapshots captures a
-- point-in-time cost so old orders are never re-priced with today's costs.
--
-- inventory_item_id on recipe_ingredients is a plain UUID for now (no FK); the
-- inventory stage adds inventory_items and the FK constraint.
--
-- RLS model mirrors 00054: chef -> own storefront; ops -> read-only;
-- service_role -> full; customers/drivers -> denied.
-- ==========================================

-- Reusable chef-ownership predicate (DRYs the nested-table policies below).
CREATE OR REPLACE FUNCTION public.is_chef_of_storefront(sf_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM chef_storefronts cs
    JOIN chef_profiles cp ON cp.id = cs.chef_id
    WHERE cs.id = sf_id AND cp.user_id = auth.uid()
  );
$$;

-- ------------------------------------------------------------------
-- recipes / recipe_versions
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS recipes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  menu_item_id  UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  name          TEXT NOT NULL,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipes_storefront ON recipes(storefront_id);
CREATE INDEX IF NOT EXISTS idx_recipes_menu_item ON recipes(menu_item_id);

CREATE TABLE IF NOT EXISTS recipe_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id    UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  version      INTEGER NOT NULL DEFAULT 1,
  batch_yield  NUMERIC(12, 3) NOT NULL DEFAULT 1,
  portion_size TEXT,
  waste_factor NUMERIC(6, 4) NOT NULL DEFAULT 0,
  notes        TEXT,
  is_active    BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (recipe_id, version)
);
CREATE INDEX IF NOT EXISTS idx_recipe_versions_recipe ON recipe_versions(recipe_id);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_version_id    UUID NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  inventory_item_id    UUID, -- FK added in the inventory stage
  name                 TEXT NOT NULL,
  quantity             NUMERIC(12, 4) NOT NULL DEFAULT 0,
  unit                 TEXT NOT NULL DEFAULT 'unit',
  cost_per_unit        NUMERIC(12, 4) NOT NULL DEFAULT 0,
  waste_factor         NUMERIC(6, 4) NOT NULL DEFAULT 0,
  sort_order           INTEGER NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_version ON recipe_ingredients(recipe_version_id);

CREATE TABLE IF NOT EXISTS recipe_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_version_id UUID NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  step_number       INTEGER NOT NULL,
  instruction       TEXT NOT NULL,
  station           TEXT,
  duration_minutes  INTEGER,
  phase             TEXT NOT NULL DEFAULT 'prep' CHECK (phase IN ('prep', 'cook')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipe_steps_version ON recipe_steps(recipe_version_id, step_number);

-- Active recipe version per menu item.
CREATE TABLE IF NOT EXISTS menu_item_recipe_versions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id      UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  recipe_version_id UUID NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  is_active         BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, recipe_version_id)
);
CREATE INDEX IF NOT EXISTS idx_mirv_menu_item ON menu_item_recipe_versions(menu_item_id);

-- Point-in-time cost snapshots (historical stability).
CREATE TABLE IF NOT EXISTS recipe_cost_snapshots (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_version_id UUID NOT NULL REFERENCES recipe_versions(id) ON DELETE CASCADE,
  menu_item_id      UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  ingredient_cost   NUMERIC(12, 4) NOT NULL,
  packaging_cost    NUMERIC(12, 4) NOT NULL DEFAULT 0,
  total_cost        NUMERIC(12, 4) NOT NULL,
  food_cost_pct     NUMERIC(6, 4),
  sell_price        NUMERIC(12, 2),
  snapshot_reason   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recipe_cost_snapshots_version ON recipe_cost_snapshots(recipe_version_id, created_at);

-- ------------------------------------------------------------------
-- packaging catalogue + menu item packaging
-- ------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS packaging_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storefront_id UUID NOT NULL REFERENCES chef_storefronts(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  unit          TEXT,
  cost_per_unit NUMERIC(12, 4) NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (storefront_id, name)
);
CREATE INDEX IF NOT EXISTS idx_packaging_items_storefront ON packaging_items(storefront_id);

CREATE TABLE IF NOT EXISTS menu_item_packaging (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id      UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  packaging_item_id UUID NOT NULL REFERENCES packaging_items(id) ON DELETE CASCADE,
  quantity          NUMERIC(12, 4) NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (menu_item_id, packaging_item_id)
);
CREATE INDEX IF NOT EXISTS idx_menu_item_packaging_menu_item ON menu_item_packaging(menu_item_id);

-- ==========================================
-- updated_at triggers (shared function from 00001)
-- ==========================================
DROP TRIGGER IF EXISTS update_recipes_updated_at ON recipes;
CREATE TRIGGER update_recipes_updated_at BEFORE UPDATE ON recipes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_recipe_versions_updated_at ON recipe_versions;
CREATE TRIGGER update_recipe_versions_updated_at BEFORE UPDATE ON recipe_versions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_packaging_items_updated_at ON packaging_items;
CREATE TRIGGER update_packaging_items_updated_at BEFORE UPDATE ON packaging_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE recipes                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_versions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients        ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_steps              ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_recipe_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_cost_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE packaging_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_packaging       ENABLE ROW LEVEL SECURITY;

-- recipes
DROP POLICY IF EXISTS "chef_manage_own_recipes" ON recipes;
CREATE POLICY "chef_manage_own_recipes" ON recipes FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_recipes" ON recipes;
CREATE POLICY "ops_read_recipes" ON recipes FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_recipes" ON recipes;
CREATE POLICY "service_role_recipes" ON recipes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- recipe_versions (scope via parent recipe)
DROP POLICY IF EXISTS "chef_manage_own_recipe_versions" ON recipe_versions;
CREATE POLICY "chef_manage_own_recipe_versions" ON recipe_versions FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(
    (SELECT r.storefront_id FROM recipes r WHERE r.id = recipe_versions.recipe_id)
  ));
DROP POLICY IF EXISTS "ops_read_recipe_versions" ON recipe_versions;
CREATE POLICY "ops_read_recipe_versions" ON recipe_versions FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_recipe_versions" ON recipe_versions;
CREATE POLICY "service_role_recipe_versions" ON recipe_versions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- recipe_ingredients (scope via recipe_version -> recipe)
DROP POLICY IF EXISTS "chef_manage_own_recipe_ingredients" ON recipe_ingredients;
CREATE POLICY "chef_manage_own_recipe_ingredients" ON recipe_ingredients FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(
    (SELECT r.storefront_id FROM recipe_versions rv JOIN recipes r ON r.id = rv.recipe_id
      WHERE rv.id = recipe_ingredients.recipe_version_id)
  ));
DROP POLICY IF EXISTS "ops_read_recipe_ingredients" ON recipe_ingredients;
CREATE POLICY "ops_read_recipe_ingredients" ON recipe_ingredients FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_recipe_ingredients" ON recipe_ingredients;
CREATE POLICY "service_role_recipe_ingredients" ON recipe_ingredients FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- recipe_steps (scope via recipe_version -> recipe)
DROP POLICY IF EXISTS "chef_manage_own_recipe_steps" ON recipe_steps;
CREATE POLICY "chef_manage_own_recipe_steps" ON recipe_steps FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(
    (SELECT r.storefront_id FROM recipe_versions rv JOIN recipes r ON r.id = rv.recipe_id
      WHERE rv.id = recipe_steps.recipe_version_id)
  ));
DROP POLICY IF EXISTS "ops_read_recipe_steps" ON recipe_steps;
CREATE POLICY "ops_read_recipe_steps" ON recipe_steps FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_recipe_steps" ON recipe_steps;
CREATE POLICY "service_role_recipe_steps" ON recipe_steps FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- menu_item_recipe_versions (scope via menu_item)
DROP POLICY IF EXISTS "chef_manage_own_mirv" ON menu_item_recipe_versions;
CREATE POLICY "chef_manage_own_mirv" ON menu_item_recipe_versions FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(
    (SELECT mi.storefront_id FROM menu_items mi WHERE mi.id = menu_item_recipe_versions.menu_item_id)
  ));
DROP POLICY IF EXISTS "ops_read_mirv" ON menu_item_recipe_versions;
CREATE POLICY "ops_read_mirv" ON menu_item_recipe_versions FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_mirv" ON menu_item_recipe_versions;
CREATE POLICY "service_role_mirv" ON menu_item_recipe_versions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- recipe_cost_snapshots (scope via recipe_version -> recipe)
DROP POLICY IF EXISTS "chef_read_own_recipe_cost_snapshots" ON recipe_cost_snapshots;
CREATE POLICY "chef_read_own_recipe_cost_snapshots" ON recipe_cost_snapshots FOR SELECT TO authenticated
  USING (public.is_chef_of_storefront(
    (SELECT r.storefront_id FROM recipe_versions rv JOIN recipes r ON r.id = rv.recipe_id
      WHERE rv.id = recipe_cost_snapshots.recipe_version_id)
  ));
DROP POLICY IF EXISTS "ops_read_recipe_cost_snapshots" ON recipe_cost_snapshots;
CREATE POLICY "ops_read_recipe_cost_snapshots" ON recipe_cost_snapshots FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_recipe_cost_snapshots" ON recipe_cost_snapshots;
CREATE POLICY "service_role_recipe_cost_snapshots" ON recipe_cost_snapshots FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- packaging_items
DROP POLICY IF EXISTS "chef_manage_own_packaging_items" ON packaging_items;
CREATE POLICY "chef_manage_own_packaging_items" ON packaging_items FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(storefront_id));
DROP POLICY IF EXISTS "ops_read_packaging_items" ON packaging_items;
CREATE POLICY "ops_read_packaging_items" ON packaging_items FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_packaging_items" ON packaging_items;
CREATE POLICY "service_role_packaging_items" ON packaging_items FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- menu_item_packaging (scope via menu_item)
DROP POLICY IF EXISTS "chef_manage_own_menu_item_packaging" ON menu_item_packaging;
CREATE POLICY "chef_manage_own_menu_item_packaging" ON menu_item_packaging FOR ALL TO authenticated
  USING (public.is_chef_of_storefront(
    (SELECT mi.storefront_id FROM menu_items mi WHERE mi.id = menu_item_packaging.menu_item_id)
  ));
DROP POLICY IF EXISTS "ops_read_menu_item_packaging" ON menu_item_packaging;
CREATE POLICY "ops_read_menu_item_packaging" ON menu_item_packaging FOR SELECT TO authenticated
  USING (public.is_platform_staff(auth.uid()));
DROP POLICY IF EXISTS "service_role_menu_item_packaging" ON menu_item_packaging;
CREATE POLICY "service_role_menu_item_packaging" ON menu_item_packaging FOR ALL TO service_role
  USING (true) WITH CHECK (true);
