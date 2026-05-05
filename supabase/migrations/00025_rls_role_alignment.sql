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
