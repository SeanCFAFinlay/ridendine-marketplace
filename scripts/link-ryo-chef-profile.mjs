import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

console.log('Connected to database.');

try {
  await client.query('BEGIN');

  // 1. Get user IDs for ryo@cooco.app and roy@cooco.app
  const ryoUser = await client.query("SELECT id FROM auth.users WHERE email = 'ryo@cooco.app'");
  const royUser = await client.query("SELECT id FROM auth.users WHERE email = 'roy@cooco.app'");

  const ryoId = ryoUser.rows[0]?.id;
  const royId = royUser.rows[0]?.id;
  console.log(`ryo@cooco.app id: ${ryoId}`);
  console.log(`roy@cooco.app id: ${royId}`);

  // 2. Set chef_profiles.user_id for Bếp Bà Muối (cccccccc-cccc-cccc-cccc-cccccccccccc) to ryoId
  if (ryoId) {
    await client.query(`
      UPDATE chef_profiles
      SET user_id = $1, updated_at = NOW()
      WHERE id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    `, [ryoId]);
    console.log(`Updated chef_profiles 'cccccccc-cccc-cccc-cccc-cccccccccccc' user_id to ${ryoId}`);
  }

  // 3. Ensure both ryoId and royId are in kitchen_staff for Ba Muoi Kitchen
  if (ryoId) {
    await client.query(`
      INSERT INTO kitchen_staff (id, storefront_id, user_id, name, role, is_active, kitchen_id, created_at, updated_at)
      VALUES (
        'c3b5b0f3-c06b-45b3-9f8c-fc78f8fc7be6',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        $1,
        'Ryo',
        'Head Chef & Kitchen Operator',
        true,
        'aa000000-0003-4000-8000-000000000003',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        role = EXCLUDED.role,
        is_active = true,
        updated_at = NOW()
    `, [ryoId]);
  }

  if (royId) {
    await client.query(`
      INSERT INTO kitchen_staff (id, storefront_id, user_id, name, role, is_active, kitchen_id, created_at, updated_at)
      VALUES (
        'c3b5b0f3-c06b-45b3-9f8c-fc78f8fc7be5',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        $1,
        'Ryo',
        'Head Chef & Kitchen Operator',
        true,
        'aa000000-0003-4000-8000-000000000003',
        NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        role = EXCLUDED.role,
        is_active = true,
        updated_at = NOW()
    `, [royId]);
  }

  // Also ensure Tuan is preserved in kitchen_staff
  await client.query(`
    INSERT INTO kitchen_staff (id, storefront_id, user_id, name, role, is_active, kitchen_id, created_at, updated_at)
    VALUES (
      'c3b5b0f3-c06b-45b3-9f8c-fc78f8fc7be4',
      'ffffffff-ffff-ffff-ffff-ffffffffffff',
      '3d52854e-622f-4b35-be1a-fd5d817277fa',
      'Tuan Hoang',
      'Chef',
      true,
      'aa000000-0003-4000-8000-000000000003',
      NOW(), NOW()
    )
    ON CONFLICT (id) DO NOTHING
  `);

  await client.query('COMMIT');
  console.log('Transaction committed successfully.');

  // Verification query
  const verify = await client.query(`
    SELECT cp.id, cp.display_name, cp.user_id, u.email
    FROM chef_profiles cp
    JOIN auth.users u ON u.id = cp.user_id
    WHERE cp.id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  `);
  console.log('Ba Muoi Kitchen profile is now directly owned by:', verify.rows[0]);

} catch (err) {
  await client.query('ROLLBACK');
  console.error('Error linking ryo chef profile:', err);
} finally {
  await client.end();
}
