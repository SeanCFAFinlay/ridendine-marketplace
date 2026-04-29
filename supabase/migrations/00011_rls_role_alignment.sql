-- ==========================================
-- RLS ROLE ALIGNMENT MIGRATION
-- FND-020 fix: Align RLS policies with expanded role set
--
-- The platform_users.role CHECK constraint was expanded in 00010 to include:
--   ops_admin, ops_agent, ops_manager, super_admin, support, finance_admin
-- But several RLS policies still only check for 'ops_admin'.
-- This migration updates those policies to include all ops roles.
-- ==========================================

-- driver_locations: update ops read policy to include all ops roles
DROP POLICY IF EXISTS "Ops can read all driver locations" ON driver_locations;
CREATE POLICY "Ops can read all driver locations" ON driver_locations
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_admin', 'ops_agent', 'ops_manager', 'super_admin')
      AND is_active = true
    )
    OR driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
  );

-- promo_codes: allow ops roles to manage (not just read)
DROP POLICY IF EXISTS "Ops can manage promo codes" ON promo_codes;
CREATE POLICY "Ops can manage promo codes" ON promo_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_admin', 'ops_agent', 'ops_manager', 'finance_admin', 'super_admin')
      AND is_active = true
    )
  );

-- chef_payout_accounts: allow ops to read all
DROP POLICY IF EXISTS "Ops can read all payout accounts" ON chef_payout_accounts;
CREATE POLICY "Ops can read all payout accounts" ON chef_payout_accounts
  FOR SELECT TO authenticated USING (
    chef_id IN (SELECT id FROM chef_profiles WHERE user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM platform_users
      WHERE user_id = auth.uid()
      AND role IN ('ops_admin', 'ops_agent', 'ops_manager', 'finance_admin', 'super_admin')
      AND is_active = true
    )
  );

-- chef_payouts: allow finance/ops to read all (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chef_payouts' AND table_schema = 'public') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Ops can read all chef payouts" ON chef_payouts';
    EXECUTE $policy$
      CREATE POLICY "Ops can read all chef payouts" ON chef_payouts
        FOR SELECT TO authenticated USING (
          chef_id IN (SELECT id FROM chef_profiles WHERE user_id = auth.uid())
          OR EXISTS (
            SELECT 1 FROM platform_users
            WHERE user_id = auth.uid()
            AND role IN ('ops_admin', 'ops_agent', 'ops_manager', 'finance_admin', 'super_admin')
            AND is_active = true
          )
        )
    $policy$;
  END IF;
END $$;

-- notifications: allow system/ops to insert for any user
DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT TO authenticated
  WITH CHECK (true);
