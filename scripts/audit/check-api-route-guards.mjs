#!/usr/bin/env node
// Walks apps/*/src/app/api/**/route.ts and fails if any handler is missing an
// approved guard.
//
// Originally this checked only state-changing methods (POST/PATCH/PUT/DELETE),
// which left every GET — i.e. every read endpoint — entirely outside the gate.
// Reads leak data just as writes corrupt it, so GET is now checked too, against
// an explicit allowlist of surfaces that are deliberately public.
//
// Known limitation, stated honestly: this is a text-presence check. It proves a
// guard name appears in the file, NOT that it runs before the handler's work,
// nor that it is the correct guard for that resource. It is a backstop against
// forgetting entirely, not a proof of correct authorization.

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
const READ_METHODS = ['GET', 'HEAD'];

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

/**
 * Read-only surfaces that are intentionally reachable without a session.
 * Anonymous storefront browsing IS the product, and these are protected by RLS
 * on the browser path. Every entry needs a reason — adding one is a security
 * decision, not a way to silence the gate.
 */
const PUBLIC_READ_ALLOWLIST = [
  { path: '/api/storefronts', why: 'anonymous marketplace discovery' },
];

function isPublicRead(normalized) {
  return PUBLIC_READ_ALLOWLIST.some((entry) => normalized.includes(entry.path));
}

let failed = false;
let scanned = 0;
let allowlisted = 0;
let unguarded = 0;
let publicReads = 0;

for (const file of findApiRoutes()) {
  scanned++;
  const normalized = file.replace(/\\/g, '/');
  if (PUBLIC_ALLOWLIST.some(p => normalized.includes(p))) {
    allowlisted++;
    continue;
  }
  const src = readFileSync(file, 'utf8');

  const exportsMethod = (m) =>
    new RegExp(`export\\s+(async\\s+)?function\\s+${m}\\b`).test(src) ||
    new RegExp(`export\\s+const\\s+${m}\\s*=`).test(src);

  const hasStateful = STATEFUL_METHODS.some(exportsMethod);
  const hasRead = READ_METHODS.some(exportsMethod);
  if (!hasStateful && !hasRead) continue;

  const hasGuard = APPROVED_GUARDS.some((g) => src.includes(g));
  if (hasGuard) continue;

  // A read-only route may be deliberately public; a state-changing one may not.
  if (!hasStateful && hasRead && isPublicRead(normalized)) {
    publicReads++;
    continue;
  }

  const kind = hasStateful ? 'UNGUARDED (state-changing)' : 'UNGUARDED (read)';
  console.error(`${kind}: ${file}`);
  failed = true;
  unguarded++;
}

console.log(
  `Scanned ${scanned} routes, allowlisted ${allowlisted}, public reads ${publicReads}, unguarded ${unguarded}.`
);
if (failed) {
  console.error('\nUnguarded state-changing routes found. Add a guard call (one of the APPROVED_GUARDS) to the first ~25 lines of the route file.');
  process.exit(1);
}
console.log('All read and state-changing routes have an approved guard or an explicit public exemption.');
