import pg from 'pg';


const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL.replace(/##/g, '%23%23'),
});

async function main() {
  console.log('Ensuring platform_accounts for partner Bếp Bà Muối...');
  const res = await pool.query(
    'SELECT * FROM platform_accounts WHERE owner_id = $1',
    ['ffffffff-ffff-ffff-ffff-ffffffffffff']
  );
  console.log('Existing platform accounts:', res.rows);
  if (res.rows.length === 0) {
    await pool.query(
      `INSERT INTO platform_accounts (account_type, owner_id, balance_cents, pending_payout_cents, lifetime_earned_cents, currency)
       VALUES ('chef_payable', 'ffffffff-ffff-ffff-ffff-ffffffffffff', 0, 0, 0, 'CAD')
       ON CONFLICT (account_type, owner_id) DO NOTHING`
    );
    console.log('Inserted default 0-balance row for Bếp Bà Muối.');
  }
  await pool.end();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
