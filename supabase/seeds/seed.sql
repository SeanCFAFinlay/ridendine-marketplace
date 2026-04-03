-- ============================================================
-- RideNDine Seed Data — Schema-Compliant
-- 3 Chefs | 3 Storefronts | 15 Dishes | 2 Customers | 2 Drivers | 6 Orders
-- ============================================================

-- ============================================================
-- SECTION 1: AUTH USERS
-- ============================================================

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'ops@ridendine.ca', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"super_admin"}',
   '{"display_name":"RideNDine Ops","role":"super_admin"}', true, 'authenticated'),
  ('11111111-1111-1111-1111-111111111111', 'sean@ridendine.ca', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW(),
   '{"provider":"email","providers":["email"],"role":"chef"}',
   '{"display_name":"Sean","role":"chef"}', false, 'authenticated'),
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
   '{"display_name":"Sarah Kim","role":"driver"}', false, 'authenticated')
ON CONFLICT (id) DO NOTHING;

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
   'Ryo',
   '+1 (905) 555-0303',
   'Osaka-trained home chef bringing Japanese precision to Hamilton kitchens. Tonkotsu ramen, katsu, and gyudon crafted with care.',
   'approved',
   NOW() - INTERVAL '45 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 3: CHEF KITCHENS (required FK for storefronts)
-- ============================================================

INSERT INTO chef_kitchens (id, chef_id, name, address_line1, city, state, postal_code, country, is_verified, created_at, updated_at)
VALUES
  ('kit-eby-0001-0000-0000-000000000001',
   'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   'Every Bite Yum Kitchen',
   '123 King St W', 'Hamilton', 'ON', 'L8P 1A1', 'CA',
   true, NOW() - INTERVAL '90 days', NOW()),
  ('kit-hgp-0002-0000-0000-000000000002',
   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
   'HOÀNG GIA PHỞ Kitchen',
   '456 Barton St E', 'Hamilton', 'ON', 'L8L 2Y5', 'CA',
   true, NOW() - INTERVAL '60 days', NOW()),
  ('kit-coo-0003-0000-0000-000000000003',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'COOCO Kitchen',
   '789 Concession St', 'Hamilton', 'ON', 'L8V 1C9', 'CA',
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
   'kit-eby-0001-0000-0000-000000000001',
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
   'kit-hgp-0002-0000-0000-000000000002',
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

  -- COOCO (Ryo)
  ('ffffffff-ffff-ffff-ffff-ffffffffffff',
   'cccccccc-cccc-cccc-cccc-cccccccccccc',
   'kit-coo-0003-0000-0000-000000000003',
   'cooco',
   'COOCO',
   'Japanese home cooking elevated. Osaka-trained precision meets Hamilton hospitality — tonkotsu ramen, gyudon, and chicken katsu curry crafted with care and authentic ingredients.',
   ARRAY['Japanese', 'Ramen', 'Katsu', 'Asian'],
   'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&q=80',
   NULL,
   true, true,
   20, 40,
   20.00,
   4.7, 19,
   NOW() - INTERVAL '45 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 5: MENU CATEGORIES
-- ============================================================

INSERT INTO menu_categories (id, storefront_id, name, description, sort_order, is_active, created_at, updated_at)
VALUES
  ('cat-eby-01', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Burgers & Sandwiches', 'Hand-crafted smash burgers and loaded sandwiches', 1, true, NOW(), NOW()),
  ('cat-eby-02', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'Chicken', 'Nashville hot, crispy, and saucy chicken dishes', 2, true, NOW(), NOW()),
  ('cat-hgp-01', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Phở & Noodle Soups', 'Slow-cooked broths and hand-crafted noodle soups', 1, true, NOW(), NOW()),
  ('cat-hgp-02', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Rice & Vermicelli', 'Traditional rice and vermicelli dishes', 2, true, NOW(), NOW()),
  ('cat-coo-01', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Ramen & Soups', 'Rich tonkotsu and shoyu ramen bowls', 1, true, NOW(), NOW()),
  ('cat-coo-02', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Rice Bowls', 'Hearty Japanese rice bowl dishes', 2, true, NOW(), NOW())
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
  ('item-eby-01', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'cat-eby-01',
   'Classic Smash Burger',
   'Double smash patties, American cheese, caramelized onions, house sauce, brioche bun. Crispy edges, juicy centre.',
   18.99, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80',
   true, true, ARRAY[]::text[], 20, 1, NOW(), NOW()),

  ('item-eby-02', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'cat-eby-01',
   'BBQ Bacon Smash Burger',
   'Double smash patties, crispy bacon, aged cheddar, smoky BBQ sauce, pickled jalapeños, brioche bun.',
   21.99, 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=600&q=80',
   true, false, ARRAY[]::text[], 22, 2, NOW(), NOW()),

  ('item-eby-03', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'cat-eby-02',
   'Nashville Hot Chicken Sandwich',
   'Crispy fried chicken thigh, Nashville hot sauce, coleslaw, pickles, brioche bun. Spicy, crunchy, and addictive.',
   19.99, 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80',
   true, true, ARRAY[]::text[], 25, 3, NOW(), NOW()),

  ('item-eby-04', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'cat-eby-02',
   'Crispy Chicken Tenders (4pc)',
   'Hand-breaded chicken tenders, golden crispy, served with your choice of dipping sauce.',
   16.99, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 4, NOW(), NOW()),

  ('item-eby-05', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'cat-eby-01',
   'Mushroom Swiss Smash Burger',
   'Double smash patties, sautéed mushrooms, Swiss cheese, garlic aioli, arugula, brioche bun.',
   20.99, 'https://images.unsplash.com/photo-1594212699903-ec8a3eca50f5?w=600&q=80',
   true, false, ARRAY[]::text[], 22, 5, NOW(), NOW()),

  -- HOÀNG GIA PHỞ (Tuan) — 5 dishes
  ('item-hgp-01', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cat-hgp-01',
   'Beef Phở (Phở Bò)',
   'Slow-simmered beef bone broth (12+ hours), rice noodles, tender beef slices, brisket, and meatballs. Serves 2.',
   28.00, 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80',
   true, true, ARRAY['Gluten-Free Option']::text[], 45, 1, NOW(), NOW()),

  ('item-hgp-02', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cat-hgp-01',
   'Chicken Phở (Phở Gà)',
   'Light and fragrant chicken broth, rice noodles, poached chicken breast, fresh ginger. Serves 2.',
   26.00, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, false, ARRAY['Gluten-Free Option']::text[], 40, 2, NOW(), NOW()),

  ('item-hgp-03', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cat-hgp-01',
   'Authentic Huế Beef Noodle Soup (Bún Bò Huế)',
   'Spicy lemongrass beef broth, thick round noodles, beef shank, pork hock. A royal dish from the ancient capital of Huế. Serves 2.',
   32.00, 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80',
   true, true, ARRAY[]::text[], 50, 3, NOW(), NOW()),

  ('item-hgp-04', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cat-hgp-02',
   'Stir-Fried Pork Vermicelli (Bún Thịt Xào)',
   'Grilled lemongrass pork, crispy spring rolls, vermicelli noodles, fresh herbs, pickled vegetables, house fish sauce dressing. Serves 2.',
   24.00, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
   true, false, ARRAY[]::text[], 30, 4, NOW(), NOW()),

  ('item-hgp-05', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'cat-hgp-02',
   'Vietnamese Beef Stew (Bò Kho)',
   'Slow-braised beef shank in aromatic lemongrass and star anise broth. Served with bánh mì or noodles. Serves 2.',
   30.00, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 45, 5, NOW(), NOW()),

  -- COOCO (Ryo) — 5 dishes
  ('item-coo-01', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'cat-coo-01',
   'Tonkotsu Ramen',
   'Rich, creamy pork bone broth simmered for 18 hours, thin ramen noodles, chashu pork belly, soft-boiled marinated egg, nori, bamboo shoots.',
   22.00, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY[]::text[], 25, 1, NOW(), NOW()),

  ('item-coo-02', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'cat-coo-01',
   'Shoyu Ramen',
   'Clear soy-based chicken broth, wavy noodles, chicken chashu, marinated egg, menma, nori, and scallions.',
   20.00, 'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 2, NOW(), NOW()),

  ('item-coo-03', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'cat-coo-02',
   'Chicken Katsu Curry',
   'Crispy panko-breaded chicken cutlet over Japanese short-grain rice, topped with rich golden curry sauce. Served with pickled daikon.',
   21.00, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
   true, true, ARRAY[]::text[], 25, 3, NOW(), NOW()),

  ('item-coo-04', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'cat-coo-02',
   'Gyudon (Beef Rice Bowl)',
   'Thinly sliced beef and onions simmered in sweet dashi-soy broth, served over steamed Japanese rice with a soft-poached egg.',
   19.00, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 4, NOW(), NOW()),

  ('item-coo-05', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'cat-coo-02',
   'Karaage Chicken Don',
   'Japanese fried chicken marinated in soy, ginger, and sake, served over steamed rice with Japanese mayo and teriyaki drizzle.',
   20.00, 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?w=600&q=80',
   true, false, ARRAY[]::text[], 22, 5, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 7: CUSTOMERS
-- ============================================================

INSERT INTO customers (id, user_id, first_name, last_name, email, phone, created_at, updated_at)
VALUES
  ('cust-0001-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444',
   'Alice', 'Thompson', 'alice@example.com', '+1 (905) 555-1001',
   NOW() - INTERVAL '30 days', NOW()),
  ('cust-0002-0000-0000-0000-000000000002', '55555555-5555-5555-5555-555555555555',
   'Bob', 'Martinez', 'bob@example.com', '+1 (905) 555-1002',
   NOW() - INTERVAL '20 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 8: CUSTOMER ADDRESSES
-- ============================================================

INSERT INTO customer_addresses (id, customer_id, label, address_line1, city, state, postal_code, country, is_default, created_at, updated_at)
VALUES
  ('addr-0001-0000-0000-0000-000000000001',
   'cust-0001-0000-0000-0000-000000000001',
   'Home', '10 Main St W', 'Hamilton', 'ON', 'L8P 1H1', 'CA',
   true, NOW(), NOW()),
  ('addr-0002-0000-0000-0000-000000000002',
   'cust-0002-0000-0000-0000-000000000002',
   'Home', '25 Dundurn St N', 'Hamilton', 'ON', 'L8R 3E2', 'CA',
   true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 9: DRIVERS (using 'drivers' table per schema)
-- ============================================================

INSERT INTO drivers (id, user_id, first_name, last_name, phone, email, status, created_at, updated_at)
VALUES
  ('drv-00001-0000-0000-0000-000000000001',
   '66666666-6666-6666-6666-666666666666',
   'Mike', 'Chen', '+1 (905) 555-2001', 'mike.driver@ridendine.ca',
   'approved', NOW() - INTERVAL '60 days', NOW()),
  ('drv-00002-0000-0000-0000-000000000002',
   '77777777-7777-7777-7777-777777777777',
   'Sarah', 'Kim', '+1 (905) 555-2002', 'sarah.driver@ridendine.ca',
   'approved', NOW() - INTERVAL '40 days', NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 10: DRIVER VEHICLES
-- ============================================================

INSERT INTO driver_vehicles (id, driver_id, vehicle_type, make, model, year, color, license_plate, is_active, created_at, updated_at)
VALUES
  ('veh-00001-0000-0000-0000-000000000001',
   'drv-00001-0000-0000-0000-000000000001',
   'car', 'Toyota', 'Corolla', 2021, 'Silver', 'ABCD 123',
   true, NOW(), NOW()),
  ('veh-00002-0000-0000-0000-000000000002',
   'drv-00002-0000-0000-0000-000000000002',
   'car', 'Honda', 'Civic', 2020, 'Blue', 'EFGH 456',
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
  ('ord-00001-0000-0000-0000-000000000001', 'RND-001',
   'cust-0001-0000-0000-0000-000000000001',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'addr-0001-0000-0000-0000-000000000001',
   'delivered', 'completed',
   40.98, 5.00, 2.00, 5.98, 2.00, 55.96,
   'Please ring doorbell',
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '45 minutes'),

  -- Order 2: HOÀNG GIA PHỞ - delivered
  ('ord-00002-0000-0000-0000-000000000002', 'RND-002',
   'cust-0002-0000-0000-0000-000000000002',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'addr-0002-0000-0000-0000-000000000002',
   'delivered', 'completed',
   58.00, 5.00, 2.00, 8.19, 3.00, 76.19,
   'Extra herbs please',
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '55 minutes'),

  -- Order 3: COOCO - delivered
  ('ord-00003-0000-0000-0000-000000000003', 'RND-003',
   'cust-0001-0000-0000-0000-000000000001',
   'ffffffff-ffff-ffff-ffff-ffffffffffff',
   'addr-0001-0000-0000-0000-000000000001',
   'delivered', 'completed',
   43.00, 5.00, 2.00, 6.24, 2.00, 58.24,
   NULL,
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '40 minutes'),

  -- Order 4: Every Bite Yum - preparing
  ('ord-00004-0000-0000-0000-000000000004', 'RND-004',
   'cust-0002-0000-0000-0000-000000000002',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   'addr-0002-0000-0000-0000-000000000002',
   'preparing', 'pending',
   39.98, 5.00, 2.00, 5.82, 0.00, 52.80,
   NULL,
   NOW() - INTERVAL '30 minutes', NOW() - INTERVAL '20 minutes'),

  -- Order 5: HOÀNG GIA PHỞ - pending
  ('ord-00005-0000-0000-0000-000000000005', 'RND-005',
   'cust-0001-0000-0000-0000-000000000001',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   'addr-0001-0000-0000-0000-000000000001',
   'pending', 'pending',
   54.00, 5.00, 2.00, 7.65, 0.00, 68.65,
   'No spice please',
   NOW() - INTERVAL '10 minutes', NOW() - INTERVAL '10 minutes'),

  -- Order 6: COOCO - ready_for_pickup
  ('ord-00006-0000-0000-0000-000000000006', 'RND-006',
   'cust-0002-0000-0000-0000-000000000002',
   'ffffffff-ffff-ffff-ffff-ffffffffffff',
   'addr-0002-0000-0000-0000-000000000002',
   'ready_for_pickup', 'pending',
   41.00, 5.00, 2.00, 5.97, 0.00, 53.97,
   NULL,
   NOW() - INTERVAL '45 minutes', NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 12: ORDER ITEMS (using menu_item_name per schema)
-- ============================================================

INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, created_at)
VALUES
  ('oi-001-01', 'ord-00001-0000-0000-0000-000000000001', 'item-eby-01', 'Classic Smash Burger', 1, 18.99, 18.99, NOW() - INTERVAL '5 days'),
  ('oi-001-02', 'ord-00001-0000-0000-0000-000000000001', 'item-eby-03', 'Nashville Hot Chicken Sandwich', 1, 19.99, 19.99, NOW() - INTERVAL '5 days'),
  ('oi-002-01', 'ord-00002-0000-0000-0000-000000000002', 'item-hgp-01', 'Beef Phở (Phở Bò)', 1, 28.00, 28.00, NOW() - INTERVAL '3 days'),
  ('oi-002-02', 'ord-00002-0000-0000-0000-000000000002', 'item-hgp-03', 'Authentic Huế Beef Noodle Soup (Bún Bò Huế)', 1, 32.00, 32.00, NOW() - INTERVAL '3 days'),
  ('oi-003-01', 'ord-00003-0000-0000-0000-000000000003', 'item-coo-01', 'Tonkotsu Ramen', 1, 22.00, 22.00, NOW() - INTERVAL '2 days'),
  ('oi-003-02', 'ord-00003-0000-0000-0000-000000000003', 'item-coo-03', 'Chicken Katsu Curry', 1, 21.00, 21.00, NOW() - INTERVAL '2 days'),
  ('oi-004-01', 'ord-00004-0000-0000-0000-000000000004', 'item-eby-02', 'BBQ Bacon Smash Burger', 1, 21.99, 21.99, NOW() - INTERVAL '30 minutes'),
  ('oi-004-02', 'ord-00004-0000-0000-0000-000000000004', 'item-eby-04', 'Crispy Chicken Tenders (4pc)', 1, 16.99, 16.99, NOW() - INTERVAL '30 minutes'),
  ('oi-005-01', 'ord-00005-0000-0000-0000-000000000005', 'item-hgp-02', 'Chicken Phở (Phở Gà)', 1, 26.00, 26.00, NOW() - INTERVAL '10 minutes'),
  ('oi-005-02', 'ord-00005-0000-0000-0000-000000000005', 'item-hgp-04', 'Stir-Fried Pork Vermicelli (Bún Thịt Xào)', 1, 24.00, 24.00, NOW() - INTERVAL '10 minutes'),
  ('oi-006-01', 'ord-00006-0000-0000-0000-000000000006', 'item-coo-04', 'Gyudon (Beef Rice Bowl)', 1, 19.00, 19.00, NOW() - INTERVAL '45 minutes'),
  ('oi-006-02', 'ord-00006-0000-0000-0000-000000000006', 'item-coo-05', 'Karaage Chicken Don', 1, 20.00, 20.00, NOW() - INTERVAL '45 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 13: ORDER STATUS HISTORY
-- ============================================================

INSERT INTO order_status_history (id, order_id, status, notes, created_at)
VALUES
  ('osh-001-01', 'ord-00001-0000-0000-0000-000000000001', 'pending', 'Order placed by customer', NOW() - INTERVAL '5 days'),
  ('osh-001-02', 'ord-00001-0000-0000-0000-000000000001', 'accepted', 'Order accepted by chef', NOW() - INTERVAL '5 days' + INTERVAL '5 minutes'),
  ('osh-001-03', 'ord-00001-0000-0000-0000-000000000001', 'preparing', 'Chef started preparing', NOW() - INTERVAL '5 days' + INTERVAL '10 minutes'),
  ('osh-001-04', 'ord-00001-0000-0000-0000-000000000001', 'ready_for_pickup', 'Order ready for pickup', NOW() - INTERVAL '5 days' + INTERVAL '30 minutes'),
  ('osh-001-05', 'ord-00001-0000-0000-0000-000000000001', 'picked_up', 'Driver picked up order', NOW() - INTERVAL '5 days' + INTERVAL '35 minutes'),
  ('osh-001-06', 'ord-00001-0000-0000-0000-000000000001', 'delivered', 'Order delivered successfully', NOW() - INTERVAL '5 days' + INTERVAL '45 minutes'),
  ('osh-002-01', 'ord-00002-0000-0000-0000-000000000002', 'pending', 'Order placed by customer', NOW() - INTERVAL '3 days'),
  ('osh-002-02', 'ord-00002-0000-0000-0000-000000000002', 'accepted', 'Order accepted by chef', NOW() - INTERVAL '3 days' + INTERVAL '8 minutes'),
  ('osh-002-03', 'ord-00002-0000-0000-0000-000000000002', 'preparing', 'Chef started preparing', NOW() - INTERVAL '3 days' + INTERVAL '12 minutes'),
  ('osh-002-04', 'ord-00002-0000-0000-0000-000000000002', 'ready_for_pickup', 'Order ready for pickup', NOW() - INTERVAL '3 days' + INTERVAL '40 minutes'),
  ('osh-002-05', 'ord-00002-0000-0000-0000-000000000002', 'picked_up', 'Driver picked up order', NOW() - INTERVAL '3 days' + INTERVAL '48 minutes'),
  ('osh-002-06', 'ord-00002-0000-0000-0000-000000000002', 'delivered', 'Order delivered successfully', NOW() - INTERVAL '3 days' + INTERVAL '55 minutes'),
  ('osh-003-01', 'ord-00003-0000-0000-0000-000000000003', 'pending', 'Order placed', NOW() - INTERVAL '2 days'),
  ('osh-003-02', 'ord-00003-0000-0000-0000-000000000003', 'accepted', 'Accepted', NOW() - INTERVAL '2 days' + INTERVAL '5 minutes'),
  ('osh-003-03', 'ord-00003-0000-0000-0000-000000000003', 'preparing', 'Preparing', NOW() - INTERVAL '2 days' + INTERVAL '10 minutes'),
  ('osh-003-04', 'ord-00003-0000-0000-0000-000000000003', 'ready_for_pickup', 'Ready', NOW() - INTERVAL '2 days' + INTERVAL '28 minutes'),
  ('osh-003-05', 'ord-00003-0000-0000-0000-000000000003', 'picked_up', 'Picked up', NOW() - INTERVAL '2 days' + INTERVAL '32 minutes'),
  ('osh-003-06', 'ord-00003-0000-0000-0000-000000000003', 'delivered', 'Delivered', NOW() - INTERVAL '2 days' + INTERVAL '40 minutes'),
  ('osh-004-01', 'ord-00004-0000-0000-0000-000000000004', 'pending', 'Order placed', NOW() - INTERVAL '30 minutes'),
  ('osh-004-02', 'ord-00004-0000-0000-0000-000000000004', 'accepted', 'Accepted by chef', NOW() - INTERVAL '25 minutes'),
  ('osh-004-03', 'ord-00004-0000-0000-0000-000000000004', 'preparing', 'Chef is preparing now', NOW() - INTERVAL '20 minutes'),
  ('osh-005-01', 'ord-00005-0000-0000-0000-000000000005', 'pending', 'Order placed', NOW() - INTERVAL '10 minutes'),
  ('osh-006-01', 'ord-00006-0000-0000-0000-000000000006', 'pending', 'Order placed', NOW() - INTERVAL '45 minutes'),
  ('osh-006-02', 'ord-00006-0000-0000-0000-000000000006', 'accepted', 'Accepted', NOW() - INTERVAL '40 minutes'),
  ('osh-006-03', 'ord-00006-0000-0000-0000-000000000006', 'preparing', 'Preparing', NOW() - INTERVAL '35 minutes'),
  ('osh-006-04', 'ord-00006-0000-0000-0000-000000000006', 'ready_for_pickup', 'Ready for pickup — awaiting driver', NOW() - INTERVAL '15 minutes')
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
  ('del-00001-0000-0000-0000-000000000001',
   'ord-00001-0000-0000-0000-000000000001',
   'drv-00001-0000-0000-0000-000000000001',
   'delivered',
   '123 King St W, Hamilton, ON L8P 1A1',
   '10 Main St W, Hamilton, ON L8P 1H1',
   3.2, 5.00, 8.50,
   NOW() - INTERVAL '5 days', NOW() - INTERVAL '5 days' + INTERVAL '45 minutes'),

  ('del-00002-0000-0000-0000-000000000002',
   'ord-00002-0000-0000-0000-000000000002',
   'drv-00002-0000-0000-0000-000000000002',
   'delivered',
   '456 Barton St E, Hamilton, ON L8L 2Y5',
   '25 Dundurn St N, Hamilton, ON L8R 3E2',
   4.1, 5.00, 9.50,
   NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days' + INTERVAL '55 minutes'),

  ('del-00003-0000-0000-0000-000000000003',
   'ord-00003-0000-0000-0000-000000000003',
   'drv-00001-0000-0000-0000-000000000001',
   'delivered',
   '789 Concession St, Hamilton, ON L8V 1C9',
   '10 Main St W, Hamilton, ON L8P 1H1',
   2.9, 5.00, 7.50,
   NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '40 minutes'),

  ('del-00006-0000-0000-0000-000000000006',
   'ord-00006-0000-0000-0000-000000000006',
   'drv-00001-0000-0000-0000-000000000001',
   'assigned',
   '789 Concession St, Hamilton, ON L8V 1C9',
   '25 Dundurn St N, Hamilton, ON L8R 3E2',
   2.8, 5.00, 7.50,
   NOW() - INTERVAL '15 minutes', NOW() - INTERVAL '15 minutes')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- SECTION 15: REVIEWS
-- ============================================================

INSERT INTO reviews (id, order_id, customer_id, storefront_id, rating, comment, created_at, updated_at)
VALUES
  ('rev-00001-0000-0000-0000-000000000001',
   'ord-00001-0000-0000-0000-000000000001',
   'cust-0001-0000-0000-0000-000000000001',
   'dddddddd-dddd-dddd-dddd-dddddddddddd',
   5, 'Best smash burger I''ve ever had! The caramelized onions were perfect. Will definitely order again.',
   NOW() - INTERVAL '5 days' + INTERVAL '2 hours', NOW()),
  ('rev-00002-0000-0000-0000-000000000002',
   'ord-00002-0000-0000-0000-000000000002',
   'cust-0002-0000-0000-0000-000000000002',
   'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   5, 'The Bún Bò Huế was absolutely incredible. Authentic flavours, generous portions, and delivered hot. Tuan is amazing!',
   NOW() - INTERVAL '3 days' + INTERVAL '2 hours', NOW()),
  ('rev-00003-0000-0000-0000-000000000003',
   'ord-00003-0000-0000-0000-000000000003',
   'cust-0001-0000-0000-0000-000000000001',
   'ffffffff-ffff-ffff-ffff-ffffffffffff',
   5, 'The tonkotsu ramen broth was so rich and creamy. You can tell it was simmered for hours. Ryo is a true craftsman.',
   NOW() - INTERVAL '2 days' + INTERVAL '2 hours', NOW())
ON CONFLICT (id) DO NOTHING;
