#!/usr/bin/env node

/**
 * scripts/purge-demo-data.mjs
 *
 * Removes all demo and fake data from the database to prepare for live production:
 * - Orders, order items, deliveries, deliveries tracking, status history, order exceptions
 * - Carts, cart items
 * - Reviews, support tickets, system alerts, notifications, test ledger entries, audit logs
 * - Test drivers, shifts, driver presence, locations, documents, vehicles
 * - Test customers, customer addresses, favorites, loyalty data, promo code usages
 * - Demo storefronts, kitchens, chef profiles, menu items, categories
 * - Demo operational logs (domain_events, ops_override_logs, admin_notes, storefront_state_changes)
 * - Demo auth users (preserving real admin / team emails)
 * - Platform users (preserving sean@ridendine.ca and ops@ridendine.ca)
 *
 * Preserves:
 * - platform_settings (platform fees, delivery radius, operational SLA configs)
 * - Real admin & owner accounts in auth.users and platform_users
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const requireFromDb = createRequire(path.resolve(process.cwd(), 'packages/db/package.json'));
const { Client } = requireFromDb('pg');

const envPath = path.resolve(process.cwd(), '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('Missing .env.local in repo root.');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const match = envContent.match(/DATABASE_URL=([^\r\n]+)/);
if (!match) {
  console.error('DATABASE_URL not found in .env.local');
  process.exit(1);
}

const rawUrl = match[1].trim().replace(/^['"]|['"]$/g, '');
const parts = rawUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/(.+)/);
if (!parts) {
  console.error('Failed to parse DATABASE_URL');
  process.exit(1);
}

const clientConfig = {
  user: parts[1],
  password: parts[2],
  host: parts[3],
  port: parseInt(parts[4], 10),
  database: parts[5],
  ssl: { rejectUnauthorized: false },
};

const PRESERVED_EMAILS = [
  'sean@ridendine.ca',
  'ops@ridendine.ca',
  'superadmin@ridendine.ca',
  'sean@seanfinlay.ca',
  'phinlay@icloud.com',
  'sean@cashflowarmy.com',
  'tuanhoang905@icloud.com',
];

const PRESERVED_EMAILS_LOWER = PRESERVED_EMAILS.map((e) => e.toLowerCase());

// Tables to wipe completely via TRUNCATE CASCADE
const TABLES_TO_TRUNCATE = [
  // 1. Orders & Tracking
  'orders',
  'order_items',
  'order_item_modifiers',
  'order_status_history',
  'order_pack_checks',
  'order_exceptions',
  'kitchen_tickets',
  'kitchen_ticket_items',
  'kitchen_queue_entries',
  'deliveries',
  'delivery_assignments',
  'delivery_tracking_events',
  'refund_cases',
  'payout_adjustments',
  'checkout_idempotency_keys',
  'stripe_events_processed',
  'referral_signups',
  'referral_codes',
  'reviews',

  // 2. Carts
  'cart_items',
  'carts',

  // 3. Driver data
  'driver_shifts',
  'driver_presence',
  'driver_locations',
  'driver_earnings',
  'driver_payouts',
  'driver_payout_accounts',
  'driver_documents',
  'driver_notification_preferences',
  'driver_vehicles',
  'instant_payout_requests',
  'drivers',

  // 4. Customer data
  'customer_addresses',
  'favorites',
  'loyalty_transactions',
  'loyalty_accounts',
  'promo_code_usages',
  'promo_codes',
  'customers',

  // 5. Storefront & Menu data
  'menu_item_availability',
  'menu_item_option_values',
  'menu_item_options',
  'menu_items',
  'menu_categories',
  'chef_payouts',
  'chef_documents',
  'chef_storefronts',
  'chef_kitchens',
  'chef_profiles',
  'payout_runs',

  // 6. System & operational logs/tickets/events
  'support_tickets',
  'system_alerts',
  'notifications',
  'audit_logs',
  'ledger_entries',
  'domain_events',
  'ops_override_logs',
  'admin_notes',
  'storefront_state_changes',
  'push_subscriptions',
];

async function getSnapshot(client) {
  const counts = {};
  for (const table of TABLES_TO_TRUNCATE) {
    try {
      const res = await client.query(`SELECT count(*) FROM ${table}`);
      counts[table] = parseInt(res.rows[0].count, 10);
    } catch {
      // table might not exist
    }
  }

  try {
    const authRes = await client.query('SELECT count(*) FROM auth.users');
    counts['auth.users'] = parseInt(authRes.rows[0].count, 10);
  } catch {
    counts['auth.users'] = 'N/A';
  }

  try {
    const pUsersRes = await client.query('SELECT count(*) FROM platform_users');
    counts['platform_users'] = parseInt(pUsersRes.rows[0].count, 10);
  } catch {
    counts['platform_users'] = 'N/A';
  }

  return counts;
}

async function purge(apply = false) {
  const client = new Client(clientConfig);
  try {
    await client.connect();
    console.log(`=== RideNDine Demo Data Purge (${apply ? 'APPLY' : 'DRY RUN'}) ===\n`);

    console.log('--- Current Counts (Before) ---');
    const before = await getSnapshot(client);
    console.table(before);

    if (!apply) {
      console.log('\n[DRY RUN COMPLETE] No records were deleted. Run with --apply to execute.');
      return;
    }

    console.log('\nBeginning atomic purge transaction...');
    await client.query('BEGIN');

    // 1. Truncate demo tables in public schema with CASCADE
    const existingTablesRes = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    const existingTableNames = new Set(existingTablesRes.rows.map((r) => r.table_name));
    const validTruncateTables = TABLES_TO_TRUNCATE.filter((t) => existingTableNames.has(t));

    console.log(`Truncating ${validTruncateTables.length} tables with CASCADE...`);
    await client.query(`TRUNCATE TABLE ${validTruncateTables.join(', ')} CASCADE`);
    console.log('All public data tables truncated successfully.');

    // 2. Repoint platform_settings.updated_by to preserved Sean super_admin ID
    const seanRes = await client.query(
      `SELECT id FROM auth.users WHERE LOWER(email) = 'sean@ridendine.ca' LIMIT 1`
    );
    if (seanRes.rows.length > 0) {
      const seanId = seanRes.rows[0].id;
      await client.query(`UPDATE platform_settings SET updated_by = $1`, [seanId]);
      console.log(`Updated platform_settings.updated_by to ${seanId} (sean@ridendine.ca)`);
    }

    // 3. Clean platform_users (preserve Sean and Ops admin)
    const emailPlaceholders = PRESERVED_EMAILS_LOWER.map((_, i) => `$${i + 1}`).join(', ');
    const pUserDel = await client.query(
      `DELETE FROM platform_users WHERE LOWER(email) NOT IN (${emailPlaceholders})`,
      PRESERVED_EMAILS_LOWER
    );
    console.log(`Purged platform_users: ${pUserDel.rowCount ?? 0} test rows deleted.`);

    // 4. Clean auth.users (delete fake/demo users)
    const authDel = await client.query(
      `DELETE FROM auth.users WHERE LOWER(email) NOT IN (${emailPlaceholders})`,
      PRESERVED_EMAILS_LOWER
    );
    console.log(`Purged auth.users: ${authDel.rowCount ?? 0} demo users deleted.`);

    await client.query('COMMIT');
    console.log('\nTransaction committed successfully!');

    console.log('\n--- Final Counts (After) ---');
    const after = await getSnapshot(client);
    console.table(after);

    console.log('\n--- Preserved Platform Users ---');
    const finalPUsers = await client.query('SELECT id, email, role, is_active FROM platform_users');
    console.table(finalPUsers.rows);

    console.log('\n--- Preserved Auth Users ---');
    const finalAUsers = await client.query('SELECT id, email, created_at FROM auth.users');
    console.table(finalAUsers.rows);

    console.log('\n[SUCCESS] All fake and demo data removed. Platform is clean for live operation.');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
      console.error('Transaction rolled back due to error.');
    } catch {
      // rollback error ignore
    }
    console.error('Purge failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

const applyFlag = process.argv.includes('--apply');
purge(applyFlag);
