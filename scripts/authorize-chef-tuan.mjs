import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace(/##/g, '%23%23'),
});

async function main() {
  console.log('=== AUTHORIZING CHEF TUAN HOANG FOR KITCHEN & STOREFRONT ===');
  const tuanId = '3d52854e-622f-4b35-be1a-fd5d817277fa';
  const chefProfileId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  const kitchenId = 'aa000000-0003-4000-8000-000000000003';
  const storefrontId = 'ffffffff-ffff-ffff-ffff-ffffffffffff';

  // 1. Confirm Tuấn's email and elevate role to chef
  const userUpdate = await pool.query(`
    UPDATE auth.users
    SET 
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      raw_user_meta_data = jsonb_set(
        jsonb_set(
          jsonb_set(raw_user_meta_data, '{role}', '"chef"'),
          '{email_verified}', 'true'
        ),
        '{phone_verified}', 'true'
      ),
      raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"chef"'),
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, email, confirmed_at, raw_user_meta_data, raw_app_meta_data
  `, [tuanId]);
  console.log('1. Updated auth user:', userUpdate.rows[0]);

  // 2. Link chef profile for Bếp Bà Muối to Tuấn Hoàng
  const profileUpdate = await pool.query(`
    UPDATE chef_profiles
    SET 
      user_id = $1,
      status = 'approved',
      updated_at = NOW()
    WHERE id = $2
    RETURNING id, user_id, display_name, status
  `, [tuanId, chefProfileId]);
  console.log('2. Linked chef_profiles:', profileUpdate.rows[0]);

  // 3. Ensure kitchen_staff has active Head Chef entry for Tuấn
  const staffCheck = await pool.query(`
    SELECT * FROM kitchen_staff WHERE kitchen_id = $1 AND name ILIKE '%Tuan%'
  `, [kitchenId]);
  if (staffCheck.rows.length === 0) {
    const newStaff = await pool.query(`
      INSERT INTO kitchen_staff (kitchen_id, storefront_id, name, role, is_active)
      VALUES ($1, $2, 'Tuan Hoang', 'Head Chef', true)
      RETURNING *
    `, [kitchenId, storefrontId]);
    console.log('3. Added kitchen staff:', newStaff.rows[0]);
  } else {
    console.log('3. Kitchen staff already exists:', staffCheck.rows[0]);
  }

  // 4. Verify chef_storefronts is active and open
  const sfUpdate = await pool.query(`
    UPDATE chef_storefronts
    SET 
      is_active = true,
      is_paused = false,
      service_state = 'open',
      storefront_state = 'published',
      updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, is_active, is_paused, service_state
  `, [storefrontId]);
  console.log('4. Storefront status:', sfUpdate.rows[0]);

  // 5. Verify chef_kitchens is verified
  const kitchenUpdate = await pool.query(`
    UPDATE chef_kitchens
    SET is_verified = true, updated_at = NOW()
    WHERE id = $1
    RETURNING id, name, is_verified
  `, [kitchenId]);
  console.log('5. Kitchen verified:', kitchenUpdate.rows[0]);

  console.log('=== CHEF TUAN HOANG FULLY AUTHORIZED FOR KITCHEN ===');
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
