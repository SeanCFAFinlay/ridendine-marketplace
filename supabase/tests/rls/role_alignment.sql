-- ==========================================
-- pgTAP suite for Phase 2 RLS helper functions (00025)
--
-- Verifies:
--   1. is_platform_staff / is_finance_staff / is_support_staff return
--      the correct boolean for each role in platform_users.role.
--   2. NULL uid → FALSE for all three.
--   3. is_active = FALSE → FALSE for all three (even if role matches).
--   4. A uid with no platform_users row → FALSE for all three.
--   5. Sample policy refactors actually use the helpers (smoke test:
--      ledger_entries_finance_view exists and references is_finance_staff;
--      support_tickets_platform_select references is_support_staff).
--
-- Run with:  supabase test db
--
-- Wraps everything in a transaction; ROLLBACK at the end so test
-- fixtures do not persist.
-- ==========================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(33);

-- ----------------------------------------------------
-- Fixtures: 8 auth.users + matching platform_users rows
-- (one per platform_users.role CHECK value, plus one inactive)
-- ----------------------------------------------------

-- Use deterministic UUIDs so assertions are readable.
-- Suffix encodes the role: 1=ops_admin, 2=ops_agent, 3=ops_manager,
-- 4=super_admin, 5=support_agent, 6=finance_admin, 7=finance_manager,
-- 8=support (legacy), 9=inactive ops_admin.

INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ops_admin@test.local',       NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ops_agent@test.local',       NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000003'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ops_manager@test.local',     NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000004'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'super_admin@test.local',     NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000005'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'support_agent@test.local',   NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000006'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'finance_admin@test.local',   NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000007'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'finance_manager@test.local', NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000008'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'support_legacy@test.local',  NOW(), NOW()),
  ('aaaaaaaa-0000-0000-0000-000000000009'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'inactive_admin@test.local',  NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO platform_users (user_id, email, name, role, is_active)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001'::uuid, 'ops_admin@test.local',       'Test OpsAdmin',      'ops_admin',       TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000002'::uuid, 'ops_agent@test.local',       'Test OpsAgent',      'ops_agent',       TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000003'::uuid, 'ops_manager@test.local',     'Test OpsManager',    'ops_manager',     TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000004'::uuid, 'super_admin@test.local',     'Test SuperAdmin',    'super_admin',     TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000005'::uuid, 'support_agent@test.local',   'Test SupportAgent',  'support_agent',   TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000006'::uuid, 'finance_admin@test.local',   'Test FinanceAdmin',  'finance_admin',   TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000007'::uuid, 'finance_manager@test.local', 'Test FinanceMgr',    'finance_manager', TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000008'::uuid, 'support_legacy@test.local',  'Test SupportLegacy', 'support',         TRUE),
  ('aaaaaaaa-0000-0000-0000-000000000009'::uuid, 'inactive_admin@test.local',  'Test InactiveAdmin', 'ops_admin',       FALSE)
ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------------------------------
-- is_platform_staff: TRUE for all 7 active platform roles,
-- FALSE for legacy 'support' (not in helper's role list),
-- FALSE for inactive, FALSE for NULL.
-- ----------------------------------------------------

SELECT is(public.is_platform_staff('aaaaaaaa-0000-0000-0000-000000000001'::uuid), TRUE,  'is_platform_staff: ops_admin → true');
SELECT is(public.is_platform_staff('aaaaaaaa-0000-0000-0000-000000000002'::uuid), TRUE,  'is_platform_staff: ops_agent → true');
SELECT is(public.is_platform_staff('aaaaaaaa-0000-0000-0000-000000000003'::uuid), TRUE,  'is_platform_staff: ops_manager → true');
SELECT is(public.is_platform_staff('aaaaaaaa-0000-0000-0000-000000000004'::uuid), TRUE,  'is_platform_staff: super_admin → true');
SELECT is(public.is_platform_staff('aaaaaaaa-0000-0000-0000-000000000005'::uuid), TRUE,  'is_platform_staff: support_agent → true');
SELECT is(public.is_platform_staff('aaaaaaaa-0000-0000-0000-000000000006'::uuid), TRUE,  'is_platform_staff: finance_admin → true');
SELECT is(public.is_platform_staff('aaaaaaaa-0000-0000-0000-000000000007'::uuid), TRUE,  'is_platform_staff: finance_manager → true');
SELECT is(public.is_platform_staff('aaaaaaaa-0000-0000-0000-000000000008'::uuid), FALSE, 'is_platform_staff: legacy "support" → false (not in helper''s role set)');
SELECT is(public.is_platform_staff('aaaaaaaa-0000-0000-0000-000000000009'::uuid), FALSE, 'is_platform_staff: inactive ops_admin → false');
SELECT is(public.is_platform_staff(NULL),                                          FALSE, 'is_platform_staff: NULL uid → false');
SELECT is(public.is_platform_staff('00000000-0000-0000-0000-deadbeefdead'::uuid),  FALSE, 'is_platform_staff: non-existent uid → false');

-- ----------------------------------------------------
-- is_finance_staff: TRUE only for finance_admin, finance_manager,
-- super_admin. FALSE for everything else.
-- ----------------------------------------------------

SELECT is(public.is_finance_staff('aaaaaaaa-0000-0000-0000-000000000001'::uuid), FALSE, 'is_finance_staff: ops_admin → false');
SELECT is(public.is_finance_staff('aaaaaaaa-0000-0000-0000-000000000002'::uuid), FALSE, 'is_finance_staff: ops_agent → false');
SELECT is(public.is_finance_staff('aaaaaaaa-0000-0000-0000-000000000004'::uuid), TRUE,  'is_finance_staff: super_admin → true');
SELECT is(public.is_finance_staff('aaaaaaaa-0000-0000-0000-000000000005'::uuid), FALSE, 'is_finance_staff: support_agent → false');
SELECT is(public.is_finance_staff('aaaaaaaa-0000-0000-0000-000000000006'::uuid), TRUE,  'is_finance_staff: finance_admin → true');
SELECT is(public.is_finance_staff('aaaaaaaa-0000-0000-0000-000000000007'::uuid), TRUE,  'is_finance_staff: finance_manager → true');
SELECT is(public.is_finance_staff('aaaaaaaa-0000-0000-0000-000000000009'::uuid), FALSE, 'is_finance_staff: inactive ops_admin → false');
SELECT is(public.is_finance_staff(NULL),                                          FALSE, 'is_finance_staff: NULL uid → false');
SELECT is(public.is_finance_staff('00000000-0000-0000-0000-deadbeefdead'::uuid),  FALSE, 'is_finance_staff: non-existent uid → false');

-- ----------------------------------------------------
-- is_support_staff: TRUE for support_agent + ops_* + super_admin.
-- FALSE for finance roles and legacy 'support'.
-- ----------------------------------------------------

SELECT is(public.is_support_staff('aaaaaaaa-0000-0000-0000-000000000001'::uuid), TRUE,  'is_support_staff: ops_admin → true');
SELECT is(public.is_support_staff('aaaaaaaa-0000-0000-0000-000000000002'::uuid), TRUE,  'is_support_staff: ops_agent → true');
SELECT is(public.is_support_staff('aaaaaaaa-0000-0000-0000-000000000003'::uuid), TRUE,  'is_support_staff: ops_manager → true');
SELECT is(public.is_support_staff('aaaaaaaa-0000-0000-0000-000000000004'::uuid), TRUE,  'is_support_staff: super_admin → true');
SELECT is(public.is_support_staff('aaaaaaaa-0000-0000-0000-000000000005'::uuid), TRUE,  'is_support_staff: support_agent → true');
SELECT is(public.is_support_staff('aaaaaaaa-0000-0000-0000-000000000006'::uuid), FALSE, 'is_support_staff: finance_admin → false');
SELECT is(public.is_support_staff('aaaaaaaa-0000-0000-0000-000000000008'::uuid), FALSE, 'is_support_staff: legacy "support" → false');
SELECT is(public.is_support_staff('aaaaaaaa-0000-0000-0000-000000000009'::uuid), FALSE, 'is_support_staff: inactive ops_admin → false');
SELECT is(public.is_support_staff(NULL),                                          FALSE, 'is_support_staff: NULL uid → false');

-- ----------------------------------------------------
-- Smoke checks: refactored policies actually use the helpers
-- ----------------------------------------------------

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'ledger_entries'
      AND policyname = 'ledger_entries_finance_view'
      AND qual ILIKE '%is_finance_staff%'
  ),
  'ledger_entries_finance_view policy uses is_finance_staff'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'support_tickets'
      AND policyname = 'support_tickets_platform_select'
      AND qual ILIKE '%is_support_staff%'
  ),
  'support_tickets_platform_select policy uses is_support_staff'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'driver_locations'
      AND policyname = 'Ops can read all driver locations'
      AND qual ILIKE '%is_platform_staff%'
  ),
  'driver_locations "Ops can read all driver locations" policy uses is_platform_staff'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'promo_codes'
      AND policyname = 'Ops can manage promo codes'
      AND qual ILIKE '%is_platform_staff%'
  ),
  'promo_codes "Ops can manage promo codes" policy uses is_platform_staff'
);

SELECT * FROM finish();

ROLLBACK;
