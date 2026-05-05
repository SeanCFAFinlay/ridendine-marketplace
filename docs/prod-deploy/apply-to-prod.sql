-- ==========================================
-- 00024 — CANONICAL CONSOLIDATION (Phase 2 rebuild)
--
-- Idempotent and additive. No DROP statements, no UPDATEs touching live data.
--
-- Closes residual schema drift from FND-002 / FND-003 by:
--   1. Defensive re-application of 00012's ADD COLUMN IF NOT EXISTS
--      (cheap insurance against any deploy that bypassed 00012).
--   2. COMMENT ON COLUMN documentation marking the orphan KV columns
--      from 00010 (setting_key, setting_value, description) as
--      reserved-but-unused.
--
-- Safe to apply on an already-consolidated DB. Verified locally on a
-- fresh `supabase db reset` (2026-05-05) with all NOTICE-level
-- "column already exists, skipping" messages expected.
-- ==========================================

-- ----------------------------------------------------
-- Section A: defensive ADD COLUMN IF NOT EXISTS — platform_settings
-- (mirrors 00012; harmless on already-consolidated DB)
-- ----------------------------------------------------

ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS platform_fee_percent              DECIMAL(5,2)  DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS service_fee_percent               DECIMAL(5,2)  DEFAULT 8.00,
  ADD COLUMN IF NOT EXISTS hst_rate                          DECIMAL(5,2)  DEFAULT 13.00,
  ADD COLUMN IF NOT EXISTS min_order_amount                  DECIMAL(10,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS dispatch_radius_km                DECIMAL(5,2)  DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS max_delivery_distance_km          DECIMAL(5,2)  DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS max_delivery_radius_km            DECIMAL(5,2)  DEFAULT 15.00,
  ADD COLUMN IF NOT EXISTS default_prep_time_minutes         INTEGER       DEFAULT 20,
  ADD COLUMN IF NOT EXISTS offer_timeout_seconds             INTEGER       DEFAULT 60,
  ADD COLUMN IF NOT EXISTS max_assignment_attempts           INTEGER       DEFAULT 5,
  ADD COLUMN IF NOT EXISTS auto_assign_enabled               BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS refund_auto_review_threshold_cents INTEGER      DEFAULT 2500,
  ADD COLUMN IF NOT EXISTS support_sla_warning_minutes       INTEGER       DEFAULT 15,
  ADD COLUMN IF NOT EXISTS support_sla_breach_minutes        INTEGER       DEFAULT 60,
  ADD COLUMN IF NOT EXISTS storefront_throttle_order_limit   INTEGER       DEFAULT 0,
  ADD COLUMN IF NOT EXISTS storefront_throttle_window_minutes INTEGER      DEFAULT 30,
  ADD COLUMN IF NOT EXISTS storefront_auto_pause_enabled     BOOLEAN       DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS storefront_pause_on_sla_breach    BOOLEAN       DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS updated_by                        UUID;

-- ----------------------------------------------------
-- Section B: defensive ADD COLUMN IF NOT EXISTS — chef_payout_accounts
-- ----------------------------------------------------

ALTER TABLE chef_payout_accounts
  ADD COLUMN IF NOT EXISTS stripe_account_status TEXT    DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS payout_enabled        BOOLEAN DEFAULT FALSE;

-- ----------------------------------------------------
-- Section C: ensure exactly one platform_settings row exists
-- ----------------------------------------------------

INSERT INTO platform_settings (id)
SELECT gen_random_uuid()
WHERE NOT EXISTS (SELECT 1 FROM platform_settings LIMIT 1);

-- ----------------------------------------------------
-- Section D: deprecation comments on orphan KV columns
-- (00010 introduced these for a never-completed key/value pattern;
--  the application uses the wide-row shape exclusively)
-- ----------------------------------------------------

COMMENT ON COLUMN platform_settings.setting_key IS
  'DEPRECATED: reserved from 00010 KV-store experiment. The canonical shape is the wide single row (platform_fee_percent, service_fee_percent, etc.). No application code reads or writes this column. Kept for backward compatibility; do not depend on it in new code.';

COMMENT ON COLUMN platform_settings.setting_value IS
  'DEPRECATED: reserved from 00010 KV-store experiment. See setting_key comment.';

COMMENT ON COLUMN platform_settings.description IS
  'DEPRECATED: reserved from 00010 KV-store experiment. See setting_key comment.';

COMMENT ON TABLE platform_settings IS
  'Platform configuration. Canonical shape: a single wide row (platform_fee_percent, service_fee_percent, hst_rate, min_order_amount, dispatch_radius_km, max_delivery_distance_km, default_prep_time_minutes, offer_timeout_seconds, max_assignment_attempts, auto_assign_enabled, refund_auto_review_threshold_cents, support_sla_warning_minutes, support_sla_breach_minutes, storefront_throttle_order_limit, storefront_throttle_window_minutes, storefront_auto_pause_enabled, storefront_pause_on_sla_breach). Read by packages/db/src/repositories/platform.repository.ts.';

-- ==========================================
-- DONE: schema is canonical and documented. Migration 00025 follows
-- with RLS helper functions and policy refactors.
-- ==========================================
-- ==========================================
-- 00025 — RLS ROLE ALIGNMENT (Phase 2 rebuild)
--
-- Introduces three SECURITY DEFINER helper functions that encapsulate
-- platform_users role-set checks. Refactors the verbose role-IN policies
-- from 00007 / 00011 / 00017 to call them.
--
-- Helpers (see docs/DATABASE_SCHEMA.md "RLS helper functions"):
--   is_platform_staff(uid)  — all 7 platform roles (broad)
--   is_finance_staff(uid)   — finance_admin, finance_manager, super_admin
--   is_support_staff(uid)   — support_agent, ops_agent, ops_admin,
--                             ops_manager, super_admin
-- All three additionally require platform_users.is_active = true.
-- A NULL uid returns false.
--
-- Behavior changes vs. pre-00025:
--   - ledger_entries SELECT: tightened to is_finance_staff (was
--     ops_agent + ops_manager + finance_admin + super_admin). Phase 5
--     RBAC will reintroduce ops access via per-route capability checks
--     using the engine layer (which uses the service role and bypasses
--     RLS for legitimate engine reads).
--   - All other refactors are no-ops or strict broadenings (e.g.,
--     adding finance_manager / support_agent that 00011 omitted).
--
-- pgTAP tests at supabase/tests/rls/role_alignment.sql verify behavior.
-- ==========================================

-- ----------------------------------------------------
-- Section A: helper functions
-- ----------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_platform_staff(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT EXISTS (
       SELECT 1
       FROM public.platform_users
       WHERE user_id = uid
         AND is_active = TRUE
         AND role IN (
           'ops_admin', 'ops_agent', 'ops_manager', 'super_admin',
           'support_agent', 'finance_admin', 'finance_manager'
         )
     )),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.is_platform_staff(uuid) IS
  'Phase 2 RLS helper: TRUE iff uid is an active platform_users row in any platform-staff role (ops_*, finance_*, support_agent, super_admin). FALSE for NULL uid.';

CREATE OR REPLACE FUNCTION public.is_finance_staff(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT EXISTS (
       SELECT 1
       FROM public.platform_users
       WHERE user_id = uid
         AND is_active = TRUE
         AND role IN ('finance_admin', 'finance_manager', 'super_admin')
     )),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.is_finance_staff(uuid) IS
  'Phase 2 RLS helper: TRUE iff uid is an active platform_users row in a finance role or super_admin.';

CREATE OR REPLACE FUNCTION public.is_support_staff(uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT EXISTS (
       SELECT 1
       FROM public.platform_users
       WHERE user_id = uid
         AND is_active = TRUE
         AND role IN ('support_agent', 'ops_agent', 'ops_admin', 'ops_manager', 'super_admin')
     )),
    FALSE
  );
$$;

COMMENT ON FUNCTION public.is_support_staff(uuid) IS
  'Phase 2 RLS helper: TRUE iff uid is an active platform_users row in a support-handling role (support_agent + ops_*, plus super_admin).';

GRANT EXECUTE ON FUNCTION public.is_platform_staff(uuid) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_finance_staff(uuid)  TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.is_support_staff(uuid)  TO authenticated, anon;

-- ----------------------------------------------------
-- Section B: refactor 00011's role-IN policies to use is_platform_staff
-- (the role lists in 00011 were close-but-not-identical subsets;
--  is_platform_staff broadens by including support_agent and the
--  finance_manager role added in 00015)
-- ----------------------------------------------------

-- driver_locations: Ops can read all driver locations
DROP POLICY IF EXISTS "Ops can read all driver locations" ON driver_locations;
CREATE POLICY "Ops can read all driver locations" ON driver_locations
  FOR SELECT TO authenticated USING (
    public.is_platform_staff(auth.uid())
    OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- promo_codes: Ops can manage promo codes
DROP POLICY IF EXISTS "Ops can manage promo codes" ON promo_codes;
CREATE POLICY "Ops can manage promo codes" ON promo_codes
  FOR ALL TO authenticated
  USING (public.is_platform_staff(auth.uid()))
  WITH CHECK (public.is_platform_staff(auth.uid()));

-- chef_payout_accounts: Ops can read all payout accounts
DROP POLICY IF EXISTS "Ops can read all payout accounts" ON chef_payout_accounts;
CREATE POLICY "Ops can read all payout accounts" ON chef_payout_accounts
  FOR SELECT TO authenticated USING (
    public.is_platform_staff(auth.uid())
    OR chef_id IN (SELECT id FROM chef_profiles WHERE user_id = auth.uid())
  );

-- chef_payouts (conditional — table is added in a later migration)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'chef_payouts' AND table_schema = 'public'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "Ops can read all chef payouts" ON chef_payouts';
    EXECUTE $policy$
      CREATE POLICY "Ops can read all chef payouts" ON chef_payouts
        FOR SELECT TO authenticated USING (
          public.is_platform_staff(auth.uid())
          OR chef_id IN (SELECT id FROM chef_profiles WHERE user_id = auth.uid())
        )
    $policy$;
  END IF;
END $$;

-- ----------------------------------------------------
-- Section C: narrower-helper policies
-- ----------------------------------------------------

-- ledger_entries: tighten SELECT to finance-only.
-- 00007 had ops_agent, ops_manager, finance_admin, super_admin (4 roles,
-- no is_active check). is_finance_staff drops ops_* but adds finance_manager.
-- Engine reads use the service role and bypass RLS, so ops dashboards
-- continue to work via the engine layer. Phase 5 RBAC formalizes this
-- with a finance:read capability.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'ledger_entries' AND table_schema = 'public'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "ledger_entries_finance_view" ON ledger_entries';
    EXECUTE $policy$
      CREATE POLICY "ledger_entries_finance_view" ON ledger_entries
        FOR SELECT TO authenticated
        USING (public.is_finance_staff(auth.uid()))
    $policy$;
  END IF;
END $$;

-- support_tickets: refactor the 00017 policies to use is_support_staff.
-- is_support_staff has the exact 5-role set 00017 used, so this is a
-- behavioral no-op — just DRYs up the policy bodies.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'support_tickets' AND table_schema = 'public'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS "support_tickets_platform_select" ON support_tickets';
    EXECUTE $policy$
      CREATE POLICY "support_tickets_platform_select" ON support_tickets
        FOR SELECT TO authenticated
        USING (public.is_support_staff(auth.uid()))
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS "support_tickets_platform_update" ON support_tickets';
    EXECUTE $policy$
      CREATE POLICY "support_tickets_platform_update" ON support_tickets
        FOR UPDATE TO authenticated
        USING (public.is_support_staff(auth.uid()))
        WITH CHECK (public.is_support_staff(auth.uid()))
    $policy$;
  END IF;
END $$;

-- ==========================================
-- DONE: helpers created, six policies refactored. The pgTAP suite
-- in supabase/tests/rls/role_alignment.sql verifies that:
--   - each helper returns TRUE only for the documented role set
--   - is_*_staff(NULL) returns FALSE
--   - inactive platform_users (is_active=false) get FALSE from all helpers
-- ==========================================
-- VERIFICATION (run after applying both migrations above):
SELECT public.is_platform_staff(NULL) AS should_be_false_1;
SELECT public.is_finance_staff(NULL) AS should_be_false_2;
SELECT public.is_support_staff(NULL) AS should_be_false_3;
SELECT proname FROM pg_proc WHERE proname IN ('is_platform_staff','is_finance_staff','is_support_staff');
