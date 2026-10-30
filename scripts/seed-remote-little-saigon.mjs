import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const rawUrl = process.env.DATABASE_URL || '';
if (!rawUrl) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

let connectionString = rawUrl;
try {
  new URL(connectionString);
} catch {
  connectionString = connectionString.replace(/##/g, '%23%23');
}

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  console.log('Connected to remote database.');

  try {
    await client.query('BEGIN');

    // 1. Chef Profile (Little Saigon Restaurant)
    console.log('Seeding chef_profiles for Little Saigon...');
    await client.query(`
      INSERT INTO chef_profiles (id, user_id, display_name, phone, bio, status, created_at, updated_at)
      VALUES (
        'c5c5c5c5-c5c5-4c5c-8c5c-c5c5c5c5c5c5',
        '99999999-9999-9999-9999-999999999999',
        'Little Saigon Restaurant',
        '+1 (905) 389-9826',
        'Authentic Vietnamese culinary institution and verified Cooco kitchen partner in Hamilton. Serving beloved authentic Phở with 12+ hour bone broths, freshly rolled appetizers, traditional rice dishes, vermicelli bowls, wok specialties, Thai & Japanese favourites, family dinners, and vibrant party trays.',
        'approved',
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        phone = EXCLUDED.phone,
        bio = EXCLUDED.bio,
        status = EXCLUDED.status,
        updated_at = NOW();
    `);

    // 2. Chef Kitchen
    console.log('Seeding chef_kitchens...');
    await client.query(`
      INSERT INTO chef_kitchens (id, chef_id, name, address_line1, city, state, postal_code, country, is_verified, created_at, updated_at)
      VALUES (
        'aa000000-0004-4000-8000-000000000001',
        'c5c5c5c5-c5c5-4c5c-8c5c-c5c5c5c5c5c5',
        'Little Saigon Kitchen',
        '891 Upper James St',
        'Hamilton',
        'ON',
        'L9C 3A3',
        'CA',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        address_line1 = EXCLUDED.address_line1,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        postal_code = EXCLUDED.postal_code,
        is_verified = EXCLUDED.is_verified,
        updated_at = NOW();
    `);

    // 3. Chef Storefront
    console.log('Seeding chef_storefronts...');
    await client.query(`
      INSERT INTO chef_storefronts (
        id, chef_id, kitchen_id, slug, name, description, cuisine_types,
        cover_image_url, logo_url,
        is_active, is_featured,
        estimated_prep_time_min, estimated_prep_time_max,
        min_order_amount,
        average_rating, total_reviews,
        created_at, updated_at
      )
      VALUES (
        '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a',
        'c5c5c5c5-c5c5-4c5c-8c5c-c5c5c5c5c5c5',
        'aa000000-0004-4000-8000-000000000001',
        'little-saigon',
        'Little Saigon Restaurant',
        'Official Cooco partner in Hamilton. Authentic Vietnamese cuisine crafted from time-honored recipes: 12-hour simmered Phở, sizzling Bánh Xèo, wok specialties, vermicelli bowls, and party catering trays. Located at 891 Upper James St.',
        ARRAY['Vietnamese', 'Cooco Partner', 'Phở', 'Noodles', 'Asian', 'Family Dinners', 'Party Trays'],
        '/chefs/little-saigon/cover.jpg',
        '/chefs/little-saigon/logo.jpg',
        true, true,
        25, 45,
        15.00,
        4.9, 58,
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        slug = EXCLUDED.slug,
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        cuisine_types = EXCLUDED.cuisine_types,
        cover_image_url = EXCLUDED.cover_image_url,
        logo_url = EXCLUDED.logo_url,
        is_active = EXCLUDED.is_active,
        is_featured = EXCLUDED.is_featured,
        estimated_prep_time_min = EXCLUDED.estimated_prep_time_min,
        estimated_prep_time_max = EXCLUDED.estimated_prep_time_max,
        min_order_amount = EXCLUDED.min_order_amount,
        average_rating = EXCLUDED.average_rating,
        total_reviews = EXCLUDED.total_reviews,
        updated_at = NOW();
    `);

    // 4. Chef Availability (7 days, 24h operational window)
    console.log('Seeding chef_availability...');
    await client.query(`
      INSERT INTO chef_availability (storefront_id, day_of_week, start_time, end_time, is_available)
      VALUES
        ('4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 0, '00:00:00', '23:59:59', true),
        ('4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 1, '00:00:00', '23:59:59', true),
        ('4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 2, '00:00:00', '23:59:59', true),
        ('4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 3, '00:00:00', '23:59:59', true),
        ('4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 4, '00:00:00', '23:59:59', true),
        ('4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 5, '00:00:00', '23:59:59', true),
        ('4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 6, '00:00:00', '23:59:59', true)
      ON CONFLICT (storefront_id, day_of_week) DO UPDATE SET
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        is_available = EXCLUDED.is_available;
    `);

    // 5. Chef Delivery Zones
    console.log('Seeding chef_delivery_zones...');
    await client.query(`
      INSERT INTO chef_delivery_zones (storefront_id, name, radius_km, delivery_fee, min_order_for_free_delivery)
      VALUES (
        '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a',
        'Hamilton Upper James Delivery Zone',
        25.0,
        5.00,
        60.00
      )
      ON CONFLICT DO NOTHING;
    `);

    // 6. Platform Accounts (Chef Payable)
    console.log('Seeding platform_accounts for Little Saigon...');
    await client.query(`
      INSERT INTO platform_accounts (account_type, owner_id, balance_cents, pending_payout_cents, lifetime_earned_cents, currency)
      VALUES ('chef_payable', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 0, 0, 0, 'CAD')
      ON CONFLICT (account_type, owner_id) DO NOTHING;
    `);

    // 7. Menu Categories (19 categories)
    console.log('Seeding 19 menu_categories...');
    await client.query(`
      INSERT INTO menu_categories (id, storefront_id, name, description, sort_order, is_active, created_at, updated_at)
      VALUES
  ('ca700000-0004-4000-8000-000000000001', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Appetizers (Khai Vị)', 'Crispy spring rolls, freshly rolled rice paper wraps, golden wontons, and classic Vietnamese finger foods.', 1, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000002', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Specialty Noodle Soups (Hủ Tiếu & Mì)', 'Traditional slow-cooked pork, seafood, and spicy lemongrass Hue broths served with artisanal noodles.', 2, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000003', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Traditional Phở (Rice Noodle Soups)', 'Authentic 12-hour simmered beef bone broths infused with roasted star anise, cinnamon, and ginger.', 3, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000004', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Rice Dishes (Cơm Đĩa)', 'Fragrant jasmine steamed rice and wok-tossed fried rice served with chargrilled meats, eggs, and fresh salads.', 4, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000005', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Vermicelli Bowls (Bún)', 'Cool rice vermicelli bowls topped with lemongrass grilled meats, crispy spring rolls, fresh herbs, and nuoc cham.', 5, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000006', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Stir-Fried Noodles (Mì & Hủ Tiếu Xào)', 'Wok-seared egg noodles and flat rice noodles tossed with garden vegetables and chef choice proteins.', 6, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000007', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Wok Dishes & Sautéed Specialties', 'High-heat wok tossed beef, scallops, pompano fish, and ribs glazed in savory tamarind, garlic, and black bean sauces.', 7, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000008', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Vegetarian Specialties (Món Chay)', '100% plant-based Vietnamese classics featuring golden fried tofu, lemongrass, fresh herbs, and wok vegetables.', 8, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000009', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Chef Sizzling & Claypot Dishes', 'Sizzling cast-iron hot plates and caramelized claypot seafood prepared with garlic and fragrant chili oil.', 9, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000010', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Lunch Specials (Wok Express)', 'Satisfying midday wok-sautéed protein plates paired with steamed rice and crisp seasonal greens.', 10, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000011', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Family Dinner Combos', 'Hearty multi-portion dinner platters designed for family gathering, featuring rich sauces and prime proteins.', 11, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000012', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Vietnamese Regional Specialties (Đặc Sản)', 'Authentic regional gems including Bánh Xèo crepes, Bún Chả Hà Nội, Bún Đậu Mắm Tôm, and Cháo Lòng Dồi.', 12, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000013', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Party Trays & Catering (Khay Tiệc)', 'Large family and event catering platters feeding 6 to 8 guests. Freshly made to order for any celebration.', 13, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000014', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Thai & Japanese Corner', 'Savory stir-fried Yaki Udon, rich coconut curry soups, Tom Yum broths, and sweet-savory cashew stir fries.', 14, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000015', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Beverages & Fresh Juices', 'Traditional slow-dripped iced coffee with condensed milk, fresh juices, tropical fruit milkshakes, and soft drinks.', 15, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000016', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Desserts (Tráng Miệng)', 'Warm sweet purple sticky rice, fragrant mango sticky rice with coconut milk, and refreshing ice creams.', 16, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000017', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Special Thin Vermicelli Platters (Bánh Hỏi)', 'Delicate fine woven rice vermicelli sheets brushed with scallion oil, served with grilled skewers and rice paper wraps.', 17, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000018', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Bubble Tea & Fresh Milk', 'Handcrafted iced milk teas, fresh milk beverages, and classic boba drink creations.', 18, true, NOW(), NOW()),
  ('ca700000-0004-4000-8000-000000000019', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'Summer Refreshments & Fruit Teas', 'Chilled passionfruit sodas, salted kumquat teas, brown sugar matcha, and decadent durian avocado smoothies.', 19, true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    `);

    // 8. Menu Items (196 dishes)
    console.log('Seeding 196 menu_items...');
    await client.query(`
      INSERT INTO menu_items (
        id, storefront_id, category_id, name, description,
        price, image_url, is_available, is_featured,
        dietary_tags, prep_time_minutes, sort_order,
        created_at, updated_at
      )
      VALUES
  ('17e30000-0004-4000-8000-000000000001', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Fresh Salad Rolls with Shrimp & BBQ Pork (Gỏi Cuốn Tôm Thịt - 2 pcs)',
   'Delicate rice paper hand-rolled with poached tiger shrimp, tender BBQ pork, fresh lettuce, cucumber, mint, and rice vermicelli. Served with rich homemade hoisin peanut dipping sauce.',
   7.50, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80',
   true, true, ARRAY['Popular', 'Gluten-Free Option']::text[], 15, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000002', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Crispy Fried Chicken Wings (Cánh Gà Chiên Giòn - 5 pcs)',
   'Golden crispy chicken wings tossed in garlic and aromatic Vietnamese spices. Served with sweet chili dipping sauce.',
   7.50, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 15, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000003', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Fresh Rolls with Grilled Vietnamese Sausage (Gỏi Cuốn Nem Nướng - 2 pcs)',
   'Fragrant chargrilled Vietnamese pork sausage patties wrapped with fresh herbs, crisp greens, and vermicelli in delicate rice paper. Served with savory dipping sauce.',
   7.50, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80',
   true, true, ARRAY['Chef Special']::text[], 15, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000004', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Crispy Cream Cheese Wontons (Hoành Thánh Phô Mai - 6 pcs)',
   'Crisp golden wonton pastries stuffed with seasoned creamy cream cheese and green onions. Served piping hot with sweet chili sauce.',
   7.50, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Vegetarian']::text[], 15, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000005', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Crispy Tofu Skin Stuffed with Shrimp (Tàu Hũ Ky Chiên Tôm)',
   'Silky minced tiger shrimp wrapped in layers of golden crispy bean curd skin and deep-fried to perfection. Served with sweet plum dip.',
   7.50, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 15, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000006', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Crispy Vietnamese Spring Rolls (Chả Giò Chiên - 2 pcs)',
   'Crispy golden fried imperial rolls stuffed with seasoned minced pork, wood ear mushrooms, glass noodles, and carrots. Served with house nuoc cham.',
   7.50, 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 15, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000007', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Fresh Salad Rolls with Choice of Protein (Gỏi Cuốn Tự Chọn - 2 pcs)',
   'Fresh salad rolls prepared to order with your choice of tiger shrimp, lemongrass beef, grilled chicken, or BBQ pork with fresh greens and vermicelli.',
   7.50, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80',
   true, false, ARRAY['Gluten-Free Option']::text[], 15, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000008', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Vietnamese Mango Salad (Gỏi Xoài Tôm Thịt)',
   'Tangy shredded green mango tossed with fresh mint, basil, crushed peanuts, fried shallots, and spicy lime dressing, topped with shrimp, chicken, or beef.',
   15.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Gluten-Free Option', 'Spicy']::text[], 15, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000009', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Special Vietnamese Combo Appetizer (Khai Vị Thập Cẩm)',
   'The ultimate tasting platter featuring crispy spring rolls, fresh salad rolls, fried chicken wings, breaded shrimp, and crispy wontons. Perfect for sharing.',
   25.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000010', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Vietnamese Sizzling Crepe (Bánh Xèo Miền Tây)',
   'Crispy golden turmeric and coconut rice flour crepe loaded with sliced BBQ pork, tender shrimp, sweet onions, and fresh bean sprouts. Served with lettuce wraps and nuoc cham.',
   16.95, 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 10, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000011', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Handcrafted Wonton Soup (Súp Hoành Thánh)',
   'Delicate handmade pork and shrimp wontons floating in a light, fragrant chicken broth with scallions and sesame oil.',
   9.50, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 15, 11, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000012', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000001',
   'Crispy Breaded Butterfly Shrimp (Tôm Lăn Bột Chiên - 5 pcs)',
   'Jumbo tiger shrimp coated in Japanese panko breadcrumbs and fried until golden and crunchy. Served with house dipping sauce.',
   7.50, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 15, 12, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000013', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000002',
   'Thai Coconut Curry Soup (Canh Cà Ri Kiểu Thái)',
   'Aromatic lemongrass, galangal, and red coconut curry broth with tender bamboo shoots, bell peppers, and fresh herbs.',
   8.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Spicy']::text[], 25, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000014', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000002',
   'Udon Noodle Soup with Chicken or Seafood (Bánh Canh Gà / Hải Sản)',
   'Thick and chewy udon noodles in a savory, slow-simmered poultry broth served with your choice of poached chicken or assorted fresh seafood.',
   16.95, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY[]::text[], 25, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000015', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000002',
   'Egg Noodle & Wonton Soup with Honey BBQ Pork (Mì Hoành Thánh Xá Xíu)',
   'Springy egg noodles with handcrafted pork and shrimp wontons, tender honey-glazed char siu pork, and bok choy in slow-simmered broth.',
   16.95, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 25, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000016', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000002',
   'Mỹ Tho Style Clear Noodle Soup (Hủ Tiếu Mỹ Tho)',
   'Famous Southern Vietnamese specialty: chewy clear tapioca glass noodles in a rich pork and dried squid broth with tiger shrimp, minced pork, and char siu.',
   15.95, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000017', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000002',
   'Special Egg Noodle Soup with Seafood & BBQ Meat (Mì Thập Cẩm)',
   'Hearty bowl of fresh egg noodles loaded with tiger shrimp, tender squid, fish balls, and sliced BBQ pork in deeply aromatic broth.',
   16.95, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 25, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000018', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000002',
   'Huế Style Spicy Beef & Pork Noodle Soup (Bún Bò Huế)',
   'Renowned spicy lemongrass and fermented shrimp paste beef broth served with thick round rice noodles, well-done beef flank, pork, and Vietnamese pork sausage.',
   16.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Spicy', 'Popular']::text[], 25, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000019', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000002',
   'Rice & Egg Noodle Soup with Assorted Meat & Seafood (Hủ Tiếu Mì Hải Sản)',
   'The best of both worlds: combination of silky flat rice noodles and springy egg noodles with fresh tiger shrimp, squid, pork, and savory greens.',
   16.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY[]::text[], 25, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000020', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000002',
   'Rice Noodle Soup with Assorted Seafood (Hủ Tiếu Hải Sản)',
   'Silky rice noodles in light seafood broth laden with tiger shrimp, calamari, fish cake, and sweet crab claw meat.',
   16.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Gluten-Free Option']::text[], 25, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000021', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000002',
   'Thai Tom Yum Noodle Soup with Chicken or Seafood',
   'Zesty, spicy, and sour Thai herbal broth infused with kaffir lime leaves, lemongrass, chili paste, and fresh mushrooms.',
   9.50, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, false, ARRAY['Spicy']::text[], 25, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000022', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000003',
   'Phở Tái - Rare Beef Rice Noodle Soup',
   'Signature 12-hour simmered beef marrow bone broth infused with charred ginger, cinnamon, and star anise, served over flat rice noodles and topped with thinly shaved tender rare beef eye of round. Served with fresh bean sprouts, Thai basil, lime, and chilies.',
   15.95, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80',
   true, true, ARRAY['Popular', 'Gluten-Free Option']::text[], 20, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000023', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000003',
   'Phở Nạm - Well-Done Beef Flank Rice Noodle Soup',
   'Slow-simmered aromatic beef bone broth with flat rice noodles and melt-in-your-mouth braised beef flank slices. Served with fresh herbs, bean sprouts, and lime.',
   15.95, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80',
   true, true, ARRAY['Popular', 'Gluten-Free Option']::text[], 20, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000024', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000003',
   'Phở Gà - Fragrant Chicken Rice Noodle Soup',
   'Light and comforting golden chicken bone broth simmered with roasted shallots, served with silky rice noodles, tender poached chicken breast, fresh cilantro, and scallions.',
   15.95, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80',
   true, true, ARRAY['Popular', 'Gluten-Free Option']::text[], 20, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000025', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000003',
   'Phở Đặc Biệt - House Special Rice Noodle Soup',
   'The grand chef specialty bowl featuring rare beef eye of round, well-done flank, soft beef tendon, tripe, and beef meatballs in rich, shimmering 12-hour bone broth.',
   15.95, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular', 'Gluten-Free Option']::text[], 20, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000026', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000003',
   'Phở Sa Tế - Spicy Saté Rare Beef Rice Noodle Soup',
   'Bold and fiery roasted chili, garlic, and peanut saté beef broth with flat rice noodles, rare beef slices, crisp cucumber, and tomato wedges.',
   15.95, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80',
   true, true, ARRAY['Spicy', 'Popular', 'Gluten-Free Option']::text[], 20, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000027', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Thai Cashew Chicken on Steamed Rice (Cơm Gà Xào Hạt Điều)',
   'Tender chicken breast wok-tossed with roasted whole cashew nuts, bell peppers, sweet onions, and carrots in sweet-savory Thai garlic sauce over jasmine rice.',
   18.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, true, ARRAY[]::text[], 20, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000028', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Tiger Shrimp Fried Rice (Cơm Chiên Tôm)',
   'Fragrant jasmine rice wok-fried over high flame with plump tiger shrimp, sweet peas, diced carrots, scrambled eggs, and green scallions.',
   18.95, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
   true, true, ARRAY['Popular', 'Gluten-Free Option']::text[], 20, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000029', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Tender Beef Fried Rice (Cơm Chiên Bò)',
   'Wok-tossed jasmine rice with marinated tender flank beef, golden egg, peas, carrots, and sweet caramelized onions.',
   18.95, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
   true, true, ARRAY['Gluten-Free Option']::text[], 20, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000030', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Classic Chicken Fried Rice (Cơm Chiên Gà)',
   'High-heat wok-fried rice with seasoned chicken breast, farm eggs, garden peas, carrots, and scallions.',
   18.95, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
   true, false, ARRAY['Gluten-Free Option']::text[], 20, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000031', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Tender Beef Fried Rice (Cơm Chiên Bò)',
   'Wok-tossed jasmine rice with marinated tender flank beef, golden egg, peas, carrots, and sweet caramelized onions.',
   18.95, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
   true, false, ARRAY['Gluten-Free Option']::text[], 20, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000032', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Lemongrass Grilled Chicken with Steamed Rice (Cơm Gà Nướng Sả)',
   'Marinated boneless chicken thigh grilled to smoky perfection with fragrant lemongrass and garlic, served over warm jasmine rice with fresh cucumber, tomato, and nuoc cham.',
   17.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, true, ARRAY['Popular', 'Gluten-Free Option']::text[], 20, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000033', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Grilled Pork, Lemongrass Chicken & Fried Egg on Rice (Cơm Heo Gà Trứng Ốp La)',
   'Double-protein feast featuring chargrilled marinated pork cutlet, lemongrass chicken, and a sunny-side-up fried egg over steamed jasmine rice.',
   17.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 20, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000034', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Grilled Pork, Crispy Tofu & Fried Egg on Rice (Cơm Thịt Nướng Đậu Hũ Trứng)',
   'Chargrilled pork steak accompanied by golden crispy tofu and a fried egg over steamed jasmine rice, served with house dipping sauce.',
   17.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000035', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Stir-Fried Chicken & Mixed Vegetables on Rice (Cơm Gà Xào Rau Củ)',
   'Wok-seared chicken breast tossed with fresh broccoli, snow peas, carrots, bok choy, and mushrooms in savory garlic sauce over steamed rice.',
   18.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000036', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Extra Steamed Jasmine Rice or Rice Vermicelli (Cơm Trắng / Bún Thêm)',
   'Generous side portion of freshly steamed fragrant jasmine rice or soft rice vermicelli noodles.',
   2.50, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 5, 10, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000037', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Extra Steamed Jasmine Rice or Rice Vermicelli (Cơm Trắng / Bún Thêm)',
   'Generous side portion of freshly steamed fragrant jasmine rice or soft rice vermicelli noodles.',
   17.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 5, 11, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000038', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Extra Steamed Jasmine Rice or Rice Vermicelli (Cơm Trắng / Bún Thêm)',
   'Generous side portion of freshly steamed fragrant jasmine rice or soft rice vermicelli noodles.',
   18.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 5, 12, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000039', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000004',
   'Tropical Pineapple House Fried Rice (Cơm Chiên Trái Thơm Thập Cẩm)',
   'Sweet and savory fried rice wok-tossed with juicy pineapple chunks, tiger shrimp, chicken, beef, farm egg, and a hint of curry aroma.',
   18.95, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 20, 13, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000040', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000005',
   'Spicy Lemongrass Flank Beef Vermicelli (Bún Bò Xào Sả Ớt)',
   'Tender beef flank wok-sautéed with spicy lemongrass and sweet chili, served over cool rice vermicelli with fresh herbs, pickled daikon, crushed peanuts, and house nuoc cham.',
   18.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Spicy', 'Popular']::text[], 20, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000041', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000005',
   'Spicy Saté Stir-Fried Beef Vermicelli (Bún Bò Sa Tế Cay)',
   'Thinly sliced beef wok-fried in spicy garlic peanut saté sauce over vermicelli with lettuce, cucumber, mint, roasted peanuts, and fried shallots.',
   18.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Spicy']::text[], 20, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000042', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000005',
   'Grilled Pork, Vietnamese Sausage & Spring Roll Vermicelli (Bún Nem Nướng Chả Giò)',
   'Classic vermicelli bowl loaded with lemongrass chargrilled pork, aromatic grilled pork sausage (nem nướng), and a crispy imperial spring roll.',
   17.95, 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 20, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000043', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000005',
   'Grilled Lemongrass Pork & Tiger Shrimp Vermicelli (Bún Thịt Nướng Tôm)',
   'Chargrilled lemongrass pork slices and marinated grilled tiger shrimp skewers over vermicelli with greens and sweet-tangy dressing.',
   17.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 20, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000044', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000005',
   'Grilled Pork, Spring Roll & Sugarcane Shrimp Vermicelli (Bún Chạo Tôm Chả Giò)',
   'Deluxe bowl featuring sweet minced shrimp paste roasted on natural sugar cane, grilled pork, and crispy spring rolls over cool rice vermicelli.',
   17.95, 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 20, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000045', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000005',
   'Hanoi Style Crispy Tofu, Boiled Pork & Pork Sausage Vermicelli (Bún Đậu Chả Cốm)',
   'Traditional Northern Vietnamese vermicelli platter with golden fried tofu cubes, tender sliced pork, and Hanoi green rice pork sausage (chả cốm). Served with house dip and fresh herbs.',
   22.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Chef Special']::text[], 20, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000046', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000005',
   'Grilled Lemongrass Pork & Crispy Spring Roll Vermicelli (Bún Thịt Nướng Chả Giò)',
   'The quintessential Vietnamese bowl: succulent grilled pork slices and a crispy pork spring roll over tender rice noodles with crushed peanuts and nuoc cham.',
   17.95, 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 20, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000047', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000005',
   'Lemongrass Grilled Chicken Vermicelli (Bún Gà Nướng Sả)',
   'Smoky chargrilled lemongrass chicken thigh strips atop soft rice vermicelli noodles, fresh seasonal herbs, shredded cucumber, and pickled carrots.',
   17.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 20, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000048', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000006',
   'Classic Chicken Pad Thai (Phở Xào Kiểu Thái Gà)',
   'Flat rice noodles wok-fried with tender chicken, egg, bean sprouts, and chives in sweet-tangy tamarind sauce, topped with crushed roasted peanuts and fresh lime.',
   19.95, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80',
   true, true, ARRAY['Popular', 'Gluten-Free Option']::text[], 25, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000049', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000006',
   'House Special Stir-Fried Egg Noodles (Mì Xào Thập Cẩm Giòn Hoặc Mềm)',
   'Your choice of crispy bird-nest egg noodles or soft wok-tossed egg noodles crowned with beef flank, chicken, tiger shrimp, and fresh Asian greens in savory reduction.',
   19.95, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000050', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000006',
   'Seafood Stir-Fried Egg Noodles (Mì Xào Hải Sản)',
   'Egg noodles tossed with plump tiger shrimp, tender calamari, scallops, fish cakes, and mixed garden vegetables in rich chef sauce.',
   20.95, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 25, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000051', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000006',
   'Seafood Deluxe Pad Thai (Phở Xào Kiểu Thái Hải Sản)',
   'Wok-seared flat rice noodles with tiger shrimp, calamari, scallops, egg, bean sprouts, and crushed peanuts in house tamarind reduction.',
   20.95, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Gluten-Free Option']::text[], 25, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000052', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000006',
   'Tender Beef Pad Thai (Phở Xào Kiểu Thái Bò)',
   'Stir-fried flat rice noodles with tender flank beef strips, egg, bean sprouts, and roasted peanuts in traditional sweet tamarind glaze.',
   19.95, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80',
   true, false, ARRAY['Gluten-Free Option']::text[], 25, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000053', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000006',
   'House Special Stir-Fried Flat Rice Noodles (Hủ Tiếu Xào Thập Cẩm)',
   'Silky wide rice noodles wok-seared with beef, chicken, tiger shrimp, bok choy, carrots, and sweet onions over blazing wok heat.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular', 'Gluten-Free Option']::text[], 25, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000054', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Whole Crispy Pompano in Sweet & Tangy Tamarind Glaze (Cá Chim Sốt Me)',
   'Whole golden-crisp pompano fish bathed in house-simmered sweet and sour tamarind glaze with garlic, scallions, and chili flakes.',
   21.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 30, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000055', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Wok-Seared Flank Beef with Garden Vegetables (Bò Xào Rau Củ)',
   'Tender beef strips wok-tossed with broccoli, snow peas, carrots, mushrooms, and sweet peppers in savory garlic sauce.',
   19.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 25, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000056', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Sea Scallops Wok-Tossed with Mixed Vegetables (Điệp Xào Rau Củ)',
   'Sweet tender sea scallops quickly seared with colorful market vegetables in a light white wine and garlic reduction.',
   20.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special']::text[], 25, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000057', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Braised Pork Ribs in Tangy Tamarind Sauce (Sườn Heo Sốt Me)',
   'Tender pork ribs braised and glazed in a caramelized sweet and tangy tamarind reduction with garlic and shallots.',
   19.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 25, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000058', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Wok-Tossed Beef & Fresh Broccoli (Bò Xào Bông Cải Xanh)',
   'Thinly sliced flank beef tossed with crisp fresh broccoli florets and sweet onions in a classic ginger garlic brown sauce.',
   19.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 25, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000059', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Sautéed Cashew Chicken with Bell Peppers & Onions (Gà Xào Hạt Điều)',
   'Wok-charred chicken breast strips with roasted cashew nuts, bell peppers, and white onions in aromatic savory sauce.',
   19.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY[]::text[], 25, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000060', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Wok-Tossed Beef & Crisp Snow Peas (Bò Xào Đậu Hà Lan)',
   'Tender beef slices stir-fried with sweet sugar snow peas and sliced carrots in savory garlic reduction.',
   19.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 25, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000061', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Curry Beef Wok with Seasonal Vegetables (Bò Xào Cà Ri)',
   'Aromatic yellow coconut curry wok-tossed with tender beef, sweet onions, bell peppers, and carrots.',
   19.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Spicy']::text[], 25, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000062', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Scallops & Vegetables in Fermented Black Bean Sauce (Điệp Xào Tàu Xì)',
   'Plump sea scallops sautéed with sweet bell peppers and onions in rich savory Cantonese fermented black bean garlic sauce.',
   20.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special']::text[], 25, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000063', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Whole Crispy Pompano in Fresh Tomato Sauce (Cá Chim Chiên Sốt Cà)',
   'Whole fried crispy pompano smothered in slow-cooked fresh Roma tomato, scallion, and black pepper sauce.',
   21.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 30, 10, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000064', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000007',
   'Crispy Pork Ribs in Sweet & Sour Sauce (Sườn Xào Chua Ngọt)',
   'Golden crispy pork riblets glazed in sweet and tangy bell pepper and pineapple sauce.',
   19.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 25, 11, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000065', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Vietnamese Vegetarian Sweet & Sour Soup (Canh Chua Chay Đậu Hũ)',
   'Classic southern Vietnamese tamarind broth with golden fried tofu, pineapple chunks, tomatoes, okra, bean sprouts, and aromatic rice paddy herb (ngò ôm).',
   16.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 20, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000066', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Thai Cashew Tofu & Vegetables on Steamed Rice (Cơm Đậu Hũ Xào Hạt Điều)',
   'Crisp tofu cubes wok-fried with roasted whole cashews, broccoli, carrots, and sweet peppers over steamed jasmine rice.',
   16.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Vegetarian']::text[], 20, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000067', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Coconut Curry Tofu Wok with Vegetables (Đậu Hũ Xào Cà Ri)',
   'Golden fried tofu and seasonal market vegetables simmered in a fragrant coconut milk yellow curry reduction.',
   16.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Spicy']::text[], 20, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000068', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Vegetarian Tofu Fried Rice (Cơm Chiên Chay Đậu Hũ)',
   'Fragrant jasmine rice wok-fried with seasoned tofu cubes, sweet green peas, diced carrots, and scallions (egg optional).',
   16.95, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 20, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000069', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Vegetarian Stir-Fried Egg Noodles with Tofu (Mì Xào Chay Đậu Hũ)',
   'Wok-tossed egg noodles with golden tofu cubes, bok choy, carrots, snow peas, and mushrooms in savory mushroom soy.',
   16.95, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, false, ARRAY['Vegetarian']::text[], 20, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000070', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Crispy Fried Tofu with Creamy Peanut Sauce (Đậu Hũ Chiên Sốt Đậu Phộng)',
   'Golden fried tofu wedges served with a rich, velvety roasted peanut and coconut dip.',
   14.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Vegetarian']::text[], 20, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000071', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Vegetarian Tofu Pad Thai (Phở Xào Chay Kiểu Thái)',
   'Flat rice noodles wok-seared with fried tofu, bean sprouts, chives, and crushed peanuts in tangy tamarind glaze.',
   16.95, 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 20, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000072', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Crispy Vegetarian Spring Rolls (Chả Giò Chay - 2 pcs)',
   'Handmade golden fried rolls stuffed with seasoned shredded taro root, carrots, mung bean, and glass noodles. Served with sweet vegetarian dip.',
   7.25, 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=600&q=80',
   true, true, ARRAY['Vegetarian', 'Popular']::text[], 15, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000073', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Crispy Tofu in Sweet & Spicy Thai Sauce (Đậu Hũ Chiên Sốt Thái)',
   'Bite-sized golden tofu tossed in zesty sweet and spicy Thai chili garlic glaze with cilantro.',
   14.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Spicy']::text[], 20, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000074', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Spicy Lemongrass Crispy Tofu (Đậu Hũ Chiên Sả Ớt)',
   'Golden fried tofu cubes wok-charred with minced fragrant lemongrass, fresh bird’s eye chili, and sea salt.',
   14.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, true, ARRAY['Vegetarian', 'Spicy', 'Popular']::text[], 20, 10, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000075', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Crispy Tofu Vermicelli Salad Bowl (Bún Đậu Hũ Chiên Giòn)',
   'Fresh rice vermicelli bowl crowned with seasoned golden tofu cubes, mint, cucumber, roasted peanuts, and vegetarian nuoc cham.',
   16.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 20, 11, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000076', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Vegetarian Stir-Fried Flat Rice Noodles (Hủ Tiếu Xào Chay)',
   'Soft wide rice noodles wok-charred with golden tofu, bok choy, bean sprouts, and carrots in sweet mushroom soy.',
   15.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 20, 12, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000077', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Wok-Tossed Medley of Garden Vegetables (Rau Củ Thập Cẩm Xào Tỏi)',
   'Colorful array of fresh broccoli, snow peas, bok choy, carrots, baby corn, and mushrooms sautéed in fragrant garlic.',
   16.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 20, 13, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000078', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Thai Style Cashew Tofu Stir-Fry (Đậu Hũ Xào Hạt Điều Kiểu Thái)',
   'Sautéed tofu cubes, roasted cashews, bell peppers, and sweet onions tossed in savory sweet Thai sauce.',
   16.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Vegetarian']::text[], 20, 14, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000079', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000008',
   'Fresh Vegetarian Salad Rolls with Tofu (Gỏi Cuốn Chay - 2 pcs)',
   'Translucent rice paper rolled around fried tofu strips, vermicelli, crisp lettuce, mint, and cucumber. Served with peanut sauce.',
   7.25, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80',
   true, true, ARRAY['Vegetarian', 'Gluten-Free Option', 'Popular']::text[], 15, 15, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000080', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000009',
   'Crispy Chicken Breast in Savory Black Bean Sauce',
   'Breaded tender chicken breast cutlet sliced and smothered in rich fermented black bean, garlic, and bell pepper glaze.',
   18.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY[]::text[], 25, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000081', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000009',
   'Sizzling Tiger Shrimp with Vegetables (Tôm Xào Đĩa Sắt)',
   'Jumbo tiger shrimp sautéed with bell peppers and sweet onions, delivered sizzling hot on a cast-iron skillet with spicy house aroma.',
   25.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Spicy', 'Popular']::text[], 25, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000082', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000009',
   'Crispy Chicken Breast in Special Sweet Chili Thai Sauce',
   'Golden crispy chicken breast glazed in a sweet, sour, and mildly spicy authentic Thai chili sauce.',
   18.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 25, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000083', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000009',
   'Crispy Chicken Breast in Sweet Mango Sauce',
   'Tender crispy fried chicken breast fillet drizzled with fresh tropical mango puree reduction with bell pepper slices.',
   18.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY[]::text[], 25, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000084', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000009',
   'Crispy Chicken Breast in Velvety Satay Peanut Sauce',
   'Crunchy sliced chicken breast served over a bed of steamed greens and coated in warm roasted peanut sauce.',
   18.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY[]::text[], 25, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000085', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000009',
   'Sizzling Sea Scallops & Flank Beef (Bò & Điệp Xào Đĩa Sắt)',
   'Prime sea scallops and tender flank beef tossed with sweet onions and bell peppers, sizzling dramatically on a cast iron platter.',
   25.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Spicy']::text[], 25, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000086', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000009',
   'Caramelized Pompano Fish in Traditional Claypot (Cá Chim Kho Tộ)',
   'Classic southern Vietnamese comfort dish: whole pompano fish caramelized in dark shallot, black pepper, and rich fish sauce glaze in a clay cooking pot.',
   21.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 30, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000087', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000009',
   'Grand Seafood Sizzling Skillet (Hải Sản Thập Cẩm Đĩa Sắt)',
   'Deluxe medley of tiger shrimp, sweet sea scallops, tender squid, and green shell mussels sautéed with seasonal vegetables on a sizzling hot iron plate.',
   25.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000088', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000009',
   'Vietnamese Sweet & Sour Tamarind Soup with Shrimp (Canh Chua Tôm)',
   'Iconic southern Vietnamese broth infused with tamarind, fresh pineapple, ripe tomato, okra, bean sprouts, and sweet tiger shrimp, finished with fresh rice paddy herb.',
   18.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular', 'Gluten-Free Option']::text[], 25, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000089', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Chicken Wok Lunch Special - in Curry Sauce & Vegetables (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared chicken stir-fried with crisp in curry sauce and vegetables in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000090', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Shrimp Wok Lunch Special - Snow peas (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared shrimp stir-fried with crisp snow peas in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000091', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Chicken Wok Lunch Special - Onions & Sweet Pepper (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared chicken stir-fried with crisp onions & sweet pepper in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000092', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Shrimp Wok Lunch Special - Bean Sprout (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared shrimp stir-fried with crisp bean sprout in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000093', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Chicken Wok Lunch Special - Sweet Pepper & Tomato (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared chicken stir-fried with crisp sweet pepper & tomato in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000094', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Shrimp Wok Lunch Special - Vegetables (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared shrimp stir-fried with crisp vegetables in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000095', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Chicken Wok Lunch Special - Special Thai Sauce & Mixed Vegetables (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared chicken stir-fried with crisp special thai sauce and mixed vegetables in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000096', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Chicken Wok Lunch Special - Snow peas (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared chicken stir-fried with crisp snow peas in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000097', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Beef Wok Lunch Special - Snow Peas (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared beef stir-fried with crisp snow peas in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000098', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Beef Wok Lunch Special - Broccoli (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared beef stir-fried with crisp broccoli in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 10, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000099', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Pork Wok Lunch Special - with Onions & Sweet Peppers (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared pork stir-fried with crisp with onions & sweet peppers in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 11, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000100', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Shrimp Wok Lunch Special - Sweet Pepper & Tomato (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared shrimp stir-fried with crisp sweet pepper and tomato in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 12, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000101', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Chicken Wok Lunch Special - Vegetables (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared chicken stir-fried with crisp vegetables in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 13, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000102', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Shrimp Wok Lunch Special - Onions & Sweet pepper (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared shrimp stir-fried with crisp onions & sweet pepper in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 14, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000103', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Chicken Wok Lunch Special - Bean Sprouts (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared chicken stir-fried with crisp bean sprouts in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 15, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000104', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Pork Wok Lunch Special - Vegetables (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared pork stir-fried with crisp vegetables in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 16, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000105', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Beef Wok Lunch Special - Onions & Sweet Pepper (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared beef stir-fried with crisp onions & sweet pepper in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 17, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000106', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Shrimp Wok Lunch Special - Broccoli (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared shrimp stir-fried with crisp broccoli in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 18, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000107', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Beef Wok Lunch Special - Sweet Pepper & Tomato (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared beef stir-fried with crisp sweet pepper & tomato in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 19, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000108', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Chicken Wok Lunch Special - Broccoli (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared chicken stir-fried with crisp broccoli in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 20, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000109', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000010',
   'Beef Wok Lunch Special - Vegetables (with Steamed Rice)',
   'Quick, savory lunch special featuring tender wok-seared beef stir-fried with crisp vegetables in house garlic sauce. Served with steamed jasmine rice.',
   19.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY['Lunch Special']::text[], 20, 21, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000110', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Beef Sauté - Snow Peas (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared beef tossed with crisp snow peas in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000111', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Beef Sauté - Broccoli (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared beef tossed with crisp broccoli in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000112', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Shrimp Sauté - Broccoli (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared shrimp tossed with crisp broccoli in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000113', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Beef Sauté - Curry Sauce (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared beef tossed with crisp curry sauce in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000114', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Chicken Sauté - Snow Peas (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared chicken tossed with crisp snow peas in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000115', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Imperial Family Dinner Combo Feast (For 4-6 Persons)',
   'Grand multi-course feast including Vietnamese spring rolls, choice of family soup, house special fried rice, wok-tossed beef with broccoli, and lemongrass chicken.',
   26.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 35, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000116', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Chicken Sauté - Cashew   Thai Sauce (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared chicken tossed with crisp cashew   thai sauce in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000117', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Beef Sauté - Sweet Pepper & Tomato (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared beef tossed with crisp sweet pepper & tomato in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000118', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Beef Sauté - Vegetable (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared beef tossed with crisp vegetable in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000119', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Pork Sauté - Sweet Pepper & Tomato (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared pork tossed with crisp sweet pepper & tomato in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 10, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000120', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Beef Sauté - Bean Sprout (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared beef tossed with crisp bean sprout in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 11, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000121', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Shrimp Sauté - Vegetable (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared shrimp tossed with crisp vegetable in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 12, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000122', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Beef Sauté - Sate   Onions (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared beef tossed with crisp sate   onions in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 13, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000123', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Shrimp Sauté - Snow Peas (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared shrimp tossed with crisp snow peas in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 14, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000124', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Chicken Sauté - Broccoli (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared chicken tossed with crisp broccoli in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 15, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000125', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Chicken Sauté - Honey Garlic (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared chicken tossed with crisp honey garlic in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 16, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000126', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Pork Sauté - Broccoli (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared pork tossed with crisp broccoli in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 17, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000127', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Pork Sauté - Bean Sprout (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared pork tossed with crisp bean sprout in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 18, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000128', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Chicken Sauté - Bean Sprout (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared chicken tossed with crisp bean sprout in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 19, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000129', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Shrimp Sauté - Bean Sprout (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared shrimp tossed with crisp bean sprout in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 20, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000130', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Scallop Sauté - Black Bean Sauce (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared scallop tossed with crisp black bean sauce in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 21, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000131', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000011',
   'Family Sized Pork Sauté - Vegetable (Serves 2-3)',
   'Generous family-sized sharing portion of wok-seared pork tossed with crisp vegetable in aromatic chef glaze. Perfect for sharing with family.',
   24.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY['Family Size']::text[], 25, 22, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000132', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000012',
   'Southern Crispy Vietnamese Crepe (Bánh Xèo Miền Tây)',
   'Crisp golden turmeric crepe filled with tender BBQ pork, sweet shrimp, mung beans, and fresh bean sprouts. Served with fresh green leaf lettuce, herbs, and house nuoc cham.',
   16.95, 'https://images.unsplash.com/photo-1555126634-323283e090fa?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000133', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000012',
   'Hà Nội Grilled Pork & Meatball Vermicelli (Bún Chả Hà Nội)',
   'Iconic Northern Vietnamese specialty: chargrilled marinated pork patties and sliced pork belly swimming in warm, sweet-tangy dipping broth, served with cool vermicelli and fresh herbs.',
   22.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000134', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000012',
   'Hải Phòng Crispy Turmeric Fish Noodle Soup (Bún Cá Hải Phòng)',
   'Coastal specialty from Hải Phòng featuring crispy fried turmeric fish fillets, fish cakes, fresh dill, tomatoes, and rice noodles in fragrant tangy broth.',
   19.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000135', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000012',
   'Northern Platter with Fried Tofu & Pork Sausage (Bún Đậu Chả Cốm)',
   'Festive Hanoi street platter of golden fried tofu, boiled pork, and fried young green rice pork sausage (chả cốm) over rice vermicelli with fresh perilla and cucumber.',
   22.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Chef Special']::text[], 25, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000136', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000012',
   'Traditional Pork Offal & Blood Sausage Congee (Cháo Lòng Dồi)',
   'Silky slow-cooked rice porridge simmered with rich pork bone broth, tender sliced pork liver, tongue, heart, and artisanal herbal blood sausage. Topped with fresh scallions and ginger.',
   22.00, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Chef Special']::text[], 25, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000137', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000013',
   'Party Catering Tray: Stir-Fried Egg Noodles (Khay Mì Xào Tiệc - Feeds 6-8)',
   'Large celebratory aluminum party tray of wok-seared egg noodles tossed with chicken, BBQ pork, cabbage, carrots, and sweet onions. Feeds 6 to 8 guests.',
   75.00, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY['Party Tray', 'Popular']::text[], 45, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000138', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000013',
   'Party Catering Tray: Fresh Salad Rolls (Khay Gỏi Cuốn - 18 pcs)',
   'Platter of 18 freshly wrapped rice paper salad rolls with shrimp, pork, fresh mint, and rice vermicelli. Includes large containers of peanut sauce. Feeds 6 to 8.',
   70.00, 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?w=600&q=80',
   true, true, ARRAY['Party Tray', 'Popular']::text[], 45, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000139', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000013',
   'Party Catering Tray: Savoury Sticky Rice (Khay Xôi Mặn Thập Cẩm - Feeds 6-8)',
   'Steamed glutinous sticky rice topped with sliced lap cheong (Chinese sausage), seasoned shredded pork floss, dried shrimp, and fragrant scallion oil. Feeds 6 to 8.',
   70.00, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, true, ARRAY['Party Tray', 'Popular']::text[], 45, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000140', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000013',
   'Party Catering Tray: Crispy Fried Garlic Chicken Wings (Khay Cánh Gà Chiên - Feeds 6-8)',
   'Generous party platter of approximately 30 golden crispy garlic wings seasoned with five-spice and served with sweet chili sauce.',
   80.00, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, true, ARRAY['Party Tray', 'Popular']::text[], 45, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000141', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000013',
   'Party Catering Tray: Breaded Crispy Wings (Khay Cánh Gà Lăn Bột - Feeds 6-8)',
   'Panko-crusted crispy chicken wings fried to a golden crunch, accompanied by dipping sauces for large gatherings.',
   80.00, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, true, ARRAY['Party Tray', 'Popular']::text[], 45, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000142', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000013',
   'Party Catering Tray: Special Yang Chow Fried Rice (Khay Cơm Chiên Dương Châu - Feeds 6-8)',
   'Heaping party tray of golden fried jasmine rice with chicken, BBQ char siu pork, sweet shrimp, farm egg, and vegetables. Feeds 6 to 8.',
   75.00, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
   true, true, ARRAY['Party Tray', 'Popular']::text[], 45, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000143', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000013',
   'Party Catering Tray: Five-Spice Roasted Quails (Khay Cút Rô Ti - Feeds 6-8)',
   'Platter of whole roasted quails marinated in Vietnamese five-spice, garlic, and honey, roasted until golden brown. Served with salt, pepper, and lime wedges.',
   80.00, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Party Tray']::text[], 45, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000144', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000013',
   'Party Catering Tray: Crispy Imperial Spring Rolls (Khay Chả Giò Chiên - 25 pcs)',
   'Party platter of 25 golden crispy pork and taro spring rolls with fresh lettuce cups and large bottle of house nuoc cham.',
   70.00, 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=600&q=80',
   true, true, ARRAY['Party Tray', 'Popular']::text[], 45, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000145', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000013',
   'Party Catering Tray: Tiger Shrimp in Rich Salted Egg Yolk Sauce (Khay Tôm Sốt Trứng Muối)',
   'Celebration platter of crispy jumbo tiger shrimp coated in a velvety, rich, savory-sweet salted duck egg yolk butter sauce. Feeds 6 to 8.',
   75.00, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular', 'Party Tray']::text[], 45, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000146', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000013',
   'Party Catering Tray: Lotus Stem Salad with Shrimp & Pork (Khay Gỏi Ngó Sen Tôm Thịt)',
   'Traditional banquet salad of crunchy pickled lotus stems, carrots, mint, and cilantro topped with poached tiger shrimp and crunchy pork ear slices in sweet-sour dressing.',
   75.00, 'https://images.unsplash.com/photo-1547592180-85f173990554?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Gluten-Free Option', 'Party Tray']::text[], 45, 10, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000147', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Japanese Yaki Udon - Stir-Fried Seafood Udon Noodles',
   'Thick chewy Japanese udon noodles wok-fried with seafood, shredded cabbage, carrots, and sweet onions in sweet-savory savory yakisoba reduction.',
   18.95, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 20, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000148', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Thai Green Coconut Curry with Chicken or Seafood',
   'Creamy green coconut curry soup infused with sweet basil, kaffir lime, bamboo shoots, and green chilies.',
   8.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY['Spicy']::text[], 20, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000149', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Tom Kha Gai - Thai Coconut Chicken Soup',
   'Comforting Thai soup crafted with velvety coconut milk, aromatic galangal root, lemongrass, mushrooms, and tender chicken.',
   8.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY['Gluten-Free Option']::text[], 20, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000150', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Spicy Thai Basil Fried Rice',
   'Jasmine rice wok-fried over roaring flame with Thai holy basil, red chili, eggs, and sweet peppers.',
   18.95, 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&q=80',
   true, false, ARRAY['Spicy']::text[], 20, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000151', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Thai Stir Fried Beef with Cashew and Mixed Vegetables',
   'Popular pan-Asian specialty prepared with authentic spices and fresh local ingredients.',
   21.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000152', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Thai Curry Soup Chicken or Seafood',
   'Popular pan-Asian specialty prepared with authentic spices and fresh local ingredients.',
   8.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000153', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Fried Shrimp with Stir Fried Egg in Thai Sauce',
   'Popular pan-Asian specialty prepared with authentic spices and fresh local ingredients.',
   17.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000154', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Japanese Yaki Udon - Stir-Fried Beef Udon Noodles',
   'Thick chewy Japanese udon noodles wok-fried with beef, shredded cabbage, carrots, and sweet onions in sweet-savory savory yakisoba reduction.',
   18.95, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 20, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000155', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Thai Red Coconut Curry with Chicken or Seafood',
   'Rich red curry broth with coconut milk, bamboo shoots, bell peppers, and fresh Thai basil leaves.',
   8.95, 'https://images.unsplash.com/photo-1562967914-608f82629710?w=600&q=80',
   true, false, ARRAY['Spicy']::text[], 20, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000156', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Thai Stir Fried Chicken with Cashew, Mixed Vegetable & Steamed Rice',
   'Popular pan-Asian specialty prepared with authentic spices and fresh local ingredients.',
   18.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 10, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000157', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Thai Stir Fried Seafood with Assorted Vegetables',
   'Popular pan-Asian specialty prepared with authentic spices and fresh local ingredients.',
   17.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 11, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000158', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Thai Stir Fried Beef with Cashew and Canned Pineapple',
   'Popular pan-Asian specialty prepared with authentic spices and fresh local ingredients.',
   17.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 12, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000159', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Japanese Yaki Udon - Stir-Fried Chicken Udon Noodles',
   'Thick chewy Japanese udon noodles wok-fried with chicken, shredded cabbage, carrots, and sweet onions in sweet-savory savory yakisoba reduction.',
   18.95, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 20, 13, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000160', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000014',
   'Thai Stir Fried Seafood with Eggplant and Vegetables',
   'Popular pan-Asian specialty prepared with authentic spices and fresh local ingredients.',
   17.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 20, 14, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000161', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Freshly Squeezed Orange Juice with Ice (Cam Vắt)',
   '100% pure freshly squeezed orange juice served chilled over ice with a light touch of cane sugar.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 5, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000162', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Fresh Young Coconut Juice with Tender Coconut Flesh (Nước Dừa Tươi)',
   'Sweet and refreshing chilled coconut water poured over tender slices of young coconut meat.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 5, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000163', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Sparkling Fresh Lime Soda (Soda Chanh Đường Đá)',
   'Fizzy club soda muddled with fresh lime juice and pure cane sugar over crushed ice.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 5, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000164', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Fresh Coconut Real Fruit Milkshake (Sinh Tố Coconut)',
   'Rich, creamy fruit smoothie blended with real coconut, milk, and crushed ice.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Popular', 'Vegetarian']::text[], 5, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000165', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Fresh Strawberry Real Fruit Milkshake (Sinh Tố Strawberry)',
   'Rich, creamy fruit smoothie blended with real strawberry, milk, and crushed ice.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Popular', 'Vegetarian']::text[], 5, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000166', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Fresh Squeezed Lemon Juice with Ice',
   'Refreshing chilled beverage served cold to pair perfectly with spicy and savory Vietnamese cuisine.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, false, ARRAY[]::text[], 5, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000167', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Vietnamese Iced Black Coffee (Cà Phê Đen Đá)',
   'Robust dark-roasted Vietnamese slow-drip coffee served chilled over ice with cane sugar.',
   6.95, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 5, 7, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000168', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Signature Bubble Tea with Tapioca Pearls',
   'Chilled sweetened milk tea shaken over ice with chewy brown sugar tapioca boba pearls.',
   7.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Popular', 'Vegetarian']::text[], 5, 8, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000169', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Vietnamese Iced Coffee with Condensed Milk (Cà Phê Sữa Đá)',
   'Traditional dark roast Vietnamese drip coffee blended with sweet condensed milk and poured over crushed ice. Bold, rich, and energizing.',
   6.95, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
   true, true, ARRAY['Popular', 'Vegetarian']::text[], 5, 9, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000170', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Vietnamese Hot Drip Coffee with Condensed Milk (Cà Phê Sữa Nóng)',
   'Rich, slow-dripped Vietnamese dark coffee layered over creamy condensed milk.',
   6.95, 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&q=80',
   true, false, ARRAY['Vegetarian']::text[], 5, 10, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000171', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Cold Bottle of Spring Water',
   'Refreshing chilled beverage served cold to pair perfectly with spicy and savory Vietnamese cuisine.',
   2.50, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 5, 11, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000172', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Fresh Pineapple Real Fruit Milkshake (Sinh Tố Pineapple)',
   'Rich, creamy fruit smoothie blended with real pineapple, milk, and crushed ice.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Popular', 'Vegetarian']::text[], 5, 12, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000173', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Fresh Mango Real Fruit Milkshake (Sinh Tố Mango)',
   'Rich, creamy fruit smoothie blended with real mango, milk, and crushed ice.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Popular', 'Vegetarian']::text[], 5, 13, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000174', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Soft Drink (Coke, Diet Coke, Ginger Ale, Nestea, Sprite)',
   'Refreshing chilled beverage served cold to pair perfectly with spicy and savory Vietnamese cuisine.',
   2.50, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, false, ARRAY[]::text[], 5, 14, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000175', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Fresh Young Coconut Juice with Tender Coconut Flesh (Nước Dừa Tươi)',
   'Sweet and refreshing chilled coconut water poured over tender slices of young coconut meat.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, false, ARRAY['Vegetarian', 'Gluten-Free Option']::text[], 5, 15, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000176', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000015',
   'Fresh Avocado Real Fruit Milkshake (Sinh Tố Avocado)',
   'Rich, creamy fruit smoothie blended with real avocado, milk, and crushed ice.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Popular', 'Vegetarian']::text[], 5, 16, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000177', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000016',
   'Vanilla Ice Cream (Kem)',
   'Two scoops of premium chilled ice cream garnished with toasted wafer.',
   6.95, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80',
   true, false, ARRAY['Vegetarian']::text[], 10, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000178', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000016',
   'Warm Sweet Purple Rice with Coconut Cream (Chè Nếp Than)',
   'Traditional slow-simmered purple glutinous rice pudding served warm with fragrant coconut cream.',
   6.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, true, ARRAY['Popular', 'Gluten-Free Option', 'Vegetarian']::text[], 10, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000179', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000016',
   'Sweet Mango Sticky Rice (Xôi Xoài Nước Cốt Dừa)',
   'Sweetened coconut sticky rice topped with ripe sweet mango slices and toasted sesame seeds.',
   6.95, 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular', 'Vegetarian']::text[], 10, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000180', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000016',
   'Mango Ice Cream (Kem)',
   'Two scoops of premium chilled ice cream garnished with toasted wafer.',
   6.95, 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?w=600&q=80',
   true, false, ARRAY['Vegetarian']::text[], 10, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000181', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000017',
   'Grilled Pork, Grilled Vietnamese Sausage & Spring Roll with Thin Vermicelli (Bánh Hỏi)',
   'Delicate fine woven rice vermicelli bundles brushed with scallion oil, served with grilled pork, grilled vietnamese sausage & spring roll , fresh herbs, rice paper sheets, and house dip.',
   23.95, 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000182', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000017',
   'Imperial Special Thin Vermicelli Feast (Bánh Hỏi Thập Cẩm Đặc Biệt)',
   'The ultimate banquet platter: delicate woven rice vermicelli sheets (bánh hỏi) dressed in scallion oil and crushed peanuts, served with chargrilled pork, grilled shrimp, nem nướng sausage, sugarcane shrimp, crispy spring rolls, fresh rice paper wraps, and nuoc cham.',
   25.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000183', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000017',
   'Grilled Pork, Minced Shirmp on Sugar Cane with Thin Vermicelli (Bánh Hỏi)',
   'Delicate fine woven rice vermicelli bundles brushed with scallion oil, served with grilled pork, minced shirmp on sugar cane , fresh herbs, rice paper sheets, and house dip.',
   23.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000184', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000017',
   'Grilled Pork, Grilled Shrimp & Spring Roll with Thin Vermicelli (Bánh Hỏi)',
   'Delicate fine woven rice vermicelli bundles brushed with scallion oil, served with grilled pork, grilled shrimp & spring roll , fresh herbs, rice paper sheets, and house dip.',
   23.95, 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000185', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000017',
   'Grilled Pork, Minced Shirmp on Sugar Cane & Grilled Shrimp with Thin Vermicelli (Bánh Hỏi)',
   'Delicate fine woven rice vermicelli bundles brushed with scallion oil, served with grilled pork, minced shirmp on sugar cane & grilled shrimp , fresh herbs, rice paper sheets, and house dip.',
   23.95, 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 25, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000186', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000018',
   'Bubble Tea  Selection',
   'Handcrafted beverage prepared fresh to order with your choice of sweetness and ice levels.',
   7.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, false, ARRAY[]::text[], 5, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000187', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000018',
   'Fresh Milk Selection',
   'Handcrafted beverage prepared fresh to order with your choice of sweetness and ice levels.',
   7.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, false, ARRAY[]::text[], 5, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000188', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000018',
   'Fresh Tea Selection',
   'Handcrafted beverage prepared fresh to order with your choice of sweetness and ice levels.',
   7.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, false, ARRAY[]::text[], 5, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000189', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000018',
   'Milkshake Selection',
   'Handcrafted beverage prepared fresh to order with your choice of sweetness and ice levels.',
   6.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, false, ARRAY[]::text[], 5, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000190', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000019',
   'Passionfruit Tea',
   'Invigorating tropical passionfruit brewed with aromatic iced tea or fizzy soda and fresh mint.',
   7.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 5, 1, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000191', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000019',
   'Brown Sugar Matcha Milk',
   'Premium Japanese green tea matcha whisked with fresh whole milk and caramelized brown sugar drizzle.',
   7.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 5, 2, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000192', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000019',
   'Kumquat Soda',
   'Refreshing citrus iced tea infused with preserved salted kumquats and sweet golden plums.',
   7.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 5, 3, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000193', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000019',
   'Rich Durian & Avocado Smoothie (Sinh Tố Bơ Sầu Riêng)',
   'Decadent creamy smoothie blended with fresh ripe avocado and aromatic Monthong durian fruit.',
   9.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Chef Special', 'Popular']::text[], 5, 4, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000194', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000019',
   'Kumquat Plum Tea',
   'Refreshing citrus iced tea infused with preserved salted kumquats and sweet golden plums.',
   7.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 5, 5, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000195', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000019',
   'Passionfruit Soda',
   'Invigorating tropical passionfruit brewed with aromatic iced tea or fizzy soda and fresh mint.',
   7.95, 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 5, 6, NOW(), NOW()),

  ('17e30000-0004-4000-8000-000000000196', '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', 'ca700000-0004-4000-8000-000000000019',
   'Brown Sugar Fresh Milk',
   'Chilled seasonal fruit beverage crafted for refreshing summer enjoyment.',
   7.95, 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80',
   true, true, ARRAY['Popular']::text[], 5, 7, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        price = EXCLUDED.price,
        image_url = EXCLUDED.image_url,
        is_available = EXCLUDED.is_available,
        is_featured = EXCLUDED.is_featured,
        dietary_tags = EXCLUDED.dietary_tags,
        prep_time_minutes = EXCLUDED.prep_time_minutes,
        sort_order = EXCLUDED.sort_order,
        updated_at = NOW();
    `);

    await client.query('COMMIT');
    console.log('Transaction COMMITTED successfully.');

    // Verification
    const sfCount = await client.query('SELECT count(*) FROM chef_storefronts');
    const miCount = await client.query('SELECT count(*) FROM menu_items');
    const catCount = await client.query('SELECT count(*) FROM menu_categories');
    console.log('Verification:');
    console.log('- chef_storefronts:', sfCount.rows[0].count);
    console.log('- menu_categories:', catCount.rows[0].count);
    console.log('- menu_items:', miCount.rows[0].count);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to seed Little Saigon:', err);
    throw err;
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
