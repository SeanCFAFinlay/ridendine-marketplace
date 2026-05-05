#!/usr/bin/env node
// Walks apps/*/src/app/api/**/route.ts and fails if any state-changing
// handler (POST/PATCH/DELETE/PUT) doesn't call an approved guard.

import { readFileSync } from 'node:fs';
import { glob } from 'node:fs/promises';

const APPROVED_GUARDS = [
  'guardPlatformApi',
  'getCustomerActorContext',
  'getChefActorContext',
  'getDriverActorContext',
  'validateEngineProcessorHeaders',
  'verifyStripeWebhook',
  'getCurrentCustomer',
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
  // command-center now lives exclusively in apps/ops-admin
  'apps/ops-admin/src/app/api/internal/command-center',
];

let failed = false;
let scanned = 0;
let allowlisted = 0;
let unguarded = 0;

for await (const file of glob('apps/*/src/app/api/**/route.ts')) {
  scanned++;
  const normalized = file.replace(/\\/g, '/');
  if (PUBLIC_ALLOWLIST.some(p => normalized.includes(p))) {
    allowlisted++;
    continue;
  }
  const src = readFileSync(file, 'utf8');
  const hasStateful = STATEFUL_METHODS.some(m =>
    new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(src)
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
