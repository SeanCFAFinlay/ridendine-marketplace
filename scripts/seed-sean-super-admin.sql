-- ============================================================
-- Seed: sean@ridendine.ca as multi-role test super-admin
-- ============================================================
-- Run this against any environment (local, staging, preview) to either
-- CREATE or PROMOTE sean@ridendine.ca to a user with super-admin powers
-- AND the rows needed to exercise all 4 apps (web, chef-admin, ops-admin,
-- driver-app) on a single login.
--
-- Password: password123 (set via crypt+bcrypt)
-- Idempotent — safe to re-run.
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/seed-sean-super-admin.sql
-- or via Supabase CLI:
--   supabase db execute --file scripts/seed-sean-super-admin.sql
-- ============================================================

-- 1. auth.users — create if missing, promote to super_admin either way.
INSERT INTO auth.users (
  id, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  is_super_admin, role
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'sean@ridendine.ca',
  crypt('password123', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"],"role":"super_admin"}'::jsonb,
  '{"display_name":"Sean","role":"super_admin"}'::jsonb,
  true,
  'authenticated'
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  raw_app_meta_data = EXCLUDED.raw_app_meta_data,
  raw_user_meta_data = EXCLUDED.raw_user_meta_data,
  is_super_admin = true,
  updated_at = NOW();

-- 2. platform_users — required for ops-admin dashboard access.
INSERT INTO platform_users (
  id, user_id, email, name, role, is_active, created_at, updated_at
)
VALUES (
  '90000000-0000-0000-0000-000000000002',
  '11111111-1111-1111-1111-111111111111',
  'sean@ridendine.ca',
  'Sean (Test Super Admin)',
  'super_admin',
  true,
  NOW(), NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = 'super_admin',
  is_active = true,
  updated_at = NOW();

-- 3. chef_profiles — required for chef-admin dashboard access.
INSERT INTO chef_profiles (
  id, user_id, display_name, phone, bio, status, created_at, updated_at
)
VALUES (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Sean',
  '+1 (905) 555-0101',
  'Hamilton-born chef with a passion for bold comfort food.',
  'approved',
  NOW(), NOW()
)
ON CONFLICT (id) DO UPDATE SET
  status = 'approved',
  updated_at = NOW();

-- 4. customers — required for placing orders in the marketplace.
INSERT INTO customers (
  id, user_id, first_name, last_name, email, phone, created_at, updated_at
)
VALUES (
  '11111111-2222-3333-aaaa-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Sean', 'Finlay',
  'sean@ridendine.ca',
  '+1 (905) 555-0101',
  NOW(), NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  updated_at = NOW();

-- 5. customer_addresses — one default address so cart/checkout work.
INSERT INTO customer_addresses (
  id, customer_id, label, address_line1, city, state, postal_code, country,
  is_default, created_at, updated_at
)
VALUES (
  '11111111-2222-3333-bbbb-000000000001',
  '11111111-2222-3333-aaaa-000000000001',
  'Home', '500 James St N', 'Hamilton', 'ON', 'L8L 1J5', 'CA',
  true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- 6. drivers — required for driver PWA access.
INSERT INTO drivers (
  id, user_id, first_name, last_name, phone, email, status, created_at, updated_at
)
VALUES (
  '11111111-2222-3333-cccc-000000000001',
  '11111111-1111-1111-1111-111111111111',
  'Sean', 'Finlay',
  '+1 (905) 555-0101',
  'sean@ridendine.ca',
  'approved',
  NOW(), NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  status = 'approved',
  updated_at = NOW();

-- 7. driver_vehicles — one active vehicle so driver-app considers him eligible.
INSERT INTO driver_vehicles (
  id, driver_id, vehicle_type, make, model, year, color, license_plate,
  is_active, created_at, updated_at
)
VALUES (
  '11111111-2222-3333-dddd-000000000001',
  '11111111-2222-3333-cccc-000000000001',
  'car', 'Tesla', 'Model 3', 2023, 'Black', 'TEST 001',
  true, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- Verification queries (uncomment to run after seeding):
-- ============================================================
-- SELECT id, email, is_super_admin, raw_app_meta_data->>'role' AS role
--   FROM auth.users WHERE email = 'sean@ridendine.ca';
-- SELECT id, email, role, is_active FROM platform_users WHERE email = 'sean@ridendine.ca';
-- SELECT id, status FROM chef_profiles WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- SELECT id, status FROM drivers WHERE user_id = '11111111-1111-1111-1111-111111111111';
-- SELECT id FROM customers WHERE user_id = '11111111-1111-1111-1111-111111111111';
