#!/usr/bin/env node
// Walks apps/*/src/app/api/**/route.ts and fails if any state-changing
// handler (POST/PATCH/DELETE/PUT) doesn't call an approved guard.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Node 20-compatible replacement for fs.glob (added in Node 22).
function* walkRouteFiles(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkRouteFiles(full);
    } else if (entry.isFile() && entry.name === 'route.ts') {
      yield full;
    }
  }
}

function* findApiRoutes() {
  for (const app of readdirSync('apps', { withFileTypes: true })) {
    if (!app.isDirectory()) continue;
    yield* walkRouteFiles(join('apps', app.name, 'src', 'app', 'api'));
  }
}

const APPROVED_GUARDS = [
  'guardPlatformApi',
  'getCustomerActorContext',
  'getChefActorContext',
  'getOperatorKitchenContext',
  'getDriverActorContext',
  'validateEngineProcessorHeaders',
  'verifyStripeWebhook',
  'getCurrentCustomer',
  'auth.getUser',
  // Partner API routes authenticate via API key + request signature.
  'resolvePartnerContext',
];

const STATEFUL_METHODS = ['POST', 'PATCH', 'DELETE', 'PUT'];

const PUBLIC_ALLOWLIST = [
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/logout',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/api/webhooks/stripe',
  '/api/stripe/webhook',
];

let failed = false;
let scanned = 0;
let allowlisted = 0;
let unguarded = 0;

for (const file of findApiRoutes()) {
  scanned++;
  const normalized = file.replace(/\\/g, '/');
  if (PUBLIC_ALLOWLIST.some(p => normalized.includes(p))) {
    allowlisted++;
    continue;
  }
  const src = readFileSync(file, 'utf8');
  const hasStateful = STATEFUL_METHODS.some(
    m =>
      new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(src) ||
      new RegExp(`export\\s+const\\s+${m}\\s*=`).test(src)
  );
  if (!hasStateful) continue;
  const hasGuard = APPROVED_GUARDS.some(g => src.includes(g));
  if (!hasGuard) {
    console.error(`UNGUARDED: ${file}`);
    failed = true;
    unguarded++;
  }
}

console.log(`Scanned ${scanned} routes, allowlisted ${allowlisted}, unguarded ${unguarded}.`);
if (failed) {
  console.error('\nUnguarded state-changing routes found. Add a guard call (one of the APPROVED_GUARDS) to the first ~25 lines of the route file.');
  process.exit(1);
}
console.log('All state-changing routes have an approved guard.');
