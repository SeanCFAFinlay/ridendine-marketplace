import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace(/##/g, '%23%23'),
});

async function main() {
  console.log('=== AUDITING CHEF KITCHEN & AUTHORIZATION ===');
  const profileRes = await pool.query('SELECT * FROM chef_profiles WHERE id = $1', ['cccccccc-cccc-cccc-cccc-cccccccccccc']);
  console.log('Chef profile:', profileRes.rows[0]);

  const storefrontRes = await pool.query('SELECT * FROM chef_storefronts WHERE id = $1', ['ffffffff-ffff-ffff-ffff-ffffffffffff']);
  console.log('Storefront:', storefrontRes.rows[0]);

  const chefKitchens = await pool.query('SELECT * FROM chef_kitchens WHERE chef_id = $1', ['cccccccc-cccc-cccc-cccc-cccccccccccc']);
  console.log('Chef kitchens:', chefKitchens.rows);

  const allTables = await pool.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name LIKE '%kitchen%'
  `);
  console.log('Kitchen tables:', allTables.rows.map(r => r.table_name));

  const authUser = await pool.query('SELECT id, email, role, confirmed_at, banned_until FROM auth.users WHERE id = $1', [profileRes.rows[0]?.user_id]);
  console.log('Auth user:', authUser.rows[0]);

  // Check all users in auth.users
  const allUsers = await pool.query('SELECT id, email FROM auth.users');
  console.log('All auth users:', allUsers.rows);

  const tuanChef = await pool.query('SELECT * FROM chef_profiles WHERE user_id = $1', ['3d52854e-622f-4b35-be1a-fd5d817277fa']);
  console.log('Chef profile for tuanhoang:', tuanChef.rows);

  const tuanUser = await pool.query('SELECT id, email, confirmed_at, email_confirmed_at, raw_user_meta_data, raw_app_meta_data FROM auth.users WHERE email = $1', ['tuanhoang905@icloud.com']);
  console.log('Tuan user details:', tuanUser.rows[0]);

  const seanUser = await pool.query('SELECT id, email, raw_user_meta_data, raw_app_meta_data FROM auth.users WHERE email = $1', ['sean@ridendine.ca']);
  console.log('Sean user details:', seanUser.rows[0]);

  const cust = await pool.query('SELECT * FROM customers WHERE id = $1', ['3d52854e-622f-4b35-be1a-fd5d817277fa']);
  console.log('Customer for tuan:', cust.rows);

  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
