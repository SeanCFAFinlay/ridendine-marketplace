import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const { Client } = pg;
const rawUrl = process.env.DATABASE_URL || '';
if (!rawUrl) {
  console.error('Missing DATABASE_URL environment variable');
  process.exit(1);
}

// Ensure password with special chars like '#' is properly encoded if needed
let connectionString = rawUrl;
try {
  new URL(connectionString);
} catch {
  // If parsing fails due to unencoded '#' in password
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

    // 1. Chef Profile (Bếp Bà Muối)
    console.log('Seeding chef_profiles...');
    await client.query(`
      INSERT INTO chef_profiles (id, user_id, display_name, phone, bio, status, created_at, updated_at)
      VALUES (
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        '224c456f-e10b-48bc-b6bd-ec47b234c862',
        'Bếp Bà Muối (Ba Muoi Kitchen)',
        '+1 (289) 556-4905',
        'Homemade Vietnamese catering in Hamilton — fresh, slow-cooked, and made to order. Specializing in traditional noodle soups, broken rice plates, vegetarian delicacies, party trays, and sweet chè.',
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
        'aa000000-0003-4000-8000-000000000003',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'Bếp Bà Muối Kitchen',
        'Pick up near Eastgate Square, Queenston Rd',
        'Hamilton',
        'ON',
        'L8G 2B4',
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
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'cccccccc-cccc-cccc-cccc-cccccccccccc',
        'aa000000-0003-4000-8000-000000000003',
        'bep-ba-muoi',
        'Bếp Bà Muối',
        'Homemade Vietnamese catering in Hamilton — fresh, slow-cooked, and made to order. Authentic family recipes from traditional noodle soups and broken rice plates to vegetarian specialties, party trays, and sweet chè desserts.',
        ARRAY['Vietnamese', 'Home Cooking', 'Catering', 'Noodles', 'Party Trays'],
        '/chefs/bep-ba-muoi/cover.png',
        '/chefs/bep-ba-muoi/avatar.png',
        true, true,
        25, 45,
        20.00,
        4.9, 42,
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

    // 4. Chef Availability (every day 10:00 - 21:00)
    console.log('Seeding chef_availability...');
    await client.query(`
      INSERT INTO chef_availability (storefront_id, day_of_week, start_time, end_time, is_available)
      VALUES
        ('ffffffff-ffff-ffff-ffff-ffffffffffff', 0, '10:00:00', '21:00:00', true),
        ('ffffffff-ffff-ffff-ffff-ffffffffffff', 1, '10:00:00', '21:00:00', true),
        ('ffffffff-ffff-ffff-ffff-ffffffffffff', 2, '10:00:00', '21:00:00', true),
        ('ffffffff-ffff-ffff-ffff-ffffffffffff', 3, '10:00:00', '21:00:00', true),
        ('ffffffff-ffff-ffff-ffff-ffffffffffff', 4, '10:00:00', '21:00:00', true),
        ('ffffffff-ffff-ffff-ffff-ffffffffffff', 5, '10:00:00', '21:00:00', true),
        ('ffffffff-ffff-ffff-ffff-ffffffffffff', 6, '10:00:00', '21:00:00', true)
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
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'Hamilton Eastgate Delivery Zone',
        25.0,
        5.00,
        60.00
      )
      ON CONFLICT DO NOTHING;
    `);

    // 6. Menu Categories (4 categories)
    console.log('Seeding menu_categories...');
    await client.query(`
      INSERT INTO menu_categories (id, storefront_id, name, description, sort_order, is_active, created_at, updated_at)
      VALUES
        ('ca700000-0003-4000-8000-000000000001', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Main Dishes — Rice & Noodles', 'Authentic Vietnamese slow-cooked noodle soups and hearty broken-rice plates (4 servings)', 1, true, NOW(), NOW()),
        ('ca700000-0003-4000-8000-000000000002', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Vegetarian', 'Plant-based authentic Vietnamese dishes, fresh tofu and braised vegetable specialties', 2, true, NOW(), NOW()),
        ('ca700000-0003-4000-8000-000000000003', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Bánh Mì, Sticky Rice & Party Trays', 'Party trays, savoury sticky rice, and specialty platters for family gatherings', 3, true, NOW(), NOW()),
        ('ca700000-0003-4000-8000-000000000004', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 'Desserts & Sweet Soups', 'Traditional Vietnamese chè sweet soups and homemade desserts', 4, true, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        sort_order = EXCLUDED.sort_order,
        is_active = EXCLUDED.is_active,
        updated_at = NOW();
    `);

    // 7. Menu Items (55 dishes)
    console.log('Seeding 55 menu_items...');
    const seedPath = path.resolve(process.cwd(), 'supabase/seeds/seed.sql');
    const seedContent = fs.readFileSync(seedPath, 'utf8');
    const lines = seedContent.split('\n');
    const startIdx = lines.findIndex((l) => l.includes('-- Bếp Bà Muối (Ba Muoi Kitchen) — 55 authentic Vietnamese dishes'));
    const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes('ON CONFLICT'));
    if (startIdx === -1 || endIdx === -1) {
      throw new Error('Could not find Bếp Bà Muối dishes block in seed.sql');
    }
    const menuItemsSql = lines.slice(startIdx + 1, endIdx).join('\n').trim();
    
    await client.query(`
      INSERT INTO menu_items (
        id, storefront_id, category_id, name, description,
        price, image_url, is_available, is_featured,
        dietary_tags, prep_time_minutes, sort_order,
        created_at, updated_at
      )
      VALUES
      ${menuItemsSql}
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
    console.error('Failed to seed remote DB:', err);
    throw err;
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
