-- ==========================================
-- RIDENDINE COMPLETE SEED DATA
-- Hamilton, ON - Chef-First Food Delivery
-- ==========================================

-- Clear existing data (in reverse dependency order)
TRUNCATE TABLE delivery_tracking_events CASCADE;
TRUNCATE TABLE delivery_events CASCADE;
TRUNCATE TABLE delivery_assignments CASCADE;
TRUNCATE TABLE deliveries CASCADE;
TRUNCATE TABLE driver_earnings CASCADE;
TRUNCATE TABLE driver_payouts CASCADE;
TRUNCATE TABLE driver_locations CASCADE;
TRUNCATE TABLE driver_shifts CASCADE;
TRUNCATE TABLE driver_presence CASCADE;
TRUNCATE TABLE driver_vehicles CASCADE;
TRUNCATE TABLE driver_documents CASCADE;
TRUNCATE TABLE drivers CASCADE;
TRUNCATE TABLE reviews CASCADE;
TRUNCATE TABLE order_status_history CASCADE;
TRUNCATE TABLE order_item_modifiers CASCADE;
TRUNCATE TABLE order_items CASCADE;
TRUNCATE TABLE orders CASCADE;
TRUNCATE TABLE cart_items CASCADE;
TRUNCATE TABLE carts CASCADE;
TRUNCATE TABLE favorites CASCADE;
TRUNCATE TABLE customer_addresses CASCADE;
TRUNCATE TABLE customers CASCADE;
TRUNCATE TABLE menu_item_availability CASCADE;
TRUNCATE TABLE menu_item_option_values CASCADE;
TRUNCATE TABLE menu_item_options CASCADE;
TRUNCATE TABLE menu_items CASCADE;
TRUNCATE TABLE menu_categories CASCADE;
TRUNCATE TABLE chef_delivery_zones CASCADE;
TRUNCATE TABLE chef_availability CASCADE;
TRUNCATE TABLE chef_storefronts CASCADE;
TRUNCATE TABLE chef_kitchens CASCADE;
TRUNCATE TABLE chef_documents CASCADE;
TRUNCATE TABLE chef_payout_accounts CASCADE;
TRUNCATE TABLE chef_profiles CASCADE;
TRUNCATE TABLE support_tickets CASCADE;
TRUNCATE TABLE promo_codes CASCADE;
TRUNCATE TABLE platform_users CASCADE;
TRUNCATE TABLE notifications CASCADE;
TRUNCATE TABLE admin_notes CASCADE;
TRUNCATE TABLE audit_logs CASCADE;

-- ==========================================
-- CHEF PROFILES (5 Chefs in Hamilton, ON)
-- ==========================================

-- Note: user_ids will be updated when actual auth users are created
-- Using predictable UUIDs for easy reference

INSERT INTO chef_profiles (id, user_id, display_name, bio, phone, status, profile_image_url)
VALUES
  ('chef-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001',
   'Maria Garcia',
   'Bringing authentic Mexican flavors from my grandmother''s kitchen to your table in Hamilton. Every dish tells a story of tradition, love, and the vibrant streets of Oaxaca. I use only fresh, locally-sourced ingredients combined with traditional spices imported from Mexico.',
   '(905) 555-1234', 'approved',
   'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200'),

  ('chef-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002',
   'Suda Patel',
   'Thai cuisine enthusiast sharing the vibrant flavors of Bangkok right here in Hamilton. From the bustling street food markets to royal palace recipes, I bring authentic Thai cooking with fresh herbs and bold spices. Pad Thai is my specialty, but my green curry will transport you straight to Thailand!',
   '(905) 555-2345', 'approved',
   'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?w=200'),

  ('chef-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003',
   'Rosa Lombardi',
   'Third-generation Italian cook. My Nonna taught me the secrets of handmade pasta and slow-cooked sauces in our family kitchen in Calabria. Every meal at Nonna''s Table is made with amore and the finest Italian ingredients. I make my pasta fresh daily!',
   '(905) 555-3456', 'approved',
   'https://images.unsplash.com/photo-1583394293214-28ez22893f0a?w=200'),

  ('chef-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000004',
   'Ahmed Hassan',
   'Growing up in Cairo, I learned to cook from my mother and aunts. The Spice Route brings authentic Middle Eastern flavors to Hamilton - from perfectly seasoned shawarma to creamy hummus made fresh daily. My falafel recipe has been in my family for four generations.',
   '(905) 555-4567', 'approved',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'),

  ('chef-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000005',
   'Jin Park',
   'Seoul Kitchen brings the bold, exciting flavors of Korean cuisine to Hamilton. From crispy Korean fried chicken to sizzling bibimbap, I create dishes that honor traditional recipes while adding my own creative twist. Come taste the heat of Korean spices!',
   '(905) 555-5678', 'approved',
   'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- CHEF KITCHENS (Hamilton, ON addresses)
-- ==========================================

INSERT INTO chef_kitchens (id, chef_id, name, address_line1, city, state, postal_code, country, lat, lng, is_verified)
VALUES
  ('kitchen-1111-1111-1111-111111111111', 'chef-1111-1111-1111-111111111111',
   'Maria''s Home Kitchen', '456 James Street North', 'Hamilton', 'ON', 'L8R 2L3', 'CA',
   43.2650, -79.8680, true),

  ('kitchen-2222-2222-2222-222222222222', 'chef-2222-2222-2222-222222222222',
   'Suda''s Kitchen', '123 King Street East', 'Hamilton', 'ON', 'L8N 1A9', 'CA',
   43.2530, -79.8620, true),

  ('kitchen-3333-3333-3333-333333333333', 'chef-3333-3333-3333-333333333333',
   'Nonna''s Kitchen', '789 Locke Street South', 'Hamilton', 'ON', 'L8P 4B4', 'CA',
   43.2480, -79.8760, true),

  ('kitchen-4444-4444-4444-444444444444', 'chef-4444-4444-4444-444444444444',
   'Spice Route Kitchen', '321 Ottawa Street North', 'Hamilton', 'ON', 'L8H 3Z5', 'CA',
   43.2580, -79.8320, true),

  ('kitchen-5555-5555-5555-555555555555', 'chef-5555-5555-5555-555555555555',
   'Seoul Kitchen', '567 Barton Street East', 'Hamilton', 'ON', 'L8L 2Y8', 'CA',
   43.2620, -79.8450, true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- CHEF STOREFRONTS
-- ==========================================

INSERT INTO chef_storefronts (id, chef_id, kitchen_id, slug, name, description, cuisine_types, is_active, is_featured, average_rating, total_reviews, min_order_amount, estimated_prep_time_min, estimated_prep_time_max, cover_image_url, logo_url)
VALUES
  ('store-1111-1111-1111-111111111111', 'chef-1111-1111-1111-111111111111', 'kitchen-1111-1111-1111-111111111111',
   'marias-kitchen', 'Maria''s Kitchen',
   'Authentic Mexican cuisine made with love and traditional family recipes passed down through generations. From street tacos to rich mole sauces, experience the true taste of Mexico.',
   ARRAY['Mexican', 'Latin'], true, true, 4.8, 47, 15.00, 20, 35,
   'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800',
   'https://images.unsplash.com/photo-1595273670150-bd0c3c392e46?w=200'),

  ('store-2222-2222-2222-222222222222', 'chef-2222-2222-2222-222222222222', 'kitchen-2222-2222-2222-222222222222',
   'thai-home-cooking', 'Thai Home Cooking',
   'Experience the authentic flavors of Thailand. From pad thai to green curry, every dish is crafted with traditional techniques and fresh ingredients.',
   ARRAY['Thai', 'Asian'], true, true, 4.9, 38, 12.00, 25, 40,
   'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800',
   'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?w=200'),

  ('store-3333-3333-3333-333333333333', 'chef-3333-3333-3333-333333333333', 'kitchen-3333-3333-3333-333333333333',
   'nonnas-table', 'Nonna''s Table',
   'Classic Italian comfort food. Handmade pasta, rich sauces, and recipes that have been in our family for generations. Every meal is made with amore!',
   ARRAY['Italian', 'Mediterranean'], true, true, 4.7, 52, 18.00, 30, 45,
   'https://images.unsplash.com/photo-1498579150354-977475b7ea0b?w=800',
   'https://images.unsplash.com/photo-1583394293214-28ek22893f0a?w=200'),

  ('store-4444-4444-4444-444444444444', 'chef-4444-4444-4444-444444444444', 'kitchen-4444-4444-4444-444444444444',
   'spice-route', 'Spice Route',
   'Authentic Middle Eastern cuisine featuring perfectly seasoned shawarma, creamy hummus, and crispy falafel. Recipes passed down through four generations.',
   ARRAY['Middle Eastern', 'Mediterranean'], true, true, 4.6, 41, 14.00, 20, 35,
   'https://images.unsplash.com/photo-1547424850-4bfc7e88e8a2?w=800',
   'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'),

  ('store-5555-5555-5555-555555555555', 'chef-5555-5555-5555-555555555555', 'kitchen-5555-5555-5555-555555555555',
   'seoul-kitchen', 'Seoul Kitchen',
   'Bold, exciting Korean flavors. From crispy Korean fried chicken to sizzling bibimbap, taste the heat and passion of Seoul in every bite.',
   ARRAY['Korean', 'Asian'], true, true, 4.8, 35, 15.00, 25, 40,
   'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=800',
   'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- CHEF AVAILABILITY (Mon-Fri 11am-8pm, Sat 10am-9pm)
-- ==========================================

-- Maria's Kitchen
INSERT INTO chef_availability (id, storefront_id, day_of_week, start_time, end_time, is_available) VALUES
  (gen_random_uuid(), 'store-1111-1111-1111-111111111111', 0, '10:00', '21:00', true), -- Sunday
  (gen_random_uuid(), 'store-1111-1111-1111-111111111111', 1, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-1111-1111-1111-111111111111', 2, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-1111-1111-1111-111111111111', 3, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-1111-1111-1111-111111111111', 4, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-1111-1111-1111-111111111111', 5, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-1111-1111-1111-111111111111', 6, '10:00', '21:00', true);

-- Thai Home Cooking
INSERT INTO chef_availability (id, storefront_id, day_of_week, start_time, end_time, is_available) VALUES
  (gen_random_uuid(), 'store-2222-2222-2222-222222222222', 0, '10:00', '21:00', true),
  (gen_random_uuid(), 'store-2222-2222-2222-222222222222', 1, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-2222-2222-2222-222222222222', 2, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-2222-2222-2222-222222222222', 3, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-2222-2222-2222-222222222222', 4, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-2222-2222-2222-222222222222', 5, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-2222-2222-2222-222222222222', 6, '10:00', '21:00', true);

-- Nonna's Table
INSERT INTO chef_availability (id, storefront_id, day_of_week, start_time, end_time, is_available) VALUES
  (gen_random_uuid(), 'store-3333-3333-3333-333333333333', 0, '10:00', '21:00', true),
  (gen_random_uuid(), 'store-3333-3333-3333-333333333333', 1, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-3333-3333-3333-333333333333', 2, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-3333-3333-3333-333333333333', 3, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-3333-3333-3333-333333333333', 4, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-3333-3333-3333-333333333333', 5, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-3333-3333-3333-333333333333', 6, '10:00', '21:00', true);

-- Spice Route
INSERT INTO chef_availability (id, storefront_id, day_of_week, start_time, end_time, is_available) VALUES
  (gen_random_uuid(), 'store-4444-4444-4444-444444444444', 0, '10:00', '21:00', true),
  (gen_random_uuid(), 'store-4444-4444-4444-444444444444', 1, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-4444-4444-4444-444444444444', 2, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-4444-4444-4444-444444444444', 3, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-4444-4444-4444-444444444444', 4, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-4444-4444-4444-444444444444', 5, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-4444-4444-4444-444444444444', 6, '10:00', '21:00', true);

-- Seoul Kitchen
INSERT INTO chef_availability (id, storefront_id, day_of_week, start_time, end_time, is_available) VALUES
  (gen_random_uuid(), 'store-5555-5555-5555-555555555555', 0, '10:00', '21:00', true),
  (gen_random_uuid(), 'store-5555-5555-5555-555555555555', 1, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-5555-5555-5555-555555555555', 2, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-5555-5555-5555-555555555555', 3, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-5555-5555-5555-555555555555', 4, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-5555-5555-5555-555555555555', 5, '11:00', '20:00', true),
  (gen_random_uuid(), 'store-5555-5555-5555-555555555555', 6, '10:00', '21:00', true);

-- ==========================================
-- CHEF DELIVERY ZONES (5km radius, $3.99 fee, free over $30)
-- ==========================================

INSERT INTO chef_delivery_zones (id, storefront_id, name, radius_km, delivery_fee, min_order_for_free_delivery, estimated_delivery_min, estimated_delivery_max, is_active)
VALUES
  (gen_random_uuid(), 'store-1111-1111-1111-111111111111', 'Hamilton Downtown', 5.0, 3.99, 30.00, 25, 45, true),
  (gen_random_uuid(), 'store-2222-2222-2222-222222222222', 'Hamilton Downtown', 5.0, 3.99, 30.00, 25, 45, true),
  (gen_random_uuid(), 'store-3333-3333-3333-333333333333', 'Hamilton Downtown', 5.0, 3.99, 30.00, 25, 45, true),
  (gen_random_uuid(), 'store-4444-4444-4444-444444444444', 'Hamilton Downtown', 5.0, 3.99, 30.00, 25, 45, true),
  (gen_random_uuid(), 'store-5555-5555-5555-555555555555', 'Hamilton Downtown', 5.0, 3.99, 30.00, 25, 45, true);

-- ==========================================
-- MENU CATEGORIES
-- ==========================================

-- Maria's Kitchen Categories
INSERT INTO menu_categories (id, storefront_id, name, description, sort_order, is_active) VALUES
  ('cat-maria-1', 'store-1111-1111-1111-111111111111', 'Appetizers', 'Start your meal with our delicious Mexican starters', 1, true),
  ('cat-maria-2', 'store-1111-1111-1111-111111111111', 'Main Courses', 'Hearty traditional Mexican dishes', 2, true),
  ('cat-maria-3', 'store-1111-1111-1111-111111111111', 'Desserts', 'Sweet endings to your meal', 3, true),
  ('cat-maria-4', 'store-1111-1111-1111-111111111111', 'Drinks', 'Refreshing Mexican beverages', 4, true);

-- Thai Home Cooking Categories
INSERT INTO menu_categories (id, storefront_id, name, description, sort_order, is_active) VALUES
  ('cat-thai-1', 'store-2222-2222-2222-222222222222', 'Starters', 'Thai appetizers and soups', 1, true),
  ('cat-thai-2', 'store-2222-2222-2222-222222222222', 'Noodles & Rice', 'Classic Thai noodle and rice dishes', 2, true),
  ('cat-thai-3', 'store-2222-2222-2222-222222222222', 'Curries', 'Authentic Thai curries', 3, true),
  ('cat-thai-4', 'store-2222-2222-2222-222222222222', 'Desserts & Drinks', 'Sweet treats and beverages', 4, true);

-- Nonna's Table Categories
INSERT INTO menu_categories (id, storefront_id, name, description, sort_order, is_active) VALUES
  ('cat-nonna-1', 'store-3333-3333-3333-333333333333', 'Antipasti', 'Italian starters', 1, true),
  ('cat-nonna-2', 'store-3333-3333-3333-333333333333', 'Pasta', 'Handmade pasta dishes', 2, true),
  ('cat-nonna-3', 'store-3333-3333-3333-333333333333', 'Secondi', 'Main courses', 3, true),
  ('cat-nonna-4', 'store-3333-3333-3333-333333333333', 'Dolci', 'Italian desserts', 4, true);

-- Spice Route Categories
INSERT INTO menu_categories (id, storefront_id, name, description, sort_order, is_active) VALUES
  ('cat-spice-1', 'store-4444-4444-4444-444444444444', 'Mezze', 'Middle Eastern appetizers', 1, true),
  ('cat-spice-2', 'store-4444-4444-4444-444444444444', 'Grilled Plates', 'Shawarma and kebabs', 2, true),
  ('cat-spice-3', 'store-4444-4444-4444-444444444444', 'Wraps & Sandwiches', 'Handheld favorites', 3, true),
  ('cat-spice-4', 'store-4444-4444-4444-444444444444', 'Sweets & Drinks', 'Desserts and beverages', 4, true);

-- Seoul Kitchen Categories
INSERT INTO menu_categories (id, storefront_id, name, description, sort_order, is_active) VALUES
  ('cat-seoul-1', 'store-5555-5555-5555-555555555555', 'Appetizers', 'Korean starters', 1, true),
  ('cat-seoul-2', 'store-5555-5555-5555-555555555555', 'Rice Bowls', 'Bibimbap and rice dishes', 2, true),
  ('cat-seoul-3', 'store-5555-5555-5555-555555555555', 'Fried Chicken', 'Korean fried chicken', 3, true),
  ('cat-seoul-4', 'store-5555-5555-5555-555555555555', 'Stews & Noodles', 'Comforting Korean dishes', 4, true),
  ('cat-seoul-5', 'store-5555-5555-5555-555555555555', 'Desserts', 'Korean sweets', 5, true);

-- ==========================================
-- MENU ITEMS - MARIA'S KITCHEN
-- ==========================================

INSERT INTO menu_items (id, category_id, storefront_id, name, description, price, is_available, is_featured, dietary_tags, prep_time_minutes, sort_order, image_url) VALUES
  -- Appetizers
  ('item-maria-1', 'cat-maria-1', 'store-1111-1111-1111-111111111111', 'Guacamole & Chips', 'Fresh made guacamole with ripe avocados, cilantro, lime, and house-made tortilla chips', 8.99, true, true, ARRAY['Vegan', 'Gluten-Free'], 10, 1, 'https://images.unsplash.com/photo-1600891964599-f61ba0e24092?w=400'),
  ('item-maria-2', 'cat-maria-1', 'store-1111-1111-1111-111111111111', 'Queso Fundido', 'Melted Oaxacan cheese with chorizo and roasted peppers, served with warm tortillas', 10.99, true, false, ARRAY[]::TEXT[], 12, 2, 'https://images.unsplash.com/photo-1628557043824-01bb7dd8d7ff?w=400'),
  -- Main Courses
  ('item-maria-3', 'cat-maria-2', 'store-1111-1111-1111-111111111111', 'Tacos Al Pastor', 'Three tacos with marinated pork, pineapple, onion, and cilantro on corn tortillas', 14.99, true, true, ARRAY[]::TEXT[], 15, 1, 'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=400'),
  ('item-maria-4', 'cat-maria-2', 'store-1111-1111-1111-111111111111', 'Enchiladas Verdes', 'Three chicken enchiladas smothered in tangy green tomatillo sauce with crema and queso fresco', 15.99, true, false, ARRAY[]::TEXT[], 20, 2, 'https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=400'),
  ('item-maria-5', 'cat-maria-2', 'store-1111-1111-1111-111111111111', 'Tamales', 'Three handmade tamales - choice of chicken, pork, or cheese', 12.99, true, false, ARRAY['Gluten-Free'], 25, 3, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400'),
  ('item-maria-6', 'cat-maria-2', 'store-1111-1111-1111-111111111111', 'Pozole Rojo', 'Traditional pork and hominy stew in rich red chile broth with all the fixings', 14.99, true, true, ARRAY['Gluten-Free'], 20, 4, 'https://images.unsplash.com/photo-1608039755401-742074f0548d?w=400'),
  -- Desserts
  ('item-maria-7', 'cat-maria-3', 'store-1111-1111-1111-111111111111', 'Churros', 'Crispy cinnamon sugar churros served with rich chocolate dipping sauce', 7.99, true, true, ARRAY['Vegetarian'], 10, 1, 'https://images.unsplash.com/photo-1624371414361-a5e3c29f86d1?w=400'),
  ('item-maria-8', 'cat-maria-3', 'store-1111-1111-1111-111111111111', 'Tres Leches', 'Traditional three-milk sponge cake topped with whipped cream', 8.99, true, false, ARRAY['Vegetarian'], 5, 2, 'https://images.unsplash.com/photo-1571115177098-24ec42ed204d?w=400'),
  -- Drinks
  ('item-maria-9', 'cat-maria-4', 'store-1111-1111-1111-111111111111', 'Horchata', 'Creamy rice drink with cinnamon and vanilla', 3.99, true, false, ARRAY['Vegan', 'Gluten-Free'], 3, 1, 'https://images.unsplash.com/photo-1541658016709-82535e94bc69?w=400'),
  ('item-maria-10', 'cat-maria-4', 'store-1111-1111-1111-111111111111', 'Jamaica', 'Refreshing hibiscus tea sweetened with cane sugar', 3.49, true, false, ARRAY['Vegan', 'Gluten-Free'], 3, 2, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400');

-- ==========================================
-- MENU ITEMS - THAI HOME COOKING
-- ==========================================

INSERT INTO menu_items (id, category_id, storefront_id, name, description, price, is_available, is_featured, dietary_tags, prep_time_minutes, sort_order, image_url) VALUES
  -- Starters
  ('item-thai-1', 'cat-thai-1', 'store-2222-2222-2222-222222222222', 'Tom Yum Soup', 'Spicy and sour soup with shrimp, mushrooms, lemongrass, and kaffir lime', 11.99, true, true, ARRAY['Gluten-Free'], 15, 1, 'https://images.unsplash.com/photo-1548943487-a2e4e43b4853?w=400'),
  ('item-thai-2', 'cat-thai-1', 'store-2222-2222-2222-222222222222', 'Fresh Spring Rolls', 'Rice paper rolls filled with vegetables and shrimp, served with peanut sauce', 8.99, true, false, ARRAY['Gluten-Free'], 10, 2, 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400'),
  -- Noodles & Rice
  ('item-thai-3', 'cat-thai-2', 'store-2222-2222-2222-222222222222', 'Pad Thai', 'Classic stir-fried rice noodles with shrimp, egg, bean sprouts, and peanuts', 14.99, true, true, ARRAY['Gluten-Free'], 18, 1, 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=400'),
  ('item-thai-4', 'cat-thai-2', 'store-2222-2222-2222-222222222222', 'Pad See Ew', 'Wide rice noodles stir-fried with chicken, Chinese broccoli, and sweet soy', 13.99, true, false, ARRAY[]::TEXT[], 18, 2, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400'),
  ('item-thai-5', 'cat-thai-2', 'store-2222-2222-2222-222222222222', 'Pineapple Fried Rice', 'Fragrant fried rice with pineapple, cashews, and curry powder', 13.99, true, false, ARRAY['Vegetarian'], 15, 3, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400'),
  -- Curries
  ('item-thai-6', 'cat-thai-3', 'store-2222-2222-2222-222222222222', 'Green Curry', 'Creamy coconut curry with Thai basil, bamboo shoots, and bell peppers', 15.99, true, true, ARRAY['Gluten-Free'], 20, 1, 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400'),
  ('item-thai-7', 'cat-thai-3', 'store-2222-2222-2222-222222222222', 'Massaman Curry', 'Rich curry with potatoes, peanuts, and your choice of protein', 16.99, true, false, ARRAY['Gluten-Free'], 25, 2, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=400'),
  -- Desserts & Drinks
  ('item-thai-8', 'cat-thai-4', 'store-2222-2222-2222-222222222222', 'Mango Sticky Rice', 'Sweet coconut sticky rice topped with fresh mango slices', 8.99, true, true, ARRAY['Vegan', 'Gluten-Free'], 10, 1, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=400'),
  ('item-thai-9', 'cat-thai-4', 'store-2222-2222-2222-222222222222', 'Thai Iced Tea', 'Sweet and creamy Thai tea with condensed milk', 4.99, true, false, ARRAY['Vegetarian', 'Gluten-Free'], 5, 2, 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400'),
  ('item-thai-10', 'cat-thai-4', 'store-2222-2222-2222-222222222222', 'Coconut Ice Cream', 'Homemade coconut ice cream served in a coconut shell', 6.99, true, false, ARRAY['Vegetarian', 'Gluten-Free'], 5, 3, 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?w=400');

-- ==========================================
-- MENU ITEMS - NONNA'S TABLE
-- ==========================================

INSERT INTO menu_items (id, category_id, storefront_id, name, description, price, is_available, is_featured, dietary_tags, prep_time_minutes, sort_order, image_url) VALUES
  -- Antipasti
  ('item-nonna-1', 'cat-nonna-1', 'store-3333-3333-3333-333333333333', 'Bruschetta', 'Toasted bread topped with fresh tomatoes, basil, and garlic', 8.99, true, false, ARRAY['Vegan'], 8, 1, 'https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400'),
  ('item-nonna-2', 'cat-nonna-1', 'store-3333-3333-3333-333333333333', 'Arancini', 'Crispy fried risotto balls stuffed with mozzarella, served with marinara', 10.99, true, true, ARRAY['Vegetarian'], 12, 2, 'https://images.unsplash.com/photo-1595295333158-4742f28fbd85?w=400'),
  ('item-nonna-3', 'cat-nonna-1', 'store-3333-3333-3333-333333333333', 'Minestrone', 'Hearty vegetable soup with pasta and beans', 11.99, true, false, ARRAY['Vegetarian'], 15, 3, 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400'),
  -- Pasta
  ('item-nonna-4', 'cat-nonna-2', 'store-3333-3333-3333-333333333333', 'Lasagna', 'Classic lasagna with layers of pasta, meat sauce, ricotta, and mozzarella', 17.99, true, true, ARRAY[]::TEXT[], 30, 1, 'https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400'),
  ('item-nonna-5', 'cat-nonna-2', 'store-3333-3333-3333-333333333333', 'Pasta Carbonara', 'Spaghetti with crispy pancetta, egg, parmesan, and black pepper', 16.99, true, true, ARRAY[]::TEXT[], 20, 2, 'https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400'),
  ('item-nonna-6', 'cat-nonna-2', 'store-3333-3333-3333-333333333333', 'Fettuccine Alfredo', 'Fresh fettuccine tossed in creamy parmesan sauce', 15.99, true, false, ARRAY['Vegetarian'], 18, 3, 'https://images.unsplash.com/photo-1645112411341-6c4fd023714a?w=400'),
  ('item-nonna-7', 'cat-nonna-2', 'store-3333-3333-3333-333333333333', 'Spaghetti Bolognese', 'Spaghetti with slow-cooked meat sauce', 16.99, true, false, ARRAY[]::TEXT[], 20, 4, 'https://images.unsplash.com/photo-1551892374-ecf8754cf8b0?w=400'),
  -- Secondi
  ('item-nonna-8', 'cat-nonna-3', 'store-3333-3333-3333-333333333333', 'Chicken Parmesan', 'Breaded chicken cutlet with marinara and melted mozzarella, served with pasta', 18.99, true, true, ARRAY[]::TEXT[], 25, 1, 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?w=400'),
  -- Dolci
  ('item-nonna-9', 'cat-nonna-4', 'store-3333-3333-3333-333333333333', 'Tiramisu', 'Classic Italian dessert with espresso-soaked ladyfingers and mascarpone cream', 8.99, true, true, ARRAY['Vegetarian'], 5, 1, 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400'),
  ('item-nonna-10', 'cat-nonna-4', 'store-3333-3333-3333-333333333333', 'Panna Cotta', 'Silky vanilla cream topped with fresh berries', 7.99, true, false, ARRAY['Vegetarian', 'Gluten-Free'], 5, 2, 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400'),
  ('item-nonna-11', 'cat-nonna-4', 'store-3333-3333-3333-333333333333', 'Cannoli', 'Crispy pastry shells filled with sweet ricotta cream', 6.99, true, false, ARRAY['Vegetarian'], 5, 3, 'https://images.unsplash.com/photo-1626198226928-4f7d9e11e0ec?w=400');

-- ==========================================
-- MENU ITEMS - SPICE ROUTE
-- ==========================================

INSERT INTO menu_items (id, category_id, storefront_id, name, description, price, is_available, is_featured, dietary_tags, prep_time_minutes, sort_order, image_url) VALUES
  -- Mezze
  ('item-spice-1', 'cat-spice-1', 'store-4444-4444-4444-444444444444', 'Hummus & Pita', 'Creamy chickpea dip with warm pita bread and olive oil', 9.99, true, true, ARRAY['Vegan'], 8, 1, 'https://images.unsplash.com/photo-1577805947697-89e18249d767?w=400'),
  ('item-spice-2', 'cat-spice-1', 'store-4444-4444-4444-444444444444', 'Baba Ganoush', 'Smoky roasted eggplant dip with tahini and pita', 9.99, true, false, ARRAY['Vegan'], 10, 2, 'https://images.unsplash.com/photo-1547516508-1fc9e67c3e5f?w=400'),
  ('item-spice-3', 'cat-spice-1', 'store-4444-4444-4444-444444444444', 'Falafel Plate', 'Crispy chickpea fritters with tahini sauce and pickled vegetables', 11.99, true, true, ARRAY['Vegan'], 15, 3, 'https://images.unsplash.com/photo-1593001874117-c99c800e3eb6?w=400'),
  -- Grilled Plates
  ('item-spice-4', 'cat-spice-2', 'store-4444-4444-4444-444444444444', 'Shawarma Plate', 'Marinated chicken shawarma with rice, salad, hummus, and garlic sauce', 15.99, true, true, ARRAY['Gluten-Free'], 18, 1, 'https://images.unsplash.com/photo-1529006557810-274b9b2fc783?w=400'),
  ('item-spice-5', 'cat-spice-2', 'store-4444-4444-4444-444444444444', 'Mixed Grill', 'Combination of chicken, lamb, and beef kebabs with rice and salad', 19.99, true, true, ARRAY['Gluten-Free'], 25, 2, 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400'),
  ('item-spice-6', 'cat-spice-2', 'store-4444-4444-4444-444444444444', 'Lamb Kofta', 'Spiced ground lamb skewers with rice and tahini sauce', 17.99, true, false, ARRAY['Gluten-Free'], 20, 3, 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?w=400'),
  -- Wraps
  ('item-spice-7', 'cat-spice-3', 'store-4444-4444-4444-444444444444', 'Falafel Wrap', 'Falafel, hummus, vegetables, and tahini in warm pita', 12.99, true, true, ARRAY['Vegan'], 12, 1, 'https://images.unsplash.com/photo-1621852004158-f3bc188ace2d?w=400'),
  ('item-spice-8', 'cat-spice-3', 'store-4444-4444-4444-444444444444', 'Chicken Shawarma Wrap', 'Shawarma chicken with garlic sauce, pickles, and vegetables', 13.99, true, false, ARRAY[]::TEXT[], 12, 2, 'https://images.unsplash.com/photo-1626700051175-6ac254a276b4?w=400'),
  -- Sweets
  ('item-spice-9', 'cat-spice-4', 'store-4444-4444-4444-444444444444', 'Baklava', 'Flaky phyllo pastry with honey, pistachios, and walnuts', 6.99, true, true, ARRAY['Vegetarian'], 5, 1, 'https://images.unsplash.com/photo-1519676867240-f03562e64548?w=400'),
  ('item-spice-10', 'cat-spice-4', 'store-4444-4444-4444-444444444444', 'Mint Tea', 'Traditional Moroccan mint tea', 3.99, true, false, ARRAY['Vegan', 'Gluten-Free'], 5, 2, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400');

-- ==========================================
-- MENU ITEMS - SEOUL KITCHEN
-- ==========================================

INSERT INTO menu_items (id, category_id, storefront_id, name, description, price, is_available, is_featured, dietary_tags, prep_time_minutes, sort_order, image_url) VALUES
  -- Appetizers
  ('item-seoul-1', 'cat-seoul-1', 'store-5555-5555-5555-555555555555', 'Kimchi Pancake', 'Crispy savory pancake with kimchi and scallions', 10.99, true, true, ARRAY['Vegetarian'], 15, 1, 'https://images.unsplash.com/photo-1580651315530-69c8e0026377?w=400'),
  ('item-seoul-2', 'cat-seoul-1', 'store-5555-5555-5555-555555555555', 'Korean Dumplings', 'Pan-fried pork and vegetable dumplings with dipping sauce', 9.99, true, false, ARRAY[]::TEXT[], 12, 2, 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?w=400'),
  -- Rice Bowls
  ('item-seoul-3', 'cat-seoul-2', 'store-5555-5555-5555-555555555555', 'Bibimbap', 'Mixed rice bowl with vegetables, beef, fried egg, and gochujang', 14.99, true, true, ARRAY['Gluten-Free'], 18, 1, 'https://images.unsplash.com/photo-1553163147-622ab57be1c7?w=400'),
  ('item-seoul-4', 'cat-seoul-2', 'store-5555-5555-5555-555555555555', 'Bulgogi Rice Bowl', 'Marinated beef bulgogi over steamed rice with vegetables', 15.99, true, true, ARRAY['Gluten-Free'], 20, 2, 'https://images.unsplash.com/photo-1590301157890-4810ed352733?w=400'),
  -- Fried Chicken
  ('item-seoul-5', 'cat-seoul-3', 'store-5555-5555-5555-555555555555', 'Korean Fried Chicken', 'Double-fried crispy chicken with sweet and spicy gochujang glaze', 16.99, true, true, ARRAY[]::TEXT[], 25, 1, 'https://images.unsplash.com/photo-1575932444877-5106bee2a599?w=400'),
  ('item-seoul-6', 'cat-seoul-3', 'store-5555-5555-5555-555555555555', 'Soy Garlic Chicken', 'Korean fried chicken glazed with soy garlic sauce', 16.99, true, false, ARRAY[]::TEXT[], 25, 2, 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=400'),
  -- Stews & Noodles
  ('item-seoul-7', 'cat-seoul-4', 'store-5555-5555-5555-555555555555', 'Kimchi Jjigae', 'Spicy kimchi stew with pork and tofu', 13.99, true, true, ARRAY['Gluten-Free'], 20, 1, 'https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=400'),
  ('item-seoul-8', 'cat-seoul-4', 'store-5555-5555-5555-555555555555', 'Japchae', 'Sweet potato glass noodles stir-fried with vegetables and beef', 13.99, true, false, ARRAY['Gluten-Free'], 18, 2, 'https://images.unsplash.com/photo-1583224994076-0d5cbe0c6e6f?w=400'),
  ('item-seoul-9', 'cat-seoul-4', 'store-5555-5555-5555-555555555555', 'Soon Dubu Jjigae', 'Silken tofu stew with seafood in spicy broth', 14.99, true, false, ARRAY['Gluten-Free'], 20, 3, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=400'),
  -- Desserts
  ('item-seoul-10', 'cat-seoul-5', 'store-5555-5555-5555-555555555555', 'Bingsu', 'Shaved ice dessert with sweet red beans, mochi, and condensed milk', 8.99, true, true, ARRAY['Vegetarian', 'Gluten-Free'], 10, 1, 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=400'),
  ('item-seoul-11', 'cat-seoul-5', 'store-5555-5555-5555-555555555555', 'Hotteok', 'Sweet pancakes filled with brown sugar, cinnamon, and nuts', 6.99, true, false, ARRAY['Vegetarian'], 12, 2, 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400');

-- ==========================================
-- CUSTOMERS (3 customers in Hamilton)
-- ==========================================

INSERT INTO customers (id, user_id, first_name, last_name, email, phone)
VALUES
  ('cust-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000010', 'John', 'Smith', 'john@example.com', '(905) 555-1111'),
  ('cust-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000011', 'Sarah', 'Johnson', 'sarah@example.com', '(905) 555-2222'),
  ('cust-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000012', 'Mike', 'Chen', 'mike@example.com', '(905) 555-3333')
ON CONFLICT (id) DO NOTHING;

INSERT INTO customer_addresses (id, customer_id, label, address_line1, city, state, postal_code, country, lat, lng, is_default)
VALUES
  ('addr-1111-1111-1111-111111111111', 'cust-1111-1111-1111-111111111111', 'Home', '100 Main Street West', 'Hamilton', 'ON', 'L8P 1H6', 'CA', 43.2550, -79.8700, true),
  ('addr-1111-2222-2222-222222222222', 'cust-1111-1111-1111-111111111111', 'Work', '1 James Street South', 'Hamilton', 'ON', 'L8P 4R5', 'CA', 43.2570, -79.8710, false),
  ('addr-2222-1111-1111-111111111111', 'cust-2222-2222-2222-222222222222', 'Home', '250 King Street East', 'Hamilton', 'ON', 'L8N 1B9', 'CA', 43.2530, -79.8550, true),
  ('addr-3333-1111-1111-111111111111', 'cust-3333-3333-3333-333333333333', 'Home', '500 Upper James Street', 'Hamilton', 'ON', 'L9A 4X3', 'CA', 43.2350, -79.8650, true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- DRIVERS (2 drivers)
-- ==========================================

INSERT INTO drivers (id, user_id, first_name, last_name, phone, email, status)
VALUES
  ('driver-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000020', 'Tom', 'Wilson', '(905) 555-7777', 'tom@example.com', 'approved'),
  ('driver-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000021', 'Lisa', 'Brown', '(905) 555-8888', 'lisa@example.com', 'approved')
ON CONFLICT (id) DO NOTHING;

INSERT INTO driver_vehicles (id, driver_id, vehicle_type, make, model, year, color, license_plate, is_active)
VALUES
  ('vehicle-1111-1111-1111-111111111111', 'driver-1111-1111-1111-111111111111', 'car', 'Toyota', 'Camry', 2020, 'Silver', 'ABCD 123', true),
  ('vehicle-2222-2222-2222-222222222222', 'driver-2222-2222-2222-222222222222', 'car', 'Honda', 'Civic', 2019, 'Blue', 'EFGH 456', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO driver_presence (id, driver_id, status, current_lat, current_lng)
VALUES
  ('presence-1111-1111-1111-111111111111', 'driver-1111-1111-1111-111111111111', 'online', 43.2560, -79.8690),
  ('presence-2222-2222-2222-222222222222', 'driver-2222-2222-2222-222222222222', 'online', 43.2540, -79.8650)
ON CONFLICT (driver_id) DO UPDATE SET status = EXCLUDED.status;

-- ==========================================
-- ORDERS (15 total with mix of statuses)
-- ==========================================

-- Generate order number function
CREATE OR REPLACE FUNCTION generate_order_number() RETURNS TEXT AS $$
BEGIN
  RETURN 'RD-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

-- 5 Completed/Delivered Orders
INSERT INTO orders (id, order_number, customer_id, storefront_id, delivery_address_id, status, subtotal, delivery_fee, service_fee, tax, tip, total, payment_status, special_instructions, created_at) VALUES
  ('order-0001-0001-0001-000000000001', 'RD-100001', 'cust-1111-1111-1111-111111111111', 'store-1111-1111-1111-111111111111', 'addr-1111-1111-1111-111111111111', 'delivered', 32.97, 3.99, 2.50, 4.28, 5.00, 48.74, 'completed', NULL, NOW() - INTERVAL '7 days'),
  ('order-0002-0002-0002-000000000002', 'RD-100002', 'cust-2222-2222-2222-222222222222', 'store-2222-2222-2222-222222222222', 'addr-2222-1111-1111-111111111111', 'delivered', 41.97, 0.00, 2.50, 5.78, 7.00, 57.25, 'completed', 'Extra spicy please!', NOW() - INTERVAL '5 days'),
  ('order-0003-0003-0003-000000000003', 'RD-100003', 'cust-3333-3333-3333-333333333333', 'store-3333-3333-3333-333333333333', 'addr-3333-1111-1111-111111111111', 'delivered', 51.96, 3.99, 2.50, 7.60, 8.00, 74.05, 'completed', NULL, NOW() - INTERVAL '4 days'),
  ('order-0004-0004-0004-000000000004', 'RD-100004', 'cust-1111-1111-1111-111111111111', 'store-4444-4444-4444-444444444444', 'addr-1111-1111-1111-111111111111', 'delivered', 35.97, 3.99, 2.50, 5.52, 6.00, 53.98, 'completed', 'No onions', NOW() - INTERVAL '3 days'),
  ('order-0005-0005-0005-000000000005', 'RD-100005', 'cust-2222-2222-2222-222222222222', 'store-5555-5555-5555-555555555555', 'addr-2222-1111-1111-111111111111', 'delivered', 45.96, 0.00, 2.50, 6.30, 7.00, 61.76, 'completed', NULL, NOW() - INTERVAL '2 days'),

-- 3 Preparing Orders
  ('order-0006-0006-0006-000000000006', 'RD-100006', 'cust-3333-3333-3333-333333333333', 'store-1111-1111-1111-111111111111', 'addr-3333-1111-1111-111111111111', 'preparing', 27.98, 3.99, 2.50, 4.48, 5.00, 43.95, 'completed', NULL, NOW() - INTERVAL '30 minutes'),
  ('order-0007-0007-0007-000000000007', 'RD-100007', 'cust-1111-1111-1111-111111111111', 'store-2222-2222-2222-222222222222', 'addr-1111-1111-1111-111111111111', 'preparing', 30.97, 0.00, 2.50, 4.35, 4.00, 41.82, 'completed', 'Medium spice level', NOW() - INTERVAL '25 minutes'),
  ('order-0008-0008-0008-000000000008', 'RD-100008', 'cust-2222-2222-2222-222222222222', 'store-5555-5555-5555-555555555555', 'addr-2222-1111-1111-111111111111', 'preparing', 31.97, 3.99, 2.50, 5.00, 5.00, 48.46, 'completed', NULL, NOW() - INTERVAL '20 minutes'),

-- 2 Pending Orders
  ('order-0009-0009-0009-000000000009', 'RD-100009', 'cust-3333-3333-3333-333333333333', 'store-3333-3333-3333-333333333333', 'addr-3333-1111-1111-111111111111', 'pending', 34.97, 3.99, 2.50, 5.39, 0.00, 46.85, 'completed', NULL, NOW() - INTERVAL '10 minutes'),
  ('order-0010-0010-0010-000000000010', 'RD-100010', 'cust-1111-1111-1111-111111111111', 'store-4444-4444-4444-444444444444', 'addr-1111-1111-1111-111111111111', 'pending', 25.98, 3.99, 2.50, 4.22, 4.00, 40.69, 'completed', NULL, NOW() - INTERVAL '5 minutes'),

-- 2 In Transit / Picked Up Orders
  ('order-0011-0011-0011-000000000011', 'RD-100011', 'cust-2222-2222-2222-222222222222', 'store-1111-1111-1111-111111111111', 'addr-2222-1111-1111-111111111111', 'picked_up', 29.97, 3.99, 2.50, 4.74, 5.00, 46.20, 'completed', NULL, NOW() - INTERVAL '15 minutes'),
  ('order-0012-0012-0012-000000000012', 'RD-100012', 'cust-3333-3333-3333-333333333333', 'store-2222-2222-2222-222222222222', 'addr-3333-1111-1111-111111111111', 'in_transit', 26.98, 3.99, 2.50, 4.35, 4.00, 41.82, 'completed', NULL, NOW() - INTERVAL '12 minutes'),

-- 2 Ready for Pickup Orders
  ('order-0013-0013-0013-000000000013', 'RD-100013', 'cust-1111-1111-1111-111111111111', 'store-3333-3333-3333-333333333333', 'addr-1111-1111-1111-111111111111', 'ready_for_pickup', 42.96, 0.00, 2.50, 5.91, 6.00, 57.37, 'completed', NULL, NOW() - INTERVAL '18 minutes'),
  ('order-0014-0014-0014-000000000014', 'RD-100014', 'cust-2222-2222-2222-222222222222', 'store-4444-4444-4444-444444444444', 'addr-2222-1111-1111-111111111111', 'ready_for_pickup', 31.97, 3.99, 2.50, 5.00, 5.00, 48.46, 'completed', NULL, NOW() - INTERVAL '22 minutes'),

-- 1 Cancelled Order
  ('order-0015-0015-0015-000000000015', 'RD-100015', 'cust-3333-3333-3333-333333333333', 'store-5555-5555-5555-555555555555', 'addr-3333-1111-1111-111111111111', 'cancelled', 28.97, 3.99, 2.50, 4.61, 0.00, 40.07, 'refunded', 'Customer requested cancellation', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- ORDER ITEMS
-- ==========================================

INSERT INTO order_items (id, order_id, menu_item_id, menu_item_name, quantity, unit_price, total_price, special_instructions) VALUES
  -- Order 1 items (Maria's Kitchen)
  ('oi-0001-0001', 'order-0001-0001-0001-000000000001', 'item-maria-3', 'Tacos Al Pastor', 1, 14.99, 14.99, NULL),
  ('oi-0001-0002', 'order-0001-0001-0001-000000000001', 'item-maria-1', 'Guacamole & Chips', 1, 8.99, 8.99, NULL),
  ('oi-0001-0003', 'order-0001-0001-0001-000000000001', 'item-maria-9', 'Horchata', 2, 3.99, 7.98, NULL),

  -- Order 2 items (Thai Home Cooking)
  ('oi-0002-0001', 'order-0002-0002-0002-000000000002', 'item-thai-3', 'Pad Thai', 1, 14.99, 14.99, NULL),
  ('oi-0002-0002', 'order-0002-0002-0002-000000000002', 'item-thai-6', 'Green Curry', 1, 15.99, 15.99, 'Extra spicy'),
  ('oi-0002-0003', 'order-0002-0002-0002-000000000002', 'item-thai-8', 'Mango Sticky Rice', 1, 8.99, 8.99, NULL),

  -- Order 3 items (Nonna's Table)
  ('oi-0003-0001', 'order-0003-0003-0003-000000000003', 'item-nonna-4', 'Lasagna', 1, 17.99, 17.99, NULL),
  ('oi-0003-0002', 'order-0003-0003-0003-000000000003', 'item-nonna-5', 'Pasta Carbonara', 1, 16.99, 16.99, NULL),
  ('oi-0003-0003', 'order-0003-0003-0003-000000000003', 'item-nonna-9', 'Tiramisu', 2, 8.99, 17.98, NULL),

  -- Order 4 items (Spice Route)
  ('oi-0004-0001', 'order-0004-0004-0004-000000000004', 'item-spice-4', 'Shawarma Plate', 1, 15.99, 15.99, NULL),
  ('oi-0004-0002', 'order-0004-0004-0004-000000000004', 'item-spice-1', 'Hummus & Pita', 1, 9.99, 9.99, NULL),
  ('oi-0004-0003', 'order-0004-0004-0004-000000000004', 'item-spice-9', 'Baklava', 1, 6.99, 6.99, NULL),

  -- Order 5 items (Seoul Kitchen)
  ('oi-0005-0001', 'order-0005-0005-0005-000000000005', 'item-seoul-5', 'Korean Fried Chicken', 1, 16.99, 16.99, NULL),
  ('oi-0005-0002', 'order-0005-0005-0005-000000000005', 'item-seoul-3', 'Bibimbap', 1, 14.99, 14.99, NULL),
  ('oi-0005-0003', 'order-0005-0005-0005-000000000005', 'item-seoul-7', 'Kimchi Jjigae', 1, 13.99, 13.99, NULL),

  -- Order 6 items
  ('oi-0006-0001', 'order-0006-0006-0006-000000000006', 'item-maria-4', 'Enchiladas Verdes', 1, 15.99, 15.99, NULL),
  ('oi-0006-0002', 'order-0006-0006-0006-000000000006', 'item-maria-7', 'Churros', 1, 7.99, 7.99, NULL),

  -- Order 7 items
  ('oi-0007-0001', 'order-0007-0007-0007-000000000007', 'item-thai-3', 'Pad Thai', 1, 14.99, 14.99, NULL),
  ('oi-0007-0002', 'order-0007-0007-0007-000000000007', 'item-thai-1', 'Tom Yum Soup', 1, 11.99, 11.99, NULL),

  -- Order 8 items
  ('oi-0008-0001', 'order-0008-0008-0008-000000000008', 'item-seoul-4', 'Bulgogi Rice Bowl', 1, 15.99, 15.99, NULL),
  ('oi-0008-0002', 'order-0008-0008-0008-000000000008', 'item-seoul-1', 'Kimchi Pancake', 1, 10.99, 10.99, NULL),

  -- Order 9 items
  ('oi-0009-0001', 'order-0009-0009-0009-000000000009', 'item-nonna-4', 'Lasagna', 1, 17.99, 17.99, NULL),
  ('oi-0009-0002', 'order-0009-0009-0009-000000000009', 'item-nonna-6', 'Fettuccine Alfredo', 1, 15.99, 15.99, NULL),

  -- Order 10 items
  ('oi-0010-0001', 'order-0010-0010-0010-000000000010', 'item-spice-4', 'Shawarma Plate', 1, 15.99, 15.99, NULL),
  ('oi-0010-0002', 'order-0010-0010-0010-000000000010', 'item-spice-10', 'Mint Tea', 2, 3.99, 7.98, NULL),

  -- Order 11 items
  ('oi-0011-0001', 'order-0011-0011-0011-000000000011', 'item-maria-3', 'Tacos Al Pastor', 2, 14.99, 29.98, NULL),

  -- Order 12 items
  ('oi-0012-0001', 'order-0012-0012-0012-000000000012', 'item-thai-3', 'Pad Thai', 1, 14.99, 14.99, NULL),
  ('oi-0012-0002', 'order-0012-0012-0012-000000000012', 'item-thai-9', 'Thai Iced Tea', 2, 4.99, 9.98, NULL),

  -- Order 13 items
  ('oi-0013-0001', 'order-0013-0013-0013-000000000013', 'item-nonna-5', 'Pasta Carbonara', 2, 16.99, 33.98, NULL),
  ('oi-0013-0002', 'order-0013-0013-0013-000000000013', 'item-nonna-9', 'Tiramisu', 1, 8.99, 8.99, NULL),

  -- Order 14 items
  ('oi-0014-0001', 'order-0014-0014-0014-000000000014', 'item-spice-5', 'Mixed Grill', 1, 19.99, 19.99, NULL),
  ('oi-0014-0002', 'order-0014-0014-0014-000000000014', 'item-spice-1', 'Hummus & Pita', 1, 9.99, 9.99, NULL),

  -- Order 15 items (cancelled)
  ('oi-0015-0001', 'order-0015-0015-0015-000000000015', 'item-seoul-5', 'Korean Fried Chicken', 1, 16.99, 16.99, NULL),
  ('oi-0015-0002', 'order-0015-0015-0015-000000000015', 'item-seoul-10', 'Bingsu', 1, 8.99, 8.99, NULL)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- DELIVERIES (8 linked to orders)
-- ==========================================

INSERT INTO deliveries (id, order_id, driver_id, status, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, delivery_fee, driver_payout, distance_km) VALUES
  -- Delivered
  ('del-0001', 'order-0001-0001-0001-000000000001', 'driver-1111-1111-1111-111111111111', 'delivered', '456 James Street North, Hamilton, ON', 43.2650, -79.8680, '100 Main Street West, Hamilton, ON', 43.2550, -79.8700, 3.99, 5.50, 2.1),
  ('del-0002', 'order-0002-0002-0002-000000000002', 'driver-2222-2222-2222-222222222222', 'delivered', '123 King Street East, Hamilton, ON', 43.2530, -79.8620, '250 King Street East, Hamilton, ON', 43.2530, -79.8550, 0.00, 4.50, 1.5),
  ('del-0003', 'order-0003-0003-0003-000000000003', 'driver-1111-1111-1111-111111111111', 'delivered', '789 Locke Street South, Hamilton, ON', 43.2480, -79.8760, '500 Upper James Street, Hamilton, ON', 43.2350, -79.8650, 3.99, 6.00, 2.8),
  ('del-0004', 'order-0004-0004-0004-000000000004', 'driver-2222-2222-2222-222222222222', 'delivered', '321 Ottawa Street North, Hamilton, ON', 43.2580, -79.8320, '100 Main Street West, Hamilton, ON', 43.2550, -79.8700, 3.99, 7.00, 3.5),
  ('del-0005', 'order-0005-0005-0005-000000000005', 'driver-1111-1111-1111-111111111111', 'delivered', '567 Barton Street East, Hamilton, ON', 43.2620, -79.8450, '250 King Street East, Hamilton, ON', 43.2530, -79.8550, 0.00, 5.00, 2.0),

  -- In Transit
  ('del-0011', 'order-0011-0011-0011-000000000011', 'driver-1111-1111-1111-111111111111', 'picked_up', '456 James Street North, Hamilton, ON', 43.2650, -79.8680, '250 King Street East, Hamilton, ON', 43.2530, -79.8550, 3.99, 5.50, 2.2),
  ('del-0012', 'order-0012-0012-0012-000000000012', 'driver-2222-2222-2222-222222222222', 'en_route_to_dropoff', '123 King Street East, Hamilton, ON', 43.2530, -79.8620, '500 Upper James Street, Hamilton, ON', 43.2350, -79.8650, 3.99, 6.50, 3.0),

  -- Assigned (ready for pickup)
  ('del-0013', 'order-0013-0013-0013-000000000013', 'driver-1111-1111-1111-111111111111', 'assigned', '789 Locke Street South, Hamilton, ON', 43.2480, -79.8760, '100 Main Street West, Hamilton, ON', 43.2550, -79.8700, 0.00, 4.00, 1.8)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- REVIEWS (10 reviews, ratings 4-5 stars)
-- ==========================================

INSERT INTO reviews (id, order_id, customer_id, storefront_id, rating, comment, is_visible, created_at) VALUES
  ('rev-0001', 'order-0001-0001-0001-000000000001', 'cust-1111-1111-1111-111111111111', 'store-1111-1111-1111-111111111111', 5, 'Absolutely delicious tacos! The al pastor was perfectly marinated and the salsa was fresh. Will definitely order again!', true, NOW() - INTERVAL '6 days'),
  ('rev-0002', 'order-0002-0002-0002-000000000002', 'cust-2222-2222-2222-222222222222', 'store-2222-2222-2222-222222222222', 5, 'Best Pad Thai I''ve had outside of Thailand! The green curry was also amazing. Highly recommend!', true, NOW() - INTERVAL '4 days'),
  ('rev-0003', 'order-0003-0003-0003-000000000003', 'cust-3333-3333-3333-333333333333', 'store-3333-3333-3333-333333333333', 4, 'Great Italian food! The lasagna was hearty and the tiramisu was divine. Only minor issue was delivery took a bit longer than expected.', true, NOW() - INTERVAL '3 days'),
  ('rev-0004', 'order-0004-0004-0004-000000000004', 'cust-1111-1111-1111-111111111111', 'store-4444-4444-4444-444444444444', 5, 'The shawarma was incredible! So flavorful and generous portions. The hummus was the creamiest I''ve ever had.', true, NOW() - INTERVAL '2 days'),
  ('rev-0005', 'order-0005-0005-0005-000000000005', 'cust-2222-2222-2222-222222222222', 'store-5555-5555-5555-555555555555', 5, 'Korean fried chicken was crispy perfection! The bibimbap was fresh and delicious. Love this place!', true, NOW() - INTERVAL '1 day'),
  ('rev-0006', 'order-0001-0001-0001-000000000001', 'cust-2222-2222-2222-222222222222', 'store-1111-1111-1111-111111111111', 4, 'Really good Mexican food. The churros were a nice sweet ending!', true, NOW() - INTERVAL '8 days'),
  ('rev-0007', 'order-0002-0002-0002-000000000002', 'cust-3333-3333-3333-333333333333', 'store-2222-2222-2222-222222222222', 5, 'Tom Yum soup was so authentic! Reminded me of my trip to Bangkok.', true, NOW() - INTERVAL '7 days'),
  ('rev-0008', 'order-0003-0003-0003-000000000003', 'cust-1111-1111-1111-111111111111', 'store-3333-3333-3333-333333333333', 5, 'Pasta carbonara was restaurant quality! Rosa really knows her Italian cuisine.', true, NOW() - INTERVAL '6 days'),
  ('rev-0009', 'order-0004-0004-0004-000000000004', 'cust-2222-2222-2222-222222222222', 'store-4444-4444-4444-444444444444', 4, 'Great falafel! Wish the portion was slightly bigger but taste was perfect.', true, NOW() - INTERVAL '5 days'),
  ('rev-0010', 'order-0005-0005-0005-000000000005', 'cust-1111-1111-1111-111111111111', 'store-5555-5555-5555-555555555555', 5, 'Kimchi jjigae was so comforting! Perfect for a cold Hamilton day.', true, NOW() - INTERVAL '4 days')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PROMO CODES
-- ==========================================

INSERT INTO promo_codes (id, code, description, discount_type, discount_value, min_order_amount, usage_limit, is_active)
VALUES
  ('promo-0001', 'WELCOME10', 'Welcome discount - 10% off your first order', 'percentage', 10, 15.00, 1000, true),
  ('promo-0002', 'FREESHIP', 'Free delivery on orders over $25', 'fixed', 5.00, 25.00, NULL, true),
  ('promo-0003', 'HAMILTON20', '20% off for Hamilton residents', 'percentage', 20, 20.00, 500, true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- PLATFORM USERS (Ops Admin)
-- ==========================================

INSERT INTO platform_users (id, user_id, email, name, role, is_active)
VALUES
  ('platform-0001', '00000000-0000-0000-0000-000000000030', 'ops@ridendine.ca', 'Ops Admin', 'ops_admin', true)
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- SUPPORT TICKETS (Sample)
-- ==========================================

INSERT INTO support_tickets (id, order_id, customer_id, subject, description, status, priority, created_at)
VALUES
  ('ticket-0001', 'order-0015-0015-0015-000000000015', 'cust-3333-3333-3333-333333333333', 'Order Cancellation Refund', 'I cancelled my order but haven''t received my refund yet. Order number RD-100015.', 'open', 'medium', NOW() - INTERVAL '23 hours'),
  ('ticket-0002', NULL, 'cust-1111-1111-1111-111111111111', 'Can''t update delivery address', 'I''m trying to add a new delivery address but the save button doesn''t work.', 'in_progress', 'low', NOW() - INTERVAL '2 days')
ON CONFLICT (id) DO NOTHING;

-- Drop the helper function
DROP FUNCTION IF EXISTS generate_order_number();
