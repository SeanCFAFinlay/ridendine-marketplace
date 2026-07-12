-- ==========================================
-- pgTAP suite for ghost-kitchen (commissary) RLS scope
--
-- Proves the kitchen_id re-scope (00054/00056-00059) actually isolates one
-- operator's commissary from another's, using REAL RLS enforcement (the
-- `authenticated` role + a request.jwt.claims sub), not just direct helper calls.
--
-- Verifies on inventory_items (representative shared-ops table):
--   * operator A: is_operator_of_kitchen(A)=true, (B)=false
--   * operator A sees kitchen-A stock, never kitchen-B stock
--   * operator A may INSERT into kitchen A, is REFUSED (42501) for kitchen B
--   * operator B sees only kitchen-B stock
--   * platform staff (ops) read both kitchens
--   * an authenticated user who owns nothing sees no stock
--
-- Run with:  supabase test db   (or supabase db reset, which runs tests/rls/*)
-- Wrapped in a transaction; ROLLBACK at the end so fixtures never persist.
-- ==========================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap;

SELECT plan(11);

-- ----------------------------------------------------
-- Fixtures (inserted as the test superuser, bypassing RLS)
-- ----------------------------------------------------
INSERT INTO auth.users (id, instance_id, aud, role, email, created_at, updated_at)
VALUES
  ('b0000000-0000-0000-0000-0000000000a1'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'operator_a@test.local', NOW(), NOW()),
  ('b0000000-0000-0000-0000-0000000000b2'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'operator_b@test.local', NOW(), NOW()),
  ('b0000000-0000-0000-0000-00000000005f'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'ops_reader@test.local', NOW(), NOW()),
  ('b0000000-0000-0000-0000-0000000000c3'::uuid, '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated', 'nobody@test.local',     NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

INSERT INTO chef_profiles (id, user_id, display_name, status)
VALUES
  ('c0000000-0000-0000-0000-0000000000a1'::uuid, 'b0000000-0000-0000-0000-0000000000a1'::uuid, 'Operator A', 'approved'),
  ('c0000000-0000-0000-0000-0000000000b2'::uuid, 'b0000000-0000-0000-0000-0000000000b2'::uuid, 'Operator B', 'approved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO chef_kitchens (id, chef_id, name, address_line1, city, state, postal_code, country)
VALUES
  ('d0000000-0000-0000-0000-0000000000a1'::uuid, 'c0000000-0000-0000-0000-0000000000a1'::uuid, 'Commissary A', '1 A St', 'Hamilton', 'ON', 'L8P1A1', 'CA'),
  ('d0000000-0000-0000-0000-0000000000b2'::uuid, 'c0000000-0000-0000-0000-0000000000b2'::uuid, 'Commissary B', '2 B St', 'Hamilton', 'ON', 'L8P1B2', 'CA')
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_items (id, kitchen_id, name)
VALUES
  ('e0000000-0000-0000-0000-0000000000a1'::uuid, 'd0000000-0000-0000-0000-0000000000a1'::uuid, 'Flour (A)'),
  ('e0000000-0000-0000-0000-0000000000b2'::uuid, 'd0000000-0000-0000-0000-0000000000b2'::uuid, 'Flour (B)')
ON CONFLICT (id) DO NOTHING;

-- Platform staff reader
INSERT INTO platform_users (user_id, email, name, role, is_active)
VALUES
  ('b0000000-0000-0000-0000-00000000005f'::uuid, 'ops_reader@test.local', 'Ops Reader', 'ops_admin', TRUE)
ON CONFLICT (user_id) DO NOTHING;

-- ----------------------------------------------------
-- Operator A
-- ----------------------------------------------------
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);

SELECT is(
  public.is_operator_of_kitchen('d0000000-0000-0000-0000-0000000000a1'::uuid), TRUE,
  'operator A is_operator_of_kitchen(A) → true'
);
SELECT is(
  public.is_operator_of_kitchen('d0000000-0000-0000-0000-0000000000b2'::uuid), FALSE,
  'operator A is_operator_of_kitchen(B) → false'
);
SELECT ok(
  EXISTS (SELECT 1 FROM inventory_items WHERE id = 'e0000000-0000-0000-0000-0000000000a1'::uuid),
  'operator A can read kitchen-A stock'
);
SELECT ok(
  NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = 'e0000000-0000-0000-0000-0000000000b2'::uuid),
  'operator A cannot read kitchen-B stock'
);
SELECT lives_ok(
  $$ INSERT INTO inventory_items (kitchen_id, name) VALUES ('d0000000-0000-0000-0000-0000000000a1'::uuid, 'Sugar (A)') $$,
  'operator A may insert into kitchen A'
);
SELECT throws_ok(
  $$ INSERT INTO inventory_items (kitchen_id, name) VALUES ('d0000000-0000-0000-0000-0000000000b2'::uuid, 'Sugar into B') $$,
  '42501',
  NULL,
  'operator A is refused inserting into kitchen B (RLS)'
);

-- ----------------------------------------------------
-- Operator B
-- ----------------------------------------------------
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-0000000000b2', 'role', 'authenticated')::text, true);

SELECT ok(
  EXISTS (SELECT 1 FROM inventory_items WHERE id = 'e0000000-0000-0000-0000-0000000000b2'::uuid),
  'operator B can read kitchen-B stock'
);
SELECT ok(
  NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = 'e0000000-0000-0000-0000-0000000000a1'::uuid),
  'operator B cannot read kitchen-A stock'
);

-- ----------------------------------------------------
-- Platform staff (ops) reads all
-- ----------------------------------------------------
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-00000000005f', 'role', 'authenticated')::text, true);

SELECT ok(
  EXISTS (SELECT 1 FROM inventory_items WHERE id = 'e0000000-0000-0000-0000-0000000000a1'::uuid)
  AND EXISTS (SELECT 1 FROM inventory_items WHERE id = 'e0000000-0000-0000-0000-0000000000b2'::uuid),
  'platform staff reads both kitchens'
);

-- ----------------------------------------------------
-- Authenticated user who owns nothing
-- ----------------------------------------------------
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', json_build_object('sub', 'b0000000-0000-0000-0000-0000000000c3', 'role', 'authenticated')::text, true);

SELECT is(
  (SELECT count(*) FROM inventory_items
    WHERE id IN ('e0000000-0000-0000-0000-0000000000a1'::uuid, 'e0000000-0000-0000-0000-0000000000b2'::uuid))::int,
  0,
  'a non-owner authenticated user sees no kitchen stock'
);

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
