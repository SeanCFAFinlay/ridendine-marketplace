import pg from 'pg';
import { createClient } from '@supabase/supabase-js';

// We can test using Supabase client if NEXT_PUBLIC_SUPABASE_URL and ANON_KEY are present,
// or directly against GoTrue auth in PostgreSQL!
const connectionString = process.env.DATABASE_URL;
const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();

console.log('Connected to database.');

// 1. Verify user exists in auth.users
const userRes = await client.query(`
  SELECT id, email, encrypted_password, email_confirmed_at, raw_user_meta_data
  FROM auth.users
  WHERE email IN ('roy@cooco.app', 'ryo@cooco.app')
`);
console.log('Found auth.users:');
for (const u of userRes.rows) {
  console.log(`- ID: ${u.id}, Email: ${u.email}, Confirmed: ${u.email_confirmed_at !== null}`);
}

// 2. Verify password match with crypt()
const checkPassword = await client.query(`
  SELECT email, (encrypted_password = crypt('ride1234', encrypted_password)) AS password_matches
  FROM auth.users
  WHERE email IN ('roy@cooco.app', 'ryo@cooco.app')
`);
console.log('\nPassword verification for ride1234:');
for (const p of checkPassword.rows) {
  console.log(`- ${p.email}: ${p.password_matches ? 'VALID (ride1234 matches)' : 'INVALID'}`);
}

// 3. Verify kitchen_staff link to Ba Muoi Kitchen
const staffRes = await client.query(`
  SELECT ks.id, ks.name, ks.role, ks.is_active, ks.storefront_id, cs.name AS storefront_name, cs.slug
  FROM kitchen_staff ks
  JOIN chef_storefronts cs ON cs.id = ks.storefront_id
  WHERE ks.user_id IN (
    SELECT id FROM auth.users WHERE email IN ('roy@cooco.app', 'ryo@cooco.app')
  )
`);
console.log('\nKitchen staff association:');
for (const s of staffRes.rows) {
  console.log(`- Staff: ${s.name} (${s.role}), Storefront: ${s.storefront_name} (${s.slug}), Active: ${s.is_active}`);
}

await client.end();
