#!/usr/bin/env node

import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const requireFromDbPackage = createRequire(
  resolve(process.cwd(), 'packages/db/package.json')
);
const { createClient } = requireFromDbPackage('@supabase/supabase-js');

const args = parseArgs(process.argv.slice(2));
loadEnvFile('.env');
loadEnvFile('.env.local');

const email = getRequiredArg(args, 'email').toLowerCase();
const name = args.name || 'RideNDine Super Admin';
const password = args.password || process.env.BOOTSTRAP_SUPER_ADMIN_PASSWORD;
const sendInvite = Boolean(args['send-invite']);
const shouldApply = Boolean(args.apply);
const redirectTo = args['redirect-to'] || process.env.NEXT_PUBLIC_SITE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!shouldApply) {
  console.log(`Dry run: would bootstrap ${email} as super_admin.`);
  console.log('Add --apply to create/update the auth user and platform_users row.');
  process.exit(0);
}

if (!supabaseUrl || !serviceRoleKey) {
  exitWithError(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Load the production env first.'
  );
}

if (!password && !sendInvite) {
  exitWithError(
    'Provide --password, BOOTSTRAP_SUPER_ADMIN_PASSWORD, or --send-invite.'
  );
}

if (password && password.length < 8) {
  exitWithError('Password must be at least 8 characters.');
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const user = await ensureAuthUser();
await ensurePlatformUser(user.id);

console.log(`Super admin ready: ${email}`);
console.log(`Auth user id: ${user.id}`);
console.log('Role: super_admin');
console.log('Password was not printed. Store or rotate it from Supabase Auth.');

async function ensureAuthUser() {
  const existing = await findUserByEmail(email);
  if (existing) {
    const update = {
      email_confirm: true,
      user_metadata: {
        ...(existing.user_metadata || {}),
        name,
        role: 'super_admin',
      },
      app_metadata: {
        ...(existing.app_metadata || {}),
        role: 'super_admin',
      },
    };

    if (password) {
      update.password = password;
    }

    const { data, error } = await admin.auth.admin.updateUserById(existing.id, update);
    if (error) exitWithError(error.message);
    return data.user;
  }

  if (sendInvite) {
    const options = {
      data: { name, role: 'super_admin' },
    };
    if (redirectTo) {
      options.redirectTo = redirectTo;
    }

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, options);
    if (error) exitWithError(error.message);
    return data.user;
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role: 'super_admin' },
    app_metadata: { role: 'super_admin' },
  });

  if (error) exitWithError(error.message);
  return data.user;
}

async function ensurePlatformUser(userId) {
  const timestamp = new Date().toISOString();
  const { error } = await admin.from('platform_users').upsert(
    {
      user_id: userId,
      email,
      name,
      role: 'super_admin',
      is_active: true,
      updated_at: timestamp,
    },
    { onConflict: 'user_id' }
  );

  if (error) exitWithError(error.message);
}

async function findUserByEmail(targetEmail) {
  let page = 1;

  while (page < 100) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 100,
    });

    if (error) exitWithError(error.message);

    const found = data.users.find((user) => user.email?.toLowerCase() === targetEmail);
    if (found) {
      return found;
    }

    if (data.users.length < 100) {
      return null;
    }

    page += 1;
  }

  exitWithError('Could not scan all auth users. Narrow the bootstrap manually.');
}

function parseArgs(rawArgs) {
  const parsed = {};

  for (let i = 0; i < rawArgs.length; i += 1) {
    const arg = rawArgs[i];
    if (!arg.startsWith('--')) {
      continue;
    }

    const key = arg.slice(2);
    const next = rawArgs[i + 1];
    if (!next || next.startsWith('--')) {
      parsed[key] = true;
      continue;
    }

    parsed[key] = next;
    i += 1;
  }

  return parsed;
}

function getRequiredArg(parsed, key) {
  const value = parsed[key];
  if (typeof value !== 'string' || !value.trim()) {
    exitWithError(`Missing required argument --${key}`);
  }
  return value.trim();
}

function loadEnvFile(fileName) {
  const path = resolve(process.cwd(), fileName);
  if (!existsSync(path)) {
    return;
  }

  const contents = readFileSync(path, 'utf8');
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) {
      continue;
    }

    const [, key, rawValue] = match;
    if (process.env[key] !== undefined) {
      continue;
    }

    process.env[key] = rawValue.replace(/^['"]|['"]$/g, '');
  }
}

function exitWithError(message) {
  console.error(`Bootstrap failed: ${message}`);
  process.exit(1);
}
