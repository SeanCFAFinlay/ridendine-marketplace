-- ============================================================
-- RideNDine Seed Data — Schema-Compliant
-- 4 Chefs (3 approved, 1 pending) | 3 Storefronts | 15 Dishes
-- 2 Customers | 2 Drivers | 8 Orders | Deliveries (incl. 1 unassigned pending)
-- 1 pending driver offer | 1 pending refund case
-- ============================================================
--
-- DETERMINISTIC SEED ID SCHEME (all ids are valid UUID literals)
-- ------------------------------------------------------------
-- The old human-readable fake ids (kit-…, ord-…, osh-…, …) were NOT valid
-- UUIDs and failed on Postgres uuid columns. They were mapped 1:1 to valid
-- UUIDs with this stable, traceable pattern:
--
--   <entity-prefix>-<group>-4000-8000-<zero-padded sequence>
--
--   Entity (1st segment)            New prefix   Old prefix  Mnemonic
--   chef_kitchens                   aa000000     kit-        —
--   menu_categories                 ca700000     cat-        "ca7" = cat
--   menu_items                      17e30000     item-       "17e" ≈ ite(m)
--   customers                       c0570000     cust-       "c057" ≈ cust
--   customer_addresses              add20000     addr-       "add2" ≈ addr
--   drivers                         d2000000     drv-        "d2" ≈ dr
--   driver_vehicles                 f1ee0000     veh-        "f1ee" ≈ flee(t)
--   orders                          0d000000     ord-        "0d" ≈ o(r)d
--   order_items                     01000000     oi-         "01" ≈ oi
--   order_status_history            05000000     osh-        "05" ≈ os(h)
--   deliveries                      de100000     del-        "de1" = del
--   reviews                         ee000000     rev-        —
--   assignment_attempts             0ffe0000     —           "0ffe" ≈ offe(r)
--   refund_cases                    ca5e0000     —           "ca5e" ≈ case
--
--   Group (2nd segment):
--     * menu_categories / menu_items / chef_kitchens: storefront code
--       0001 = every-bite-yum, 0002 = hoang-gia-pho, 0003 = cooco
--     * order_items / order_status_history: parent order sequence (0001–0006)
--     * everything else: 0000
--   3rd/4th segments are always 4000/8000 (v4-shaped). Last segment keeps the
--   old sequence number, zero-padded (e.g. old '01000000-0003-4000-8000-000000000002' → order 3, item 2 →
--   '01000000-0003-4000-8000-000000000002').
--
-- Ids that were ALREADY valid UUIDs are unchanged (auth.users 0…/1…/…/8…,
-- platform_users 90000000-…, chef_profiles aaaa…/bbbb…/cccc…/a1a1…,
-- storefronts dddd…/eeee…/ffff…, Sean multi-role rows 11111111-2222-3333-*,
-- unassigned delivery b2b2…).
-- Guard: scripts/e2e/validate-seed-uuids.mjs (pnpm e2e:validate-seed).
-- ============================================================

-- ============================================================
-- SECTION 1: AUTH USERS
-- ============================================================

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'ops@ridendine.ca', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"super_admin"}',
   '{"display_name":"RideNDine Ops","role":"super_admin"}', true, 'authenticated'),
  -- sean@ridendine.ca — multi-role test super-admin.
  -- Promoted to super_admin AND retains chef profile + storefront, plus has
  -- customer and driver rows below so one login (password123) can exercise
  -- all 4 apps (customer marketplace, chef-admin, ops-admin, driver-app).
  ('11111111-1111-1111-1111-111111111111', 'sean@ridendine.ca', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"super_admin"}',
   '{"display_name":"Sean","role":"super_admin"}', true, 'authenticated'),
  ('22222222-2222-2222-2222-222222222222', 'tuan@ridendine.ca', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"chef"}',
   '{"display_name":"Tuan","role":"chef"}', false, 'authenticated'),
  ('33333333-3333-3333-3333-333333333333', 'ryo@ridendine.ca', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"chef"}',
   '{"display_name":"Ryo","role":"chef"}', false, 'authenticated'),
  ('44444444-4444-4444-4444-444444444444', 'alice@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"customer"}',
   '{"display_name":"Alice","role":"customer"}', false, 'authenticated'),
  ('55555555-5555-5555-5555-555555555555', 'bob@example.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"customer"}',
   '{"display_name":"Bob","role":"customer"}', false, 'authenticated'),
  ('66666666-6666-6666-6666-666666666666', 'mike.driver@ridendine.ca', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"driver"}',
   '{"display_name":"Mike Chen","role":"driver"}', false, 'authenticated'),
  ('77777777-7777-7777-7777-777777777777', 'sarah.driver@ridendine.ca', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"driver"}',
   '{"display_name":"Sarah Kim","role":"driver"}', false, 'authenticated'),
  -- Pending-approval chef — used by ops "approve chef" lifecycle test
  ('88888888-8888-8888-8888-888888888888', 'pending.chef@ridendine.ca', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"chef"}',
   '{"display_name":"Pending Chef","role":"chef"}', false, 'authenticated')
ON CONFLICT (id) DO NOTHING;

-- GoTrue requirements for password sign-in on directly-seeded users:
--   * instance_id + aud must match what the auth server queries on.
--   * The token/change columns must be empty strings, not NULL — GoTrue's row
--     scan errors on NULLs ("converting NULL to string is unsupported"),
--     which surfaces as a failed login.
UPDATE auth.users SET
  instance_id = '00000000-0000-0000-0000-000000000000',
  aud = 'authenticated',
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change = COALESCE(email_change, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, '')
WHERE id IN (
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888'
);

-- Email/password sign-in also requires a matching auth.identities row per
-- user (provider 'email'); GoTrue rejects credentials without one.
INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
SELECT
  u.id::text,
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email',
  NOW(), NOW(), NOW()
FROM auth.users u
WHERE u.id IN (
  '00000000-0000-0000-0000-000000000001',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  '44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555',
  '66666666-6666-6666-6666-666666666666',
  '77777777-7777-7777-7777-777777777777',
  '88888888-8888-8888-8888-888888888888'
)
ON CONFLICT (provider_id, provider) DO NOTHING;

-- ============================================================
-- SECTION 1B: PLATFORM USERS
-- ============================================================

INSERT INTO platform_users (id, user_id, email, name, role, is_active, created_at, updated_at)
VALUES
  ('90000000-0000-0000-0000-000000000001',
   '00000000-0000-0000-0000-000000000001',
   'ops@ridendine.ca',
   'RideNDine Ops',
   'super_admin',
   true,
   NOW() - INTERVAL '120 days',
   NOW()),
  -- sean@ridendine.ca super-admin entry — unlocks ops-admin dashboard for the
  -- multi-role test user. He also has a chef_profile, customer row, and
  -- driver row below so one login exercises all 4 apps.
  ('90000000-0000-0000-0000-000000000002',
   '11111111-1111-1111-1111-111111111111',
   'sean@ridendine.ca',
   'Sean (Test Super Admin)',
   'super_admin',
   true,
   NOW() - INTERVAL '120 days',
   NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 2: CHEF PROFILES
-- ============================================================

INSERT INTO chef_profiles (id, user_id, display_name, phone, bio, status, created_at, updated_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '11111111-1111-1111-1111-111111111111',
   'Sean',
   '+1 (905) 555-0101',
   'Hamilton-born chef with a passion for bold comfort food. Every dish is made with love and a whole lot of flavour.',
   'approved',
   NOW() - INTERVAL '90 days', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   '22222222-2222-2222-2222-222222222222',
   'Tuan',
   '+1 (905) 555-0202',
   'Authentic Vietnamese royal cuisine from Huế. Slow-cooked broths, hand-crafted noodle soups, and traditional family recipes.',
   'approved',
   NOW() - INTERVAL '60 days', NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc',
   '33333333-3333-3333-3333-333333333333',
   'Bếp Bà Muối (Ba Muoi Kitchen)',
   '+1 (289) 556-4905',
   'Homemade Vietnamese catering in Hamilton — fresh, slow-cooked, and made to order. Specializing in traditional noodle soups, broken rice plates, vegetarian delicacies, party trays, and sweet chè.',
   'approved',
   NOW() - INTERVAL '45 days', NOW()),
  -- Pending-approval chef — required by ops "approve chef" lifecycle Playwright test (Phase 11).
  -- Deterministic UUID: a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1
  ('a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
   '88888888-8888-8888-8888-888888888888',
   'Pending Chef',
   '+1 (905) 555-0404',
   'A new chef awaiting platform approval.',
   -- chef_profiles_status_check allows pending|approved|rejected|suspended;
   -- 'pending_approval' is storefront-governance vocabulary, not a chef status.
   'pending',
   NOW() - INTERVAL '1 day', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 3: CHEF KITCHENS (required FK for storefronts)
-- ============================================================

INSERT INTO chef_kitchens (id, chef_id, name, address_line1, city, state, postal_code, country, is_verified, created_at, updated_at)
VALUES
  ('aa000000-0001-4000-8000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Every Bite Yum Kitchen',
   '123 King St W', 'Hamilton', 'ON', 'L8P 1A1', 'CA',
   true, NOW() - INTERVAL '90 days', NOW()),
  ('aa000000-0002-4000-8000-000000000002',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'HOÀNG GIA PHỞ Kitchen',
   '456 Barton St E', 'Hamilton', 'ON', 'L8L 2Y5', 'CA',
   true, NOW() - INTERVAL '60 days', NOW()),
  ('aa000000-0003-4000-8000-000000000003',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'Bếp Bà Muối Kitchen',
   'Pick up near Eastgate Square, Queenston Rd', 'Hamilton', 'ON', 'L8G 2B4', 'CA',
   true, NOW() - INTERVAL '45 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 4: CHEF STOREFRONTS
-- ============================================================

INSERT INTO chef_storefronts (
  id, chef_id, kitchen_id, slug, name, description, cuisine_types,
  cover_image_url, logo_url,
  is_active, is_featured,
  estimated_prep_time_min, estimated_prep_time_max,
  min_order_amount,
  average_rating, total_reviews,
  created_at, updated_at
)
VALUES
  -- Every Bite Yum (Sean)
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'aa000000-0001-4000-8000-000000000001',
   'every-bite-yum',
   'Every Bite Yum',
   'Bold comfort food made with love. Smash burgers, Nashville hot chicken, and creative Canadian-fusion dishes that make every bite count.',
   ARRAY['Comfort Food', 'Canadian', 'Fusion', 'Burgers'],
   'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
   NULL,
   true, true,
   25, 45,
   20.00,
   4.8, 24,
   NOW() - INTERVAL '90 days', NOW()),

  -- HOÀNG GIA PHỞ (Tuan)
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'aa000000-0002-4000-8000-000000000002',
   'hoang-gia-pho',
   'HOÀNG GIA PHỞ',
   'Authentic Vietnamese royal cuisine from Huế. Slow-cooked broths simmered for 12+ hours, hand-crafted noodle soups, and traditional dishes that bring the flavours of Vietnam to your door.',
   ARRAY['Vietnamese', 'Phở', 'Noodle Soups', 'Asian'],
   'https://images.unsplash.com/photo-1555126634-323283e090fa?w=800&q=80',
   NULL,
   true, true,
   30, 60,
   25.00,
   4.9, 38,
   NOW() - INTERVAL '60 days', NOW()),

  -- Bếp Bà Muối (Cooco Partner)
  ('ffffffff-ffff-ffff-ffff-ffffffffffff',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'aa000000-0003-4000-8000-000000000003',
   'bep-ba-muoi',
   'Bếp Bà Muối (Ba Muoi Kitchen)',
   'Official Cooco partner chef in Hamilton. Authentic Vietnamese home cooking, fresh slow-cooked noodle soups, broken rice plates, vegetarian delicacies, party trays, and sweet chè. Homemade by Bếp Bà Muối (cooco.app).',
   ARRAY['Vietnamese', 'Cooco Partner', 'Home Cooking', 'Catering', 'Noodles', 'Party Trays', 'Asian'],
   '/chefs/bep-ba-muoi/cover.png',
   '/chefs/bep-ba-muoi/avatar.png',
   true, true,
   25, 45,
   20.00,
   4.9, 42,
   NOW() - INTERVAL '45 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 5: MENU CATEGORIES
-- ============================================================

INSERT INTO menu_categories (id, storefront_id, name, description, sort_order, is_active, created_at, updated_at)
VALUES
  ('ca700000-0001-4000-8000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Burgers & Sandwiches', 'Hand-crafted smash burgers and loaded sandwiches', 1, true, NOW(), NOW()),
  ('ca700000-0001-4000-8000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Chicken', 'Nashville hot, crispy, and saucy chicken dishes', 2, true, NOW(), NOW()),
  ('ca700000-0002-4000-8000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Phở & Noodle Soups', 'Slow-cooked broths and hand-crafted noodle soups', 1, true, NOW(), NOW()),
  ('ca700000-0002-4000-8000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Rice & Vermicelli', 'Traditional rice and vermicelli dishes', 2, true, NOW(), NOW()),
  ('ca700000-0003-4000-8000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Main Dishes — Rice & Noodles', 'Authentic Vietnamese slow-cooked noodle soups and hearty broken-rice plates (4 servings)', 1, true, NOW(), NOW()),
  ('ca700000-0003-4000-8000-000000000002', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Vegetarian', 'Plant-based authentic Vietnamese dishes, fresh tofu and braised vegetable specialties', 2, true, NOW(), NOW()),
  ('ca700000-0003-4000-8000-000000000003', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Bánh Mì, Sticky Rice & Party Trays', 'Party trays, savoury sticky rice, and specialty platters for family gatherings', 3, true, NOW(), NOW()),
  ('ca700000-0003-4000-8000-000000000004', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Desserts & Sweet Soups', 'Traditional Vietnamese chè sweet soups and homemade desserts', 4, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 6: MENU ITEMS (5 per storefront = 15 total)
-- ============================================================

INSERT INTO menu_items (
  id, storefront_id, category_id, name, description,
  price, image_url, is_available, is_featured,
  dietary_tags, prep_time_minutes, sort_order,
  created_at, updated_at
)
VALUES
  -- EVERY BITE YUM (Sean) — 5 dishes
  ('17e30000-0001-4000-8000-000000000001', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'ca700000-0001-4000-8000-000000000001',
   'Classic Smash Burger',
   'Double smash patties, American cheese, caramelized onions, house sauce, brioche bun. Crispy edges, juicy centre.',
   18.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
   true, true, ARRAY[]::text[], 20, 1, NOW(), NOW()),

  ('17e30000-0001-4000-8000-000000000002', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'ca700000-0001-4000-8000-000000000001',
   'BBQ Bacon Smash Burger',
   'Double smash patties, crispy bacon, aged cheddar, smoky BBQ sauce, pickled jalapeños, brioche bun.',
   21.99, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80',
   true, false, ARRAY[]::text[], 22, 2, NOW(), NOW()),

  ('17e30000-0001-4000-8000-000000000003', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'ca700000-0001-4000-8000-000000000002',
   'Nashville Hot Chicken Sandwich',
   'Crispy fried chicken thigh, Nashville hot sauce, coleslaw, pickles, brioche bun. Spicy, crunchy, and addictive.',
   19.99, 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80',
   true, true, ARRAY[]::text[], 25, 3, NOW(), NOW()),

  ('17e30000-0001-4000-8000-000000000004', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'ca700000-0001-4000-8000-000000000002',
   'Crispy Chicken Tenders (4pc)',
   'Hand-breaded chicken tenders, golden crispy, served with your choice of dipping sauce.',
   16.99, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 4, NOW(), NOW()),

  ('17e30000-0001-4000-8000-000000000005', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'ca700000-0001-4000-8000-000000000001',
   'Mushroom Swiss Smash Burger',
   'Double smash patties, sautéed mushrooms, Swiss cheese, garlic aioli, arugula, brioche bun.',
   20.99, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&q=80',
   true, false, ARRAY[]::text[], 22, 5, NOW(), NOW()),

  -- HOÀNG GIA PHỞ (Tuan) — 5 dishes
  ('17e30000-0002-4000-8000-000000000001', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ca700000-0002-4000-8000-000000000001',
   'Beef Phở (Phở Bò)',
   'Slow-simmered beef bone broth (12+ hours), rice noodles, tender beef slices, brisket, and meatballs. Serves 2.',
   28.00, 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80',
   true, true, ARRAY['Gluten-Free Option']::text[], 45, 1, NOW(), NOW()),

  ('17e30000-0002-4000-8000-000000000002', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ca700000-0002-4000-8000-000000000001',
   'Chicken Phở (Phở Gà)',
   'Light and fragrant chicken broth, rice noodles, poached chicken breast, fresh ginger. Serves 2.',
   26.00, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, false, ARRAY['Gluten-Free Option']::text[], 40, 2, NOW(), NOW()),

  ('17e30000-0002-4000-8000-000000000003', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ca700000-0002-4000-8000-000000000001',
   'Authentic Huế Beef Noodle Soup (Bún Bò Huế)',
   'Spicy lemongrass beef broth, thick round noodles, beef shank, pork hock. A royal dish from the ancient capital of Huế. Serves 2.',
   32.00, 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80',
   true, true, ARRAY[]::text[], 50, 3, NOW(), NOW()),

  ('17e30000-0002-4000-8000-000000000004', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ca700000-0002-4000-8000-000000000002',
   'Stir-Fried Pork Vermicelli (Bún Thịt Xào)',
   'Grilled lemongrass pork, crispy spring rolls, vermicelli noodles, fresh herbs, pickled vegetables, house fish sauce dressing. Serves 2.',
   24.00, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
   true, false, ARRAY[]::text[], 30, 4, NOW(), NOW()),

  ('17e30000-0002-4000-8000-000000000005', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'ca700000-0002-4000-8000-000000000002',
   'Vietnamese Beef Stew (Bò Kho)',
   'Slow-braised beef shank in aromatic lemongrass and star anise broth. Served with bánh mì or noodles. Serves 2.',
   30.00, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 45, 5, NOW(), NOW()),

  -- Bếp Bà Muối (Ba Muoi Kitchen) — 55 authentic Vietnamese dishes
  ('17e30000-0003-4000-8000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Rice with Grilled Pork Chop, Shredded Pork Skin & Steamed Egg Meatloaf (Cơm sườn bì chả)',
   'Broken-rice classic with grilled pork chop, shredded pork skin and steamed egg meatloaf. Chicken can be substituted. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-6.jpg',
   true, true, ARRAY[]::text[], 30, 1, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000002', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Vietnamese Beef Stew (Bò kho)',
   'Slow-braised beef with carrots and lemongrass; served with baguette, egg noodles or rice noodles. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-7.jpg',
   true, true, ARRAY[]::text[], 30, 2, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000003', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Duck & Bamboo Shoot Noodle Soup (Bún / Miến măng vịt)',
   'Duck and bamboo shoot broth with rice vermicelli or glass noodles, served with ginger fish sauce. [4 servings]',
   55.00, '/chefs/bep-ba-muoi/dishes/dish-8.jpg',
   true, true, ARRAY[]::text[], 30, 3, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000004', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Crab Noodle Soup with Pork Trotter (Bánh canh cua giò heo)',
   'Thick tapioca noodles in crab broth with pork trotter. [4 servings]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-9.jpg',
   true, true, ARRAY[]::text[], 30, 4, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000005', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Rice Vermicelli with Grilled Pork or Stir-fried Pork & Spring Rolls (Bún thịt nướng / Bún thịt xào chả giò)',
   'Vermicelli bowl with grilled (or stir-fried) pork, crispy spring rolls, herbs, pickles and peanuts. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-10.jpg',
   true, true, ARRAY[]::text[], 30, 5, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000006', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Braised Herbal Chicken Noodle Soup with Pickled Papaya (Mì gà tiềm ăn kèm đu đủ ngâm)',
   'Herbal-braised chicken leg with egg noodles and greens, served with pickled papaya. [4 servings]',
   55.00, '/chefs/bep-ba-muoi/dishes/dish-11.jpg',
   true, true, ARRAY[]::text[], 30, 6, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000007', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Shaking Beef with Rice (Cơm bò lúc lắc)',
   'Wok-seared beef cubes with bell peppers and onion over rice; served with soup. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-12.jpg',
   true, false, ARRAY[]::text[], 30, 7, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000008', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Fried Chicken with Garlic Fish Sauce over Rice (Cơm gà mắm tỏi)',
   'Crispy chicken leg glazed in garlic fish sauce over fried rice. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-13.jpg',
   true, false, ARRAY[]::text[], 30, 8, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000009', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Fried Rice with Beef & Pickled Mustard Greens (Cơm rang dưa bò)',
   'Fried rice with beef and pickled mustard greens; served with sour beef soup. [4 servings]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-14.jpg',
   true, false, ARRAY[]::text[], 30, 9, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000010', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Yang Chow Fried Rice with Seaweed Soup (Cơm chiên Dương Châu)',
   'Fried rice with Chinese sausage, egg, peas and carrots; served with seaweed soup. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-15.jpg',
   true, false, ARRAY[]::text[], 30, 10, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000011', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Rice Noodles with Braised Pork Ribs (Hủ tíu sườn)',
   'Rice noodles with tender braised pork ribs and Thai basil. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-16.jpg',
   true, false, ARRAY[]::text[], 30, 11, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000012', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Beef & Pork Knuckle Noodle Soup (Bún bò giò heo)',
   'Spicy lemongrass beef broth with vermicelli, beef and pork knuckle. [4 servings]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-17.jpg',
   true, false, ARRAY[]::text[], 30, 12, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000013', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Hainanese Chicken Rice (Cơm gà Hải Nam)',
   'Poached chicken with fragrant chicken-fat rice, cucumber and pickles. [4 servings]',
   55.00, '/chefs/bep-ba-muoi/dishes/dish-18.jpg',
   true, false, ARRAY[]::text[], 30, 13, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000014', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Phnom Penh-style Noodle Soup (Hủ tíu Nam Vang)',
   'Clear pork broth with rice noodles, shrimp, minced pork, liver and quail eggs. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-19.jpg',
   true, false, ARRAY[]::text[], 30, 14, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000015', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Crab Paste Vermicelli Soup (Bún riêu)',
   'Tomato-crab broth with vermicelli, crab paste, tofu and pork blood. [4 servings]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-20.jpg',
   true, false, ARRAY[]::text[], 30, 15, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000016', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Fermented Fish Vermicelli Soup (Bún mắm)',
   'Rich fermented-fish broth with vermicelli, shrimp, squid and roast pork. [4 servings]',
   60.00, '/chefs/bep-ba-muoi/dishes/dish-21.jpg',
   true, false, ARRAY[]::text[], 30, 16, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000017', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Rice with Sweet & Sour Fish Soup & Braised Fish (Cơm canh chua cá kho)',
   'Home-style set: rice, sweet & sour fish soup and caramel-braised fish. [4 servings]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-22.jpg',
   true, false, ARRAY[]::text[], 30, 17, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000018', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Rice with Sweet & Sour Soup & Black Pepper Braised Pork (Cơm canh chua thịt kho tiêu)',
   'Home-style set: rice, sweet & sour soup and black pepper braised pork. [4 servings]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-23.jpg',
   true, false, ARRAY[]::text[], 30, 18, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000019', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Quang-style Noodles (Mì Quảng)',
   'Turmeric wide rice noodles with pork, shrimp, egg, peanuts and a little broth. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-24.jpg',
   true, false, ARRAY[]::text[], 30, 19, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000020', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Korean Sweet & Spicy Chicken Rice with Salad (Cơm gà cay ngọt Hàn Quốc kèm salad)',
   'Crispy chicken in sweet & spicy Korean glaze, with rice and salad. [4 servings]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-25.jpg',
   true, false, ARRAY[]::text[], 30, 20, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000021', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Rice with Stir-fried Beef (Cơm bò xào lăn)',
   'Tender beef stir-fried with lemongrass and onion, served with rice. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-26.jpg',
   true, false, ARRAY[]::text[], 30, 21, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000022', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Crispy Fried Chicken Rice (Cơm gà xối mỡ)',
   'Crispy-skin fried chicken leg with tomato fried rice and cucumber. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-27.jpg',
   true, false, ARRAY[]::text[], 30, 22, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000023', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Chicken Glass Noodle Soup (Miến gà)',
   'Glass noodles in clear chicken broth with shredded chicken and herbs. [4 servings]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-28.jpg',
   true, false, ARRAY[]::text[], 30, 23, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000024', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Chicken / Duck Congee with Salad (Cháo gà / vịt kèm gỏi)',
   'Rice congee with poached chicken or duck, served with cabbage salad. [4 servings]',
   55.00, '/chefs/bep-ba-muoi/dishes/dish-29.jpg',
   true, false, ARRAY[]::text[], 30, 24, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000025', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Pork Organ Congee (Cháo lòng)',
   'Rice congee with assorted pork offal, bean sprouts and herbs. [4 servings]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-30.jpg',
   true, false, ARRAY[]::text[], 30, 25, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000026', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000001',
   'Beef Pho / Chicken Pho (Phở bò / Phở gà)',
   'Classic pho with rice noodles and beef or chicken in slow-simmered broth. [4 servings]',
   40.00, '/chefs/bep-ba-muoi/dishes/dish-31.jpg',
   true, false, ARRAY[]::text[], 30, 26, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000027', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000002',
   'Vegetarian Pho (Phở chay)',
   'Vegetable broth pho with tofu, mushrooms and mock meats. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-33.jpg',
   true, false, ARRAY['Vegetarian']::text[], 30, 27, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000028', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000002',
   'Vegetarian Crab Paste Vermicelli Soup (Bún riêu chay)',
   'Tomato broth with vermicelli, tofu and vegetarian ''''crab'''' paste. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-34.jpg',
   true, false, ARRAY['Vegetarian']::text[], 30, 28, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000029', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000002',
   'Vegetarian Hue-style Vermicelli Soup (Bún Huế chay)',
   'Spicy lemongrass broth with vermicelli, tofu and vegetarian ham. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-35.jpg',
   true, false, ARRAY['Vegetarian']::text[], 30, 29, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000030', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000002',
   'Vegetarian Clear Noodle Soup (Hủ tíu chay)',
   'Clear vegetable broth with rice noodles, tofu, mushrooms and wonton crisps. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-36.jpg',
   true, false, ARRAY['Vegetarian']::text[], 30, 30, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000031', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000002',
   'Mushroom Hotpot (Lẩu nấm)',
   'Assorted mushrooms, corn, tofu and greens in a vegetable hotpot broth. [4 servings]',
   60.00, '/chefs/bep-ba-muoi/dishes/dish-37.jpg',
   true, false, ARRAY['Vegetarian']::text[], 30, 31, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000032', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000002',
   'Vegetarian Yang Chow Fried Rice (Cơm chiên Dương Châu chay)',
   'Fried rice with vegetarian ham, carrots and green beans. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-38.jpg',
   true, false, ARRAY['Vegetarian']::text[], 30, 32, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000033', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000002',
   'Garlic Fried Rice, Lemongrass Braised Tofu & Seaweed Tofu Soup (Cơm chiên tỏi - Đậu hủ kho sả + Canh rong biển đậu hủ)',
   'Set: garlic fried rice, lemongrass-braised tofu and seaweed tofu soup. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-39.jpg',
   true, false, ARRAY['Vegetarian']::text[], 30, 33, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000034', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000002',
   'Black Pepper Braised Mushrooms & Vegetarian Sweet & Sour Soup (Nấm thập cẩm kho tiêu + Canh chua chay)',
   'Set: assorted mushrooms braised with black pepper and vegetarian sweet & sour soup. [4 servings]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-40.jpg',
   true, false, ARRAY['Vegetarian']::text[], 30, 34, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000035', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Bánh Mì (Grilled Pork Sausage / Roasted Pork / Assorted) (Bánh mì nem nướng / heo quay / thập cẩm)',
   'Vietnamese baguette sandwiches with pickled vegetables, herbs and chili. [Per sandwich (min. 5 per type)]',
   5.00, '/chefs/bep-ba-muoi/dishes/dish-42.jpg',
   true, false, ARRAY[]::text[], 20, 35, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000036', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Chicken / Duck Salad & Shrimp Crackers (Gỏi gà / vịt & bánh phồng)',
   'Shredded chicken or duck salad with herbs and onions, served with shrimp crackers. [Large tray]',
   55.00, '/chefs/bep-ba-muoi/dishes/dish-43.jpg',
   true, false, ARRAY[]::text[], 20, 36, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000037', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Steamed Rice Rolls (Bánh cuốn)',
   'Thin steamed rice sheets filled with pork and wood-ear mushroom, with fried shallots and dipping sauce. [Tray]',
   25.00, '/chefs/bep-ba-muoi/dishes/dish-44.jpg',
   true, false, ARRAY[]::text[], 20, 37, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000038', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Sticky Rice Cake (Traditional / Banana) (Bánh tét mặn / Tét chuối)',
   'Banana-leaf wrapped glutinous rice cake, savory (pork & mung bean) or banana. [2 pcs]',
   30.00, '/chefs/bep-ba-muoi/dishes/dish-45.jpg',
   true, false, ARRAY[]::text[], 20, 38, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000039', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Sticky Rice Cake with Salted Egg (Bánh tét mặn trứng muối)',
   'Savory rice cake with pork, mung bean and salted egg yolk. [2 pcs]',
   40.00, '/chefs/bep-ba-muoi/dishes/dish-46.jpg',
   true, false, ARRAY[]::text[], 20, 39, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000040', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Mung Bean Coated Sticky Rice (Xôi vò)',
   'Fluffy sticky rice coated in mashed mung bean, with coconut. [Tray]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-47.jpg',
   true, false, ARRAY[]::text[], 20, 40, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000041', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Steamed Sticky Rice Ball with Pork & Mung Bean (Xôi khúc)',
   'Sticky rice balls stuffed with mung bean and pork. [Tray]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-48.jpg',
   true, false, ARRAY[]::text[], 20, 41, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000042', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Sticky Rice with Braised Chicken (Xôi gà khìa)',
   'Sticky rice with coconut-braised chicken, pickles and peanuts. [Tray]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-49.jpg',
   true, false, ARRAY[]::text[], 20, 42, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000043', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Savory Sticky Rice (Xôi mặn)',
   'Sticky rice with Chinese sausage, Vietnamese ham, eggs and fried shallots. [Tray]',
   50.00, '/chefs/bep-ba-muoi/dishes/dish-50.jpg',
   true, false, ARRAY[]::text[], 20, 43, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000044', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Clear Tapioca Dumplings (Bánh bột lọc)',
   'Chewy clear tapioca dumplings with shrimp and pork, wrapped in banana leaf. [25 pcs]',
   25.00, '/chefs/bep-ba-muoi/dishes/dish-51.jpg',
   true, false, ARRAY[]::text[], 20, 44, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000045', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Clear Tapioca Dumplings (Bánh bột lọc)',
   'Chewy clear tapioca dumplings with shrimp and pork, wrapped in banana leaf. [50 pcs]',
   45.00, '/chefs/bep-ba-muoi/dishes/dish-52.jpg',
   true, false, ARRAY[]::text[], 20, 45, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000046', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Shredded Pork Skin Rolls / Fresh Spring Rolls (Bì cuốn / Gỏi cuốn)',
   'Rice paper rolls with shredded pork skin, or shrimp and pork, with herbs and dipping sauce. [Per roll (min. 10 pcs)]',
   2.00, '/chefs/bep-ba-muoi/dishes/dish-53.jpg',
   true, false, ARRAY[]::text[], 20, 46, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000047', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Crispy Spring Rolls (Chả giò)',
   'Deep-fried pork spring rolls with dipping sauce. [Per roll (order 30 / 50 / 100 pcs)]',
   1.00, '/chefs/bep-ba-muoi/dishes/dish-54.jpg',
   true, false, ARRAY[]::text[], 20, 47, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000048', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000003',
   'Fermented Pork Roll / Vietnamese Head Cheese (Nem chua / Giò thủ)',
   'Tangy fermented pork roll, or pressed pork head cheese with wood-ear mushroom. [Per order]',
   15.00, '/chefs/bep-ba-muoi/dishes/dish-55.jpg',
   true, false, ARRAY[]::text[], 20, 48, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000049', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000004',
   'Steamed Banana Cake (Bánh chuối hấp)',
   'Steamed banana and tapioca cake topped with coconut cream and peanuts. [Tray]',
   30.00, '/chefs/bep-ba-muoi/dishes/dish-57.jpg',
   true, false, ARRAY[]::text[], 15, 49, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000050', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000004',
   'Grilled Banana Wrapped in Sticky Rice (Bánh chuối nếp nướng)',
   'Banana wrapped in sticky rice and banana leaf, grilled. [Tray]',
   30.00, '/chefs/bep-ba-muoi/dishes/dish-58.jpg',
   true, false, ARRAY[]::text[], 15, 50, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000051', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000004',
   'Mung Bean Sweet Soup with Coconut Milk (Chè đậu xanh cốt dừa)',
   'Sweet mung bean soup topped with coconut milk. [10 pcs]',
   25.00, '/chefs/bep-ba-muoi/dishes/dish-59.jpg',
   true, false, ARRAY[]::text[], 15, 51, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000052', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000004',
   'Peach Gum Beauty Sweet Soup (Chè dưỡng nhan)',
   'Peach gum, red dates, goji, longan, lotus seeds and chia in light syrup. [10 pcs]',
   30.00, '/chefs/bep-ba-muoi/dishes/dish-60.jpg',
   true, false, ARRAY[]::text[], 15, 52, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000053', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000004',
   'Glutinous Rice Balls in Ginger Syrup (Chè trôi nước)',
   'Mung bean-filled rice balls in ginger syrup with coconut milk and sesame. [Per order]',
   20.00, '/chefs/bep-ba-muoi/dishes/dish-61.jpg',
   true, false, ARRAY[]::text[], 15, 53, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000054', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000004',
   'Silken Tofu in Ginger Syrup (Đậu hủ nước gừng)',
   'Soft silken tofu in warm ginger syrup. [Per order]',
   20.00, '/chefs/bep-ba-muoi/dishes/dish-62.jpg',
   true, false, ARRAY[]::text[], 15, 54, NOW(), NOW()),

  ('17e30000-0003-4000-8000-000000000055', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'ca700000-0003-4000-8000-000000000004',
   'Grass Jelly with Chia Seeds & Coconut Milk (Sương sáo hạt chia nước dừa)',
   'Grass jelly with chia seeds and coconut milk. [10 pcs]',
   30.00, '/chefs/bep-ba-muoi/dishes/dish-63.jpg',
   true, false, ARRAY[]::text[], 15, 55, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 7: CUSTOMERS
-- ============================================================

INSERT INTO customers (id, user_id, first_name, last_name, email, phone, created_at, updated_at)
VALUES
  ('c0570000-0000-4000-8000-000000000001', '44444444-4444-4444-4444-444444444444',
   'Alice', 'Thompson', 'alice@example.com', '+1 (905) 555-1001',
   NOW() - INTERVAL '30 days', NOW()),
  ('c0570000-0000-4000-8000-000000000002', '55555555-5555-5555-5555-555555555555',
   'Bob', 'Martinez', 'bob@example.com', '+1 (905) 555-1002',
   NOW() - INTERVAL '20 days', NOW()),
  -- Sean as a customer — lets the multi-role test super-admin browse the
  -- marketplace, add to cart, and place orders end-to-end.
  ('11111111-2222-3333-aaaa-000000000001', '11111111-1111-1111-1111-111111111111',
   'Sean', 'Finlay', 'sean@ridendine.ca', '+1 (905) 555-0101',
   NOW() - INTERVAL '120 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 8: CUSTOMER ADDRESSES
-- ============================================================

-- address_line1 matches production; 00048 converges fresh replays to it.
INSERT INTO customer_addresses (id, customer_id, label, address_line1, city, state, postal_code, country, is_default, created_at, updated_at)
VALUES
  ('add20000-0000-4000-8000-000000000001',
   'c0570000-0000-4000-8000-000000000001',
   'Home', '10 Main St W', 'Hamilton', 'ON', 'L8P 1H1', 'CA',
   true, NOW(), NOW()),
  ('add20000-0000-4000-8000-000000000002',
   'c0570000-0000-4000-8000-000000000002',
   'Home', '25 Dundurn St N', 'Hamilton', 'ON', 'L8R 3E2', 'CA',
   true, NOW(), NOW()),
  ('11111111-2222-3333-bbbb-000000000001',
   '11111111-2222-3333-aaaa-000000000001',
   'Home', '500 James St N', 'Hamilton', 'ON', 'L8L 1J5', 'CA',
   true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 9: DRIVERS (using 'drivers' table per schema)
-- ============================================================

INSERT INTO drivers (id, user_id, first_name, last_name, phone, email, status, created_at, updated_at)
VALUES
  ('d2000000-0000-4000-8000-000000000001',
   '66666666-6666-6666-6666-666666666666',
   'Mike', 'Chen', '+1 (905) 555-2001', 'mike.driver@ridendine.ca',
   'approved', NOW() - INTERVAL '60 days', NOW()),
  ('d2000000-0000-4000-8000-000000000002',
   '77777777-7777-7777-7777-777777777777',
   'Sarah', 'Kim', '+1 (905) 555-2002', 'sarah.driver@ridendine.ca',
   'approved', NOW() - INTERVAL '40 days', NOW()),
  -- Sean as a driver — lets the multi-role test super-admin sign in to the
  -- driver PWA and accept delivery offers.
  ('11111111-2222-3333-cccc-000000000001',
   '11111111-1111-1111-1111-111111111111',
   'Sean', 'Finlay', '+1 (905) 555-0101', 'sean@ridendine.ca',
   'approved', NOW() - INTERVAL '120 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 10: DRIVER VEHICLES
-- ============================================================

INSERT INTO driver_vehicles (id, driver_id, vehicle_type, make, model, year, color, license_plate, is_active, created_at, updated_at)
VALUES
  ('f1ee0000-0000-4000-8000-000000000001',
   'd2000000-0000-4000-8000-000000000001',
   'car', 'Toyota', 'Corolla', 2021, 'Silver', 'ABCD 123',
   true, NOW(), NOW()),
  ('f1ee0000-0000-4000-8000-000000000002',
   'd2000000-0000-4000-8000-000000000002',
   'car', 'Honda', 'Civic', 2020, 'Blue', 'EFGH 456',
   true, NOW(), NOW()),
  ('11111111-2222-3333-dddd-000000000001',
   '11111111-2222-3333-cccc-000000000001',
   'car', 'Tesla', 'Model 3', 2023, 'Black', 'TEST 001',
   true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 11: ORDERS (schema-compliant with delivery_address_id)
-- ============================================================

INSERT INTO orders (
  id, order_number, customer_id, storefront_id, delivery_address_id,
  status, payment_status,
  subtotal, delivery_fee, service_fee, tax, tip, total,
  special_instructions,
  created_at, updated_at
)
VALUES
  -- Order 1: Every Bite Yum - delivered
  ('0d000000-0000-4000-8000-000000000001', 'RND-001',
   'c0570000-0000-4000-8000-000000000001',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'add20000-0000-4000-8000-000000000001',
   'delivered', 'completed',
   40.98, 5.00, 2.00, 5.98, 2.00, 55.96,
   'Please ring doorbell',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '45 minutes'),

  -- Order 2: HOÀNG GIA PHỞ - delivered
  ('0d000000-0000-4000-8000-000000000002', 'RND-002',
   'c0570000-0000-4000-8000-000000000002',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'add20000-0000-4000-8000-000000000002',
   'delivered', 'completed',
   58.00, 5.00, 2.00, 8.19, 3.00, 76.19,
   'Extra herbs please',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '55 minutes'),

  -- Order 3: Bếp Bà Muối - delivered
  ('0d000000-0000-4000-8000-000000000003', 'RND-003',
   'c0570000-0000-4000-8000-000000000001',
   'ffffffff-ffff-ffff-ffff-ffffffffffff',
   'add20000-0000-4000-8000-000000000001',
   'delivered', 'completed',
   100.00, 5.00, 2.00, 13.91, 5.00, 125.91,
   'Pick up at Eastgate Square entrance',
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '40 minutes'),

  -- Order 4: Every Bite Yum - preparing
  ('0d000000-0000-4000-8000-000000000004', 'RND-004',
   'c0570000-0000-4000-8000-000000000002',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'add20000-0000-4000-8000-000000000002',
   'preparing', 'pending',
   39.98, 5.00, 2.00, 5.82, 0.00, 52.80,
   NULL,
   NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '20 minutes'),

  -- Order 5: HOÀNG GIA PHỞ - pending
  ('0d000000-0000-4000-8000-000000000005', 'RND-005',
   'c0570000-0000-4000-8000-000000000001',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'add20000-0000-4000-8000-000000000001',
   'pending', 'pending',
   54.00, 5.00, 2.00, 7.65, 0.00, 68.65,
   'No spice please',
   NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'),

  -- Order 6: Bếp Bà Muối - ready_for_pickup
  ('0d000000-0000-4000-8000-000000000006', 'RND-006',
   'c0570000-0000-4000-8000-000000000002',
   'ffffffff-ffff-ffff-ffff-ffffffffffff',
   'add20000-0000-4000-8000-000000000002',
   'ready_for_pickup', 'pending',
   95.00, 5.00, 2.00, 13.26, 0.00, 115.26,
   NULL,
   NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '15 minutes'),

  -- Order 7: Every Bite Yum - pending — DEDICATED customer-cancel fixture
  -- (e2e/lifecycle/negative-paths.spec.ts, Alice cancels from the tracking
  -- page). created_at NOW() keeps the chef-admin 8-minute acceptance
  -- countdown from auto-rejecting it while the suite runs.
  ('0d000000-0000-4000-8000-000000000007', 'RND-007',
   'c0570000-0000-4000-8000-000000000001',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'add20000-0000-4000-8000-000000000001',
   'pending', 'pending',
   38.98, 5.00, 2.00, 5.98, 0.00, 51.96,
   'E2E cancel fixture — do not prepare',
   NOW(), NOW()),

  -- Order 8: HOÀNG GIA PHỞ - pending — DEDICATED chef-reject fixture
  -- (e2e/lifecycle/negative-paths.spec.ts signs in as tuan@ridendine.ca, so
  -- the storefront MUST be Tuan's). created_at NOW() — see RND-007 note.
  ('0d000000-0000-4000-8000-000000000008', 'RND-008',
   'c0570000-0000-4000-8000-000000000002',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'add20000-0000-4000-8000-000000000002',
   'pending', 'pending',
   54.00, 5.00, 2.00, 7.93, 0.00, 68.93,
   'E2E reject fixture — do not prepare',
   NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- engine_status must mirror each order's seeded status. The column default is
-- 'pending', which would make the engine state machine evaluate kitchen
-- actions on already-delivered orders from the wrong state (e.g. allowing
-- start_preparing on RND-001). The public_stage sync trigger keeps
-- public_stage consistent with this update.
UPDATE orders SET engine_status = CASE status
    WHEN 'delivered' THEN 'delivered'
    WHEN 'preparing' THEN 'preparing'
    WHEN 'ready_for_pickup' THEN 'ready'
    ELSE 'pending'
  END
WHERE id IN (
  '0d000000-0000-4000-8000-000000000001',
  '0d000000-0000-4000-8000-000000000002',
  '0d000000-0000-4000-8000-000000000003',
  '0d000000-0000-4000-8000-000000000004',
  '0d000000-0000-4000-8000-000000000005',
  '0d000000-0000-4000-8000-000000000006',
  '0d000000-0000-4000-8000-000000000007',
  '0d000000-0000-4000-8000-000000000008'
);

-- ============================================================
-- SECTION 12: ORDER ITEMS (using menu_item_name per schema)
-- ============================================================

INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, created_at)
VALUES
  ('01000000-0001-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000001', '17e30000-0001-4000-8000-000000000001', 'Classic Smash Burger', 1, 18.99, 18.99, NOW() - INTERVAL '5 days'),
  ('01000000-0001-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000001', '17e30000-0001-4000-8000-000000000003', 'Nashville Hot Chicken Sandwich', 1, 19.99, 19.99, NOW() - INTERVAL '5 days'),
  ('01000000-0002-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000002', '17e30000-0002-4000-8000-000000000001', 'Beef Phở (Phở Bò)', 1, 28.00, 28.00, NOW() - INTERVAL '3 days'),
  ('01000000-0002-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000002', '17e30000-0002-4000-8000-000000000003', 'Authentic Huế Beef Noodle Soup (Bún Bò Huế)', 1, 32.00, 32.00, NOW() - INTERVAL '3 days'),
  ('01000000-0003-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000003', '17e30000-0003-4000-8000-000000000001', 'Rice with Grilled Pork Chop, Shredded Pork Skin & Steamed Egg Meatloaf (Cơm sườn bì chả)', 1, 45.00, 45.00, NOW() - INTERVAL '2 days'),
  ('01000000-0003-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000003', '17e30000-0003-4000-8000-000000000003', 'Duck & Bamboo Shoot Noodle Soup (Bún / Miến măng vịt)', 1, 55.00, 55.00, NOW() - INTERVAL '2 days'),
  ('01000000-0004-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000004', '17e30000-0001-4000-8000-000000000002', 'BBQ Bacon Smash Burger', 1, 21.99, 21.99, NOW() - INTERVAL '30 minutes'),
  ('01000000-0004-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000004', '17e30000-0001-4000-8000-000000000004', 'Crispy Chicken Tenders (4pc)', 1, 16.99, 16.99, NOW() - INTERVAL '30 minutes'),
  ('01000000-0005-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000005', '17e30000-0002-4000-8000-000000000002', 'Chicken Phở (Phở Gà)', 1, 26.00, 26.00, NOW() - INTERVAL '10 minutes'),
  ('01000000-0005-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000005', '17e30000-0002-4000-8000-000000000004', 'Stir-Fried Pork Vermicelli (Bún Thịt Xào)', 1, 24.00, 24.00, NOW() - INTERVAL '10 minutes'),
  ('01000000-0006-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000006', '17e30000-0003-4000-8000-000000000004', 'Crab Noodle Soup with Pork Trotter (Bánh canh cua giò heo)', 1, 50.00, 50.00, NOW() - INTERVAL '45 minutes'),
  ('01000000-0006-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000006', '17e30000-0003-4000-8000-000000000005', 'Chicken Glass Noodle Soup (Miến gà)', 1, 45.00, 45.00, NOW() - INTERVAL '45 minutes'),
  ('01000000-0007-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000007', '17e30000-0001-4000-8000-000000000001', 'Classic Smash Burger', 1, 18.99, 18.99, NOW()),
  ('01000000-0007-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000007', '17e30000-0001-4000-8000-000000000003', 'Nashville Hot Chicken Sandwich', 1, 19.99, 19.99, NOW()),
  ('01000000-0008-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000008', '17e30000-0002-4000-8000-000000000001', 'Beef Phở (Phở Bò)', 1, 28.00, 28.00, NOW()),
  ('01000000-0008-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000008', '17e30000-0002-4000-8000-000000000002', 'Chicken Phở (Phở Gà)', 1, 26.00, 26.00, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 13: ORDER STATUS HISTORY
-- ============================================================

INSERT INTO order_status_history (id, order_id, status, notes, created_at)
VALUES
  ('05000000-0001-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000001', 'pending', 'Order placed by customer', NOW() - INTERVAL '5 days'),
  ('05000000-0001-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000001', 'accepted', 'Order accepted by chef', NOW() - INTERVAL '5 days' + INTERVAL '5 minutes'),
  ('05000000-0001-4000-8000-000000000003', '0d000000-0000-4000-8000-000000000001', 'preparing', 'Chef started preparing', NOW() - INTERVAL '5 days' + INTERVAL '10 minutes'),
  ('05000000-0001-4000-8000-000000000004', '0d000000-0000-4000-8000-000000000001', 'ready_for_pickup', 'Order ready for pickup', NOW() - INTERVAL '5 days' + INTERVAL '30 minutes'),
  ('05000000-0001-4000-8000-000000000005', '0d000000-0000-4000-8000-000000000001', 'picked_up', 'Driver picked up order', NOW() - INTERVAL '5 days' + INTERVAL '35 minutes'),
  ('05000000-0001-4000-8000-000000000006', '0d000000-0000-4000-8000-000000000001', 'delivered', 'Order delivered successfully', NOW() - INTERVAL '5 days' + INTERVAL '45 minutes'),
  ('05000000-0002-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000002', 'pending', 'Order placed by customer', NOW() - INTERVAL '3 days'),
  ('05000000-0002-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000002', 'accepted', 'Order accepted by chef', NOW() - INTERVAL '3 days' + INTERVAL '8 minutes'),
  ('05000000-0002-4000-8000-000000000003', '0d000000-0000-4000-8000-000000000002', 'preparing', 'Chef started preparing', NOW() - INTERVAL '3 days' + INTERVAL '12 minutes'),
  ('05000000-0002-4000-8000-000000000004', '0d000000-0000-4000-8000-000000000002', 'ready_for_pickup', 'Order ready for pickup', NOW() - INTERVAL '3 days' + INTERVAL '40 minutes'),
  ('05000000-0002-4000-8000-000000000005', '0d000000-0000-4000-8000-000000000002', 'picked_up', 'Driver picked up order', NOW() - INTERVAL '3 days' + INTERVAL '48 minutes'),
  ('05000000-0002-4000-8000-000000000006', '0d000000-0000-4000-8000-000000000002', 'delivered', 'Order delivered successfully', NOW() - INTERVAL '3 days' + INTERVAL '55 minutes'),
  ('05000000-0003-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000003', 'pending', 'Order placed', NOW() - INTERVAL '2 days'),
  ('05000000-0003-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000003', 'accepted', 'Accepted', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
  ('05000000-0003-4000-8000-000000000003', '0d000000-0000-4000-8000-000000000003', 'preparing', 'Preparing', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),
  ('05000000-0003-4000-8000-000000000004', '0d000000-0000-4000-8000-000000000003', 'ready_for_pickup', 'Ready', NOW() - INTERVAL '2 days' + INTERVAL '28 minutes'),
  ('05000000-0003-4000-8000-000000000005', '0d000000-0000-4000-8000-000000000003', 'picked_up', 'Picked up', NOW() - INTERVAL '2 days' + INTERVAL '32 minutes'),
  ('05000000-0003-4000-8000-000000000006', '0d000000-0000-4000-8000-000000000003', 'delivered', 'Delivered', NOW() - INTERVAL '2 days' + INTERVAL '40 minutes'),
  ('05000000-0004-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000004', 'pending', 'Order placed', NOW() - INTERVAL '30 minutes'),
  ('05000000-0004-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000004', 'accepted', 'Accepted by chef', NOW() - INTERVAL '25 minutes'),
  ('05000000-0004-4000-8000-000000000003', '0d000000-0000-4000-8000-000000000004', 'preparing', 'Chef is preparing now', NOW() - INTERVAL '20 minutes'),
  ('05000000-0005-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000005', 'pending', 'Order placed', NOW() - INTERVAL '10 minutes'),
  ('05000000-0006-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000006', 'pending', 'Order placed', NOW() - INTERVAL '45 minutes'),
  ('05000000-0006-4000-8000-000000000002', '0d000000-0000-4000-8000-000000000006', 'accepted', 'Accepted', NOW() - INTERVAL '40 minutes'),
  ('05000000-0006-4000-8000-000000000003', '0d000000-0000-4000-8000-000000000006', 'preparing', 'Preparing', NOW() - INTERVAL '35 minutes'),
  ('05000000-0006-4000-8000-000000000004', '0d000000-0000-4000-8000-000000000006', 'ready_for_pickup', 'Ready for pickup — awaiting driver', NOW() - INTERVAL '15 minutes'),
  ('05000000-0007-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000007', 'pending', 'Order placed (e2e customer-cancel fixture)', NOW()),
  ('05000000-0008-4000-8000-000000000001', '0d000000-0000-4000-8000-000000000008', 'pending', 'Order placed (e2e chef-reject fixture)', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 14: DELIVERIES (using 'drivers' FK per schema)
-- ============================================================

INSERT INTO deliveries (
  id, order_id, driver_id, status,
  pickup_address, dropoff_address,
  distance_km, delivery_fee, driver_payout,
  created_at, updated_at
)
VALUES
  ('de100000-0000-4000-8000-000000000001',
   '0d000000-0000-4000-8000-000000000001',
   'd2000000-0000-4000-8000-000000000001',
   'delivered',
   '123 King St W, Hamilton, ON L8P 1A1',
   '10 Main St W, Hamilton, ON L8P 1H1',
   3.2, 5.00, 8.50,
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '45 minutes'),

  ('de100000-0000-4000-8000-000000000002',
   '0d000000-0000-4000-8000-000000000002',
   'd2000000-0000-4000-8000-000000000002',
   'delivered',
   '456 Barton St E, Hamilton, ON L8L 2Y5',
   '25 Dundurn St N, Hamilton, ON L8R 3E2',
   4.1, 5.00, 9.50,
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '55 minutes'),

  ('de100000-0000-4000-8000-000000000003',
   '0d000000-0000-4000-8000-000000000003',
   'd2000000-0000-4000-8000-000000000001',
   'delivered',
   'Pick up near Eastgate Square, Queenston Rd, Hamilton, ON L8G 2B4',
   '10 Main St W, Hamilton, ON L8P 1H1',
   5.8, 5.00, 10.50,
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '40 minutes'),

  ('de100000-0000-4000-8000-000000000006',
   '0d000000-0000-4000-8000-000000000006',
   'd2000000-0000-4000-8000-000000000001',
   'assigned',
   'Pick up near Eastgate Square, Queenston Rd, Hamilton, ON L8G 2B4',
   '25 Dundurn St N, Hamilton, ON L8R 3E2',
   6.1, 5.00, 11.00,
   NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes'),

  -- Unassigned pending delivery — required by driver "accept offer" lifecycle Playwright test (Phase 11).
  -- Deterministic UUID: b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2
  -- References order 5 (HOÀNG GIA PHỞ, status pending — no driver assigned yet).
  ('b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
   '0d000000-0000-4000-8000-000000000005',
   NULL,
   'pending',
   '456 Barton St E, Hamilton, ON L8L 2Y5',
   '10 Main St W, Hamilton, ON L8P 1H1',
   3.5, 5.00, 8.00,
   NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 14B: ASSIGNMENT ATTEMPTS (pending driver offer)
-- ============================================================
-- Live delivery offer for the seeded unassigned pending delivery
-- (b2b2b2b2-…) targeted at Mike (mike.driver@ridendine.ca) — required by the
-- driver "decline a delivery offer" negative-path Playwright test. The
-- driver-app GET /api/offers filter is response='pending' AND
-- expires_at > NOW(), so the 4-hour expiry comfortably outlives the suite.
-- Schema (00007_central_engine_tables.sql): response CHECK IN
-- ('pending', 'accepted', 'declined', 'expired', 'cancelled').

INSERT INTO assignment_attempts (
  id, delivery_id, driver_id, attempt_number,
  offered_at, expires_at, response,
  distance_meters, estimated_minutes, created_at
)
VALUES
  ('0ffe0000-0000-4000-8000-000000000001',
   'b2b2b2b2-b2b2-b2b2-b2b2-b2b2b2b2b2b2',
   'd2000000-0000-4000-8000-000000000001',
   1,
   NOW(), NOW() + INTERVAL '4 hours', 'pending',
   3500, 12, NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 15: REVIEWS
-- ============================================================

INSERT INTO reviews (id, order_id, customer_id, storefront_id, rating, comment, created_at, updated_at)
VALUES
  ('ee000000-0000-4000-8000-000000000001',
   '0d000000-0000-4000-8000-000000000001',
   'c0570000-0000-4000-8000-000000000001',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   5, 'Best smash burger I''ve ever had! The caramelized onions were perfect. Will definitely order again.',
   NOW() - INTERVAL '5 days' + INTERVAL '2 hours', NOW()),
  ('ee000000-0000-4000-8000-000000000002',
   '0d000000-0000-4000-8000-000000000002',
   'c0570000-0000-4000-8000-000000000002',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   5, 'The Bún Bò Huế was absolutely incredible. Authentic flavours, generous portions, and delivered hot. Tuan is amazing!',
   NOW() - INTERVAL '3 days' + INTERVAL '2 hours', NOW()),
  ('ee000000-0000-4000-8000-000000000003',
   '0d000000-0000-4000-8000-000000000003',
   'c0570000-0000-4000-8000-000000000001',
   'ffffffff-ffff-ffff-ffff-ffffffffffff',
   5, 'The authentic Vietnamese flavours from Bếp Bà Muối are unmatched! The Cơm sườn bì chả and duck noodle soup were fresh, tender, and deeply comforting. Truly authentic home cooking.',
   NOW() - INTERVAL '2 days' + INTERVAL '2 hours', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 16: REFUND CASES (pending ops/finance review)
-- ============================================================
-- One pending refund case against delivered order RND-001 (Alice, Every Bite
-- Yum) so the ops-admin refund queue (/dashboard/finance/refunds) renders a
-- populated queue with Approve/Deny actions. requested_by is Alice's
-- auth.users id (NOT NULL FK). Schema (00007_central_engine_tables.sql):
-- status CHECK IN ('pending', 'approved', 'denied', 'processing',
-- 'completed', 'failed'); refund_reason VARCHAR(50) NOT NULL — value matches
-- the engine RefundReason vocabulary ('quality_issue').
-- approved_amount_cents stays NULL so the queue displays the requested
-- amount ($18.99 — the Classic Smash Burger line).

INSERT INTO refund_cases (
  id, order_id, requested_by,
  requested_amount_cents, refund_reason, refund_notes,
  status, created_at, updated_at
)
VALUES
  ('ca5e0000-0000-4000-8000-000000000001',
   '0d000000-0000-4000-8000-000000000001',
   '44444444-4444-4444-4444-444444444444',
   1899, 'quality_issue', 'Burger arrived cold — customer requested a refund for the item.',
   'pending', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION: GHOST-KITCHEN (dev/e2e only) — commissary multi-brand
--
-- Makes the Every Bite Yum kitchen (aa000000-0001) a commissary running TWO
-- brand storefronts from ONE shared pool, so ACCEPTANCE A is exercisable:
-- the same operator (chef aaaa…) manages ≥2 brands, and the shared inventory /
-- suppliers / staff (kitchen-scoped) show identically from either brand.
-- Obvious demo data — never resembles production.
-- ============================================================

-- Second brand under the SAME kitchen + SAME chef as Every Bite Yum.
INSERT INTO chef_storefronts (
  id, chef_id, kitchen_id, slug, name, description, cuisine_types,
  cover_image_url, logo_url, is_active, is_featured,
  estimated_prep_time_min, estimated_prep_time_max, min_order_amount,
  average_rating, total_reviews, created_at, updated_at
)
VALUES
  ('d5000000-0002-4000-8000-000000000002',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'aa000000-0001-4000-8000-000000000001',
   'saigon-pho-house',
   'Saigon Pho House',
   'DEV SEED — a second virtual brand run out of the Every Bite Yum commissary to exercise multi-brand ghost-kitchen operations.',
   ARRAY['Vietnamese', 'Phở', 'Noodle Soups'],
   NULL, NULL, true, false,
   25, 45, 18.00, 0, 0,
   NOW() - INTERVAL '10 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- Shared inventory pool (kitchen-scoped): identical from both brands.
INSERT INTO inventory_items (id, kitchen_id, name, category, unit, current_quantity, par_quantity, reorder_point, cost_per_unit, is_active)
VALUES
  ('1a170000-0001-4000-8000-000000000001', 'aa000000-0001-4000-8000-000000000001', 'All-Purpose Flour', 'Dry Goods', 'kg',  40, 50, 20, 1.20, true),
  ('1a170000-0002-4000-8000-000000000002', 'aa000000-0001-4000-8000-000000000001', 'Yellow Onions',     'Produce',   'kg',  25, 30, 12, 0.90, true),
  ('1a170000-0003-4000-8000-000000000003', 'aa000000-0001-4000-8000-000000000001', 'Chicken Thigh',     'Protein',   'kg',  18, 25, 15, 6.50, true),
  ('1a170000-0004-4000-8000-000000000004', 'aa000000-0001-4000-8000-000000000001', 'Rice Noodles',      'Dry Goods', 'kg',  30, 30, 10, 2.10, true),
  ('1a170000-0005-4000-8000-000000000005', 'aa000000-0001-4000-8000-000000000001', 'Canola Oil',        'Pantry',    'L',    8, 20, 10, 2.80, true)
ON CONFLICT (kitchen_id, name) DO NOTHING;

-- Opening-stock ledger so on-hand reconciles (metadata brand-attribution absent = kitchen-wide).
INSERT INTO inventory_stock_movements (kitchen_id, inventory_item_id, movement_type, quantity, unit_cost, note)
VALUES
  ('aa000000-0001-4000-8000-000000000001', '1a170000-0001-4000-8000-000000000001', 'receive', 40, 1.20, 'Opening stock (dev seed)'),
  ('aa000000-0001-4000-8000-000000000001', '1a170000-0002-4000-8000-000000000002', 'receive', 25, 0.90, 'Opening stock (dev seed)'),
  ('aa000000-0001-4000-8000-000000000001', '1a170000-0003-4000-8000-000000000003', 'receive', 18, 6.50, 'Opening stock (dev seed)'),
  ('aa000000-0001-4000-8000-000000000001', '1a170000-0004-4000-8000-000000000004', 'receive', 30, 2.10, 'Opening stock (dev seed)'),
  ('aa000000-0001-4000-8000-000000000001', '1a170000-0005-4000-8000-000000000005', 'receive',  8, 2.80, 'Opening stock (dev seed)')
ON CONFLICT DO NOTHING;

-- Shared supplier (kitchen-scoped).
INSERT INTO suppliers (id, kitchen_id, name, contact_name, email, is_active)
VALUES
  ('5a170000-0001-4000-8000-000000000001', 'aa000000-0001-4000-8000-000000000001', 'Hamilton Restaurant Depot', 'Dana Ruiz', 'orders@hamdepot.test', true)
ON CONFLICT (kitchen_id, name) DO NOTHING;

-- Shared prep station (kitchen-scoped).
INSERT INTO kitchen_stations (id, kitchen_id, name, sort_order, is_active)
VALUES
  ('57a70000-0001-4000-8000-000000000001', 'aa000000-0001-4000-8000-000000000001', 'Line', 1, true)
ON CONFLICT (kitchen_id, name) DO NOTHING;

-- Shared staff (kitchen-scoped), with hourly rates for labour/payroll.
INSERT INTO kitchen_staff (id, kitchen_id, name, role, station_id, hourly_rate, is_active)
VALUES
  ('57aff000-0001-4000-8000-000000000001', 'aa000000-0001-4000-8000-000000000001', 'Alex Prep',  'line_staff', '57a70000-0001-4000-8000-000000000001', 17.50, true),
  ('57aff000-0002-4000-8000-000000000002', 'aa000000-0001-4000-8000-000000000001', 'Sam Cook',   'head_chef',  '57a70000-0001-4000-8000-000000000001', 24.00, true)
ON CONFLICT (id) DO NOTHING;
