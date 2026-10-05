#!/usr/bin/env node
/**
 * MIGRATION IMMUTABILITY GATE
 *
 * Migrations in supabase/migrations/ are forward-only and are applied to
 * production by hand. Editing one in place has already caused a production
 * incident once (see commit a6c72f6c) — the file changes, but the database
 * that already ran the old version does not, so environments silently diverge
 * and the schema history stops being a history.
 *
 * Nothing prevented a repeat. This gate does: it records a SHA-256 of every
 * migration in supabase/migrations/.checksums.json and fails if a previously
 * recorded file changed or disappeared.
 *
 *   pnpm audit:migrations            verify (CI)
 *   pnpm audit:migrations --update   re-record after ADDING a new migration
 *
 * Adding a migration is expected and requires `--update` plus committing the
 * manifest, exactly like `pnpm db:generate`. Changing an existing one is not.
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const manifestPath = path.join(migrationsDir, '.checksums.json');

const update = process.argv.includes('--update');

function sha256(file) {
  // Normalise line endings so a Windows checkout and a Linux CI runner agree.
  const raw = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
  return createHash('sha256').update(raw).digest('hex');
}

function currentChecksums() {
  if (!existsSync(migrationsDir)) return {};
  const out = {};
  for (const name of readdirSync(migrationsDir).sort()) {
    if (!name.endsWith('.sql')) continue;
    out[name] = sha256(path.join(migrationsDir, name));
  }
  return out;
}

const current = currentChecksums();

if (update) {
  writeFileSync(manifestPath, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
  console.log(
    `Recorded ${Object.keys(current).length} migration checksums in supabase/migrations/.checksums.json`
  );
  console.log('Commit this file alongside the migration.');
  process.exit(0);
}

if (!existsSync(manifestPath)) {
  console.error('No supabase/migrations/.checksums.json found.');
  console.error('Create it with:  pnpm audit:migrations --update');
  process.exit(1);
}

const recorded = JSON.parse(readFileSync(manifestPath, 'utf8'));

const modified = [];
const deleted = [];
const added = [];

for (const [name, hash] of Object.entries(recorded)) {
  if (!(name in current)) {
    deleted.push(name);
  } else if (current[name] !== hash) {
    modified.push(name);
  }
}
for (const name of Object.keys(current)) {
  if (!(name in recorded)) added.push(name);
}

let failed = false;

if (modified.length > 0) {
  failed = true;
  console.error('\nAPPLIED MIGRATIONS WERE EDITED IN PLACE:');
  for (const n of modified) console.error(`  - ${n}`);
  console.error(
    '\nMigrations are forward-only. An environment that already ran the old\n' +
      'version will never see this change, so environments silently diverge.\n' +
      'Revert the edit and write a NEW migration instead.\n' +
      'If the change is genuinely safe (a comment, or the file was never applied\n' +
      'anywhere), re-record with: pnpm audit:migrations --update'
  );
}

if (deleted.length > 0) {
  failed = true;
  console.error('\nMIGRATIONS WERE DELETED:');
  for (const n of deleted) console.error(`  - ${n}`);
  console.error(
    '\nDeleting a migration rewrites schema history and breaks any environment\n' +
      'rebuilt from scratch. Restore it, or re-record if it was never applied.'
  );
}

if (added.length > 0) {
  failed = true;
  console.error('\nNEW MIGRATIONS ARE NOT YET RECORDED:');
  for (const n of added) console.error(`  - ${n}`);
  console.error('\nRun:  pnpm audit:migrations --update   and commit the manifest.');
}

if (failed) process.exit(1);

console.log(
  `Migration immutability OK — ${Object.keys(current).length} migrations unchanged since they were recorded.`
);
