import pg from 'pg';

const rawUrl = process.env.DATABASE_URL || '';
if (!rawUrl) {
  console.warn('DATABASE_URL not set; skipping ensure-partner-platform-accounts.');
  process.exit(0);
}

const pool = new pg.Pool({
  connectionString: rawUrl.replace(/##/g, '%23%23'),
});

async function main() {
  console.log('Ensuring platform_accounts for verified partner chefs...');
  const partners = [
    { id: 'ffffffff-ffff-ffff-ffff-ffffffffffff', name: 'Bếp Bà Muối (Ba Muoi Kitchen)' },
    { id: '4a4a4a4a-4a4a-4a4a-8a4a-4a4a4a4a4a4a', name: 'Little Saigon Restaurant' },
  ];

  for (const p of partners) {
    const res = await pool.query(
      'SELECT * FROM platform_accounts WHERE owner_id = $1',
      [p.id]
    );
    if (res.rows.length === 0) {
      await pool.query(
        `INSERT INTO platform_accounts (account_type, owner_id, balance_cents, pending_payout_cents, lifetime_earned_cents, currency)
         VALUES ('chef_payable', $1, 0, 0, 0, 'CAD')
         ON CONFLICT (account_type, owner_id) DO NOTHING`,
        [p.id]
      );
      console.log(`Inserted default 0-balance row for ${p.name}.`);
    } else {
      console.log(`Platform account already exists for ${p.name}.`);
    }
  }
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
