import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const client = new pg.Client({ connectionString, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log('Connected to database.');

try {
  await client.query('BEGIN');

  // Insert or update roy@cooco.app
  console.log('Seeding roy@cooco.app...');
  await client.query(`
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      invited_at, confirmation_token, confirmation_sent_at, recovery_token,
      recovery_sent_at, email_change_token_new, email_change, email_change_sent_at,
      last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
      created_at, updated_at, phone, phone_confirmed_at, phone_change,
      phone_change_token, phone_change_sent_at, email_change_token_current,
      email_change_confirm_status, banned_until, reauthentication_token,
      reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous
    ) VALUES (
      '33333333-3333-4333-8333-333333333331',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'roy@cooco.app',
      crypt('ride1234', gen_salt('bf')),
      NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NOW(),
      '{"provider":"email","providers":["email"],"role":"chef"}',
      '{"display_name":"Ryo","role":"chef"}',
      false, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false
    )
    ON CONFLICT (id) DO UPDATE SET
      email = 'roy@cooco.app',
      encrypted_password = crypt('ride1234', gen_salt('bf')),
      raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"chef"}',
      raw_user_meta_data = '{"display_name":"Ryo","role":"chef"}',
      updated_at = NOW();
  `);

  // Insert or update ryo@cooco.app (alias for spelling safeguard)
  console.log('Seeding ryo@cooco.app...');
  await client.query(`
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
      invited_at, confirmation_token, confirmation_sent_at, recovery_token,
      recovery_sent_at, email_change_token_new, email_change, email_change_sent_at,
      last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin,
      created_at, updated_at, phone, phone_confirmed_at, phone_change,
      phone_change_token, phone_change_sent_at, email_change_token_current,
      email_change_confirm_status, banned_until, reauthentication_token,
      reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous
    ) VALUES (
      '33333333-3333-4333-8333-333333333332',
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      'ryo@cooco.app',
      crypt('ride1234', gen_salt('bf')),
      NOW(), NULL, '', NULL, '', NULL, '', '', NULL, NOW(),
      '{"provider":"email","providers":["email"],"role":"chef"}',
      '{"display_name":"Ryo","role":"chef"}',
      false, NOW(), NOW(), NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false
    )
    ON CONFLICT (id) DO UPDATE SET
      email = 'ryo@cooco.app',
      encrypted_password = crypt('ride1234', gen_salt('bf')),
      raw_app_meta_data = '{"provider":"email","providers":["email"],"role":"chef"}',
      raw_user_meta_data = '{"display_name":"Ryo","role":"chef"}',
      updated_at = NOW();
  `);

  // Set identities
  await client.query(`
    INSERT INTO auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    VALUES
      ('33333333-3333-4333-8333-333333333331', 'roy@cooco.app', '33333333-3333-4333-8333-333333333331',
       jsonb_build_object('sub', '33333333-3333-4333-8333-333333333331', 'email', 'roy@cooco.app', 'email_verified', true),
       'email', NOW(), NOW(), NOW()),
      ('33333333-3333-4333-8333-333333333332', 'ryo@cooco.app', '33333333-3333-4333-8333-333333333332',
       jsonb_build_object('sub', '33333333-3333-4333-8333-333333333332', 'email', 'ryo@cooco.app', 'email_verified', true),
       'email', NOW(), NOW(), NOW())
    ON CONFLICT (provider, provider_id) DO NOTHING;
  `);

  // Link both to kitchen_staff for Ba Muoi Kitchen (ffffffff-ffff-ffff-ffff-ffffffffffff)
  console.log('Seeding kitchen_staff for Ba Muoi Kitchen...');
  await client.query(`
    INSERT INTO kitchen_staff (
      id, storefront_id, user_id, name, role, is_active, kitchen_id, created_at, updated_at
    ) VALUES
      (
        'c3b5b0f3-c06b-45b3-9f8c-fc78f8fc7be5',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        '33333333-3333-4333-8333-333333333331',
        'Ryo',
        'Chef & Kitchen Operator',
        true,
        'aa000000-0003-4000-8000-000000000003',
        NOW(),
        NOW()
      ),
      (
        'c3b5b0f3-c06b-45b3-9f8c-fc78f8fc7be6',
        'ffffffff-ffff-ffff-ffff-ffffffffffff',
        '33333333-3333-4333-8333-333333333332',
        'Ryo',
        'Chef & Kitchen Operator',
        true,
        'aa000000-0003-4000-8000-000000000003',
        NOW(),
        NOW()
      )
    ON CONFLICT (id) DO UPDATE SET
      name = 'Ryo',
      role = 'Chef & Kitchen Operator',
      is_active = true,
      updated_at = NOW();
  `);

  await client.query('COMMIT');
  console.log('Successfully provisioned Ryo (roy@cooco.app & ryo@cooco.app) for Ba Muoi Kitchen!');
} catch (err) {
  await client.query('ROLLBACK');
  console.error('Failed to seed Ryo user:', err);
  process.exit(1);
} finally {
  await client.end();
}
