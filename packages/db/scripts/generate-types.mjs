/**
 * Safe Supabase type generation: never truncates database.types.ts on failure.
 * Order: --local (Docker) then --db-url from DATABASE_URL (e.g. from .env.local).
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');
const outFile = join(__dirname, '..', 'src', 'generated', 'database.types.ts');

function loadDatabaseUrlFromFile(name) {
  const p = join(repoRoot, name);
  if (!existsSync(p)) return false;
  const text = readFileSync(p, 'utf8');
  for (const line of text.split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (key !== 'DATABASE_URL') continue;
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env.DATABASE_URL = v;
    return true;
  }
  return false;
}

function loadDatabaseUrlFromEnvFiles() {
  if (process.env.DATABASE_URL) return;
  loadDatabaseUrlFromFile('.env.local') || loadDatabaseUrlFromFile('.env');
}

function runSupabase(args) {
  const r = spawnSync('supabase', ['gen', 'types', 'typescript', ...args], {
    cwd: repoRoot,
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
  });
  if (r.error) throw r.error;
  if (r.status !== 0) {
    const err = new Error(r.stderr || `supabase exited ${r.status}`);
    err.stderr = r.stderr;
    err.stdout = r.stdout;
    throw err;
  }
  return r.stdout || '';
}

loadDatabaseUrlFromEnvFiles();

/** Encode password when URL contains `postgresql://postgres:...@` and password has unescaped `:` etc. */
function encodeSupabasePostgresPassword(url) {
  const m = String(url).match(/^(postgresql:\/\/)postgres:([^@]+)(@.+)$/i);
  if (!m) return url;
  return `${m[1]}postgres:${encodeURIComponent(m[2])}${m[3]}`;
}

let types = '';
let source = '';

try {
  types = runSupabase(['--local']);
  source = '--local';
} catch (e1) {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    console.error(
      'db:generate: --local failed (Docker / supabase start?).\n' +
        'No DATABASE_URL in environment, .env.local, or .env — add DATABASE_URL (Postgres URI from Supabase Dashboard → Settings → Database).\n' +
        'If the password contains `:`, `@`, or `#`, use percent-encoding or rely on this script’s retry with encoded password.\n' +
        'Original error:',
      e1.message || e1
    );
    process.exit(1);
  }
  const candidates = [rawUrl, encodeSupabasePostgresPassword(rawUrl)].filter(
    (u, i, a) => a.indexOf(u) === i
  );
  let lastErr;
  for (const dbUrl of candidates) {
    try {
      types = runSupabase(['--db-url', dbUrl]);
      source = '--db-url';
      lastErr = null;
      break;
    } catch (e2) {
      lastErr = e2;
    }
  }
  if (!types) {
    console.error('db:generate: --db-url failed for all URL variants:', lastErr?.message || lastErr);
    process.exit(1);
  }
}

if (!types || types.length < 500) {
  console.error('db:generate: output too small; refusing to write.');
  process.exit(1);
}

writeFileSync(outFile, types, 'utf8');
console.log(`db:generate: wrote ${outFile} (${types.length} bytes) via ${source}`);
