import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace(/##/g, '%23%23'),
});

async function main() {
  console.log('Linking kitchen staff to user IDs...');
  
  // 1. Update Tuan's kitchen_staff row with his user_id
  await pool.query(`
    UPDATE kitchen_staff 
    SET user_id = '3d52854e-622f-4b35-be1a-fd5d817277fa', updated_at = NOW()
    WHERE storefront_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' AND name = 'Tuan Hoang'
  `);

  // 2. Ensure Sean Finlay has a kitchen_staff record for Bep Ba Muoi kitchen
  const seanStaff = await pool.query(`
    SELECT id FROM kitchen_staff 
    WHERE storefront_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff' AND user_id = '224c456f-e10b-48bc-b6bd-ec47b234c862'
  `);

  if (seanStaff.rows.length === 0) {
    await pool.query(`
      INSERT INTO kitchen_staff (id, storefront_id, kitchen_id, user_id, name, role, hourly_rate, is_active, created_at, updated_at)
      VALUES (
        gen_random_uuid(),
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        'aa000000-0003-4000-8000-000000000003',
        '224c456f-e10b-48bc-b6bd-ec47b234c862',
        'Sean Finlay',
        'Kitchen Operator',
        0.00,
        true,
        NOW(),
        NOW()
      )
    `);
    console.log('Inserted Sean Finlay into kitchen_staff');
  }

  const staff = await pool.query('SELECT id, name, role, user_id, storefront_id, kitchen_id, is_active FROM kitchen_staff WHERE storefront_id = $1', ['ffffffff-ffff-ffff-ffff-ffffffffffff']);
  console.log('Updated kitchen_staff:', staff.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
