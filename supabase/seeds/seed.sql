-- ==========================================
-- RIDENDINE SEED DATA
-- Development/Demo Data
-- ==========================================

-- Note: This seed file assumes auth.users already exist
-- In development, create users through Supabase Auth first

-- ==========================================
-- SAMPLE CHEF DATA
-- ==========================================

-- Insert sample chef profiles (you'll need to update user_ids with real auth user IDs)
-- These use placeholder UUIDs that should be replaced

INSERT INTO chef_profiles (id, user_id, display_name, bio, phone, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000001', 'Maria Garcia', 'Bringing authentic Mexican flavors from my grandmother''s kitchen to your table. Every dish tells a story of tradition and love.', '(555) 123-4567', 'approved'),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000002', 'Suda Patel', 'Thai cuisine enthusiast sharing the vibrant flavors of Bangkok. Fresh ingredients, bold spices, unforgettable taste.', '(555) 234-5678', 'approved'),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000003', 'Rosa Lombardi', 'Third-generation Italian cook. From fresh pasta to slow-cooked sauces, every meal is made with amore.', '(555) 345-6789', 'approved')
ON CONFLICT DO NOTHING;

-- Insert chef kitchens
INSERT INTO chef_kitchens (id, chef_id, name, address_line1, city, state, postal_code, lat, lng, is_verified)
VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'Maria''s Home Kitchen', '456 Chef Lane', 'Austin', 'TX', '78701', 30.2672, -97.7431, true),
  ('aaaa2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'Suda''s Kitchen', '789 Spice Street', 'Austin', 'TX', '78702', 30.2711, -97.7306, true),
  ('aaaa3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'Nonna''s Kitchen', '123 Pasta Place', 'Austin', 'TX', '78703', 30.2850, -97.7494, true)
ON CONFLICT DO NOTHING;

-- Insert chef storefronts
INSERT INTO chef_storefronts (id, chef_id, kitchen_id, slug, name, description, cuisine_types, is_active, is_featured, average_rating, total_reviews, min_order_amount, estimated_prep_time_min, estimated_prep_time_max)
VALUES
  ('bbbb1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaa1111-1111-1111-1111-111111111111', 'chef-maria', 'Maria''s Kitchen', 'Authentic Mexican cuisine made with love and traditional family recipes passed down through generations.', ARRAY['Mexican', 'Latin'], true, true, 4.8, 124, 15.00, 20, 35),
  ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'aaaa2222-2222-2222-2222-222222222222', 'thai-home', 'Thai Home Cooking', 'Experience the authentic flavors of Thailand. From pad thai to green curry, every dish is crafted with traditional techniques.', ARRAY['Thai', 'Asian'], true, true, 4.9, 89, 12.00, 25, 40),
  ('bbbb3333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'aaaa3333-3333-3333-3333-333333333333', 'italian-nonna', 'Nonna''s Table', 'Classic Italian comfort food. Handmade pasta, rich sauces, and recipes that have been in our family for generations.', ARRAY['Italian', 'Mediterranean'], true, false, 4.7, 156, 18.00, 30, 45)
ON CONFLICT DO NOTHING;

-- ==========================================
-- SAMPLE MENU DATA (Maria's Kitchen)
-- ==========================================

-- Menu Categories
INSERT INTO menu_categories (id, storefront_id, name, description, sort_order, is_active)
VALUES
  ('cccc1111-1111-1111-1111-111111111111', 'bbbb1111-1111-1111-1111-111111111111', 'Appetizers', 'Start your meal with our delicious starters', 1, true),
  ('cccc2222-2222-2222-2222-222222222222', 'bbbb1111-1111-1111-1111-111111111111', 'Main Courses', 'Hearty traditional Mexican dishes', 2, true),
  ('cccc3333-3333-3333-3333-333333333333', 'bbbb1111-1111-1111-1111-111111111111', 'Desserts', 'Sweet endings to your meal', 3, true)
ON CONFLICT DO NOTHING;

-- Menu Items
INSERT INTO menu_items (id, category_id, storefront_id, name, description, price, is_available, is_featured, dietary_tags, prep_time_minutes, sort_order)
VALUES
  -- Appetizers
  ('dddd1111-1111-1111-1111-111111111111', 'cccc1111-1111-1111-1111-111111111111', 'bbbb1111-1111-1111-1111-111111111111', 'Guacamole & Chips', 'Fresh made guacamole with ripe avocados, cilantro, lime, and house-made tortilla chips', 8.99, true, true, ARRAY['Vegan', 'Gluten-Free'], 10, 1),
  ('dddd2222-2222-2222-2222-222222222222', 'cccc1111-1111-1111-1111-111111111111', 'bbbb1111-1111-1111-1111-111111111111', 'Queso Fundido', 'Melted Oaxacan cheese with chorizo and roasted peppers, served with warm tortillas', 10.99, true, false, ARRAY[]::TEXT[], 12, 2),
  ('dddd3333-3333-3333-3333-333333333333', 'cccc1111-1111-1111-1111-111111111111', 'bbbb1111-1111-1111-1111-111111111111', 'Elote', 'Mexican street corn with mayo, cotija cheese, chili powder, and lime', 6.99, true, false, ARRAY['Vegetarian', 'Gluten-Free'], 8, 3),

  -- Main Courses
  ('dddd4444-4444-4444-4444-444444444444', 'cccc2222-2222-2222-2222-222222222222', 'bbbb1111-1111-1111-1111-111111111111', 'Carne Asada Plate', 'Grilled marinated flank steak with rice, refried beans, fresh salsa, and handmade tortillas', 18.99, true, true, ARRAY['Gluten-Free'], 25, 1),
  ('dddd5555-5555-5555-5555-555555555555', 'cccc2222-2222-2222-2222-222222222222', 'bbbb1111-1111-1111-1111-111111111111', 'Enchiladas Verdes', 'Three chicken enchiladas smothered in tangy green tomatillo sauce with crema and queso fresco', 15.99, true, false, ARRAY[]::TEXT[], 20, 2),
  ('dddd6666-6666-6666-6666-666666666666', 'cccc2222-2222-2222-2222-222222222222', 'bbbb1111-1111-1111-1111-111111111111', 'Fish Tacos', 'Beer-battered fish with cabbage slaw, chipotle crema, and pico de gallo on corn tortillas', 14.99, true, false, ARRAY[]::TEXT[], 18, 3),
  ('dddd7777-7777-7777-7777-777777777777', 'cccc2222-2222-2222-2222-222222222222', 'bbbb1111-1111-1111-1111-111111111111', 'Carnitas', 'Slow-braised pork shoulder with citrus and spices, served with rice and beans', 16.99, true, false, ARRAY['Gluten-Free'], 15, 4),

  -- Desserts
  ('dddd8888-8888-8888-8888-888888888888', 'cccc3333-3333-3333-3333-333333333333', 'bbbb1111-1111-1111-1111-111111111111', 'Churros', 'Crispy cinnamon sugar churros served with rich chocolate dipping sauce', 6.99, true, false, ARRAY['Vegetarian'], 10, 1),
  ('dddd9999-9999-9999-9999-999999999999', 'cccc3333-3333-3333-3333-333333333333', 'bbbb1111-1111-1111-1111-111111111111', 'Tres Leches', 'Traditional three-milk sponge cake topped with whipped cream and cinnamon', 7.99, true, true, ARRAY['Vegetarian'], 5, 2)
ON CONFLICT DO NOTHING;

-- Menu Item Options
INSERT INTO menu_item_options (id, menu_item_id, name, is_required, max_selections, sort_order)
VALUES
  ('eeee1111-1111-1111-1111-111111111111', 'dddd4444-4444-4444-4444-444444444444', 'Protein Temperature', true, 1, 1),
  ('eeee2222-2222-2222-2222-222222222222', 'dddd4444-4444-4444-4444-444444444444', 'Add-ons', false, 3, 2),
  ('eeee3333-3333-3333-3333-333333333333', 'dddd5555-5555-5555-5555-555555555555', 'Spice Level', true, 1, 1)
ON CONFLICT DO NOTHING;

-- Menu Item Option Values
INSERT INTO menu_item_option_values (id, option_id, name, price_adjustment, is_available, sort_order)
VALUES
  -- Protein Temperature
  ('ffff1111-1111-1111-1111-111111111111', 'eeee1111-1111-1111-1111-111111111111', 'Medium Rare', 0, true, 1),
  ('ffff2222-2222-2222-2222-222222222222', 'eeee1111-1111-1111-1111-111111111111', 'Medium', 0, true, 2),
  ('ffff3333-3333-3333-3333-333333333333', 'eeee1111-1111-1111-1111-111111111111', 'Medium Well', 0, true, 3),
  ('ffff4444-4444-4444-4444-444444444444', 'eeee1111-1111-1111-1111-111111111111', 'Well Done', 0, true, 4),

  -- Add-ons
  ('ffff5555-5555-5555-5555-555555555555', 'eeee2222-2222-2222-2222-222222222222', 'Extra Guacamole', 2.50, true, 1),
  ('ffff6666-6666-6666-6666-666666666666', 'eeee2222-2222-2222-2222-222222222222', 'Sour Cream', 1.00, true, 2),
  ('ffff7777-7777-7777-7777-777777777777', 'eeee2222-2222-2222-2222-222222222222', 'Extra Tortillas', 1.50, true, 3),

  -- Spice Level
  ('ffff8888-8888-8888-8888-888888888888', 'eeee3333-3333-3333-3333-333333333333', 'Mild', 0, true, 1),
  ('ffff9999-9999-9999-9999-999999999999', 'eeee3333-3333-3333-3333-333333333333', 'Medium', 0, true, 2),
  ('ffff0000-0000-0000-0000-000000000000', 'eeee3333-3333-3333-3333-333333333333', 'Hot', 0, true, 3)
ON CONFLICT DO NOTHING;

-- ==========================================
-- SAMPLE CUSTOMER DATA
-- ==========================================

INSERT INTO customers (id, user_id, first_name, last_name, email, phone)
VALUES
  ('44444444-4444-4444-4444-444444444444', '00000000-0000-0000-0000-000000000004', 'John', 'Doe', 'john@example.com', '(555) 111-2222'),
  ('55555555-5555-5555-5555-555555555555', '00000000-0000-0000-0000-000000000005', 'Sarah', 'Miller', 'sarah@example.com', '(555) 333-4444')
ON CONFLICT DO NOTHING;

INSERT INTO customer_addresses (id, customer_id, label, address_line1, city, state, postal_code, lat, lng, is_default)
VALUES
  ('66666666-6666-6666-6666-666666666666', '44444444-4444-4444-4444-444444444444', 'Home', '123 Main Street', 'Austin', 'TX', '78704', 30.2500, -97.7500, true),
  ('77777777-7777-7777-7777-777777777777', '44444444-4444-4444-4444-444444444444', 'Work', '500 Congress Ave', 'Austin', 'TX', '78701', 30.2680, -97.7428, false)
ON CONFLICT DO NOTHING;

-- ==========================================
-- SAMPLE DRIVER DATA
-- ==========================================

INSERT INTO drivers (id, user_id, first_name, last_name, phone, email, status)
VALUES
  ('88888888-8888-8888-8888-888888888888', '00000000-0000-0000-0000-000000000006', 'Carlos', 'Martinez', '(555) 555-6666', 'carlos@example.com', 'approved'),
  ('99999999-9999-9999-9999-999999999999', '00000000-0000-0000-0000-000000000007', 'Ahmed', 'Khan', '(555) 666-7777', 'ahmed@example.com', 'approved')
ON CONFLICT DO NOTHING;

INSERT INTO driver_vehicles (id, driver_id, vehicle_type, make, model, year, color, license_plate, is_active)
VALUES
  ('gggg1111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'car', 'Toyota', 'Camry', 2020, 'Silver', 'ABC-1234', true),
  ('gggg2222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 'car', 'Honda', 'Civic', 2021, 'Blue', 'XYZ-5678', true)
ON CONFLICT DO NOTHING;

INSERT INTO driver_presence (id, driver_id, status)
VALUES
  ('hhhh1111-1111-1111-1111-111111111111', '88888888-8888-8888-8888-888888888888', 'offline'),
  ('hhhh2222-2222-2222-2222-222222222222', '99999999-9999-9999-9999-999999999999', 'offline')
ON CONFLICT DO NOTHING;

-- ==========================================
-- SAMPLE PROMO CODES
-- ==========================================

INSERT INTO promo_codes (id, code, description, discount_type, discount_value, min_order_amount, usage_limit, is_active)
VALUES
  ('pppp1111-1111-1111-1111-111111111111', 'WELCOME10', 'Welcome discount - 10% off your first order', 'percentage', 10, 15.00, 1000, true),
  ('pppp2222-2222-2222-2222-222222222222', 'FREESHIP', 'Free delivery on orders over $25', 'fixed', 5.00, 25.00, null, true)
ON CONFLICT DO NOTHING;
