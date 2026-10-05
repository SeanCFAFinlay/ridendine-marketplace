// =============================================================================
// PROCESSOR METHOD CONTRACT — regression test for the R-01 class of defect.
//
// Vercel Cron invokes a scheduled path with GET. Every processor route
// previously implemented its work in POST and exposed GET only as a
// `{ status: 'ready' }` ping, so the production schedule performed no work
// while `pnpm local-cron` (which POSTs) worked perfectly in development.
//
// This test asserts, statically:
//   1. every path listed in apps/ops-admin/vercel.json crons resolves to a
//      route file that exists;
//   2. that route exports BOTH GET and POST;
//   3. GET is not a status-only stub — it must delegate to the shared runner;
//   4. every processor validates the engine processor token;
//   5. every scheduled processor claims + finishes an ops_processor_runs row,
//      so GET /api/engine/health can report on it.
//
// It is deliberately static: it never boots a server, so it runs in CI with no
// database, no network, and no secrets.
// =============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '..', '..');
const OPS = path.join(REPO, 'apps', 'ops-admin');

function readVercelCrons() {
  const cfg = JSON.parse(fs.readFileSync(path.join(OPS, 'vercel.json'), 'utf8'));
  return cfg.crons || [];
}

function routeFileFor(cronPath) {
  return path.join(OPS, 'src', 'app', ...cronPath.split('/').filter(Boolean), 'route.ts');
}

const crons = readVercelCrons();

test('vercel.json declares at least one cron', () => {
  assert.ok(crons.length > 0, 'no crons declared in apps/ops-admin/vercel.json');
});

for (const cron of crons) {
  const file = routeFileFor(cron.path);
  const rel = path.relative(REPO, file).replace(/\\/g, '/');

  test(`${cron.path} — route file exists`, () => {
    assert.ok(fs.existsSync(file), `scheduled path has no route file: ${rel}`);
  });

  if (!fs.existsSync(file)) continue;
  const src = fs.readFileSync(file, 'utf8');

  test(`${cron.path} — exports GET and POST`, () => {
    assert.match(src, /export\s+async\s+function\s+GET\b/, `${rel} must export GET (Vercel Cron sends GET)`);
    assert.match(src, /export\s+async\s+function\s+POST\b/, `${rel} must export POST (local-cron and manual curl send POST)`);
  });

  test(`${cron.path} — GET performs work, not just a status ping`, () => {
    const get = src.slice(src.indexOf('export async function GET'));
    assert.match(
      get,
      /return\s+run[A-Za-z]*\(request\)|return\s+handle[A-Za-z]*\(request\)/,
      `${rel}: GET must delegate to the shared runner. A GET that only returns ` +
        `{ status: 'ready' } means the production cron does nothing — this is exactly ` +
        `the R-01 defect this test exists to prevent.`
    );
  });

  test(`${cron.path} — validates the processor token`, () => {
    assert.match(
      src,
      /validateEngineProcessorHeaders\(request\.headers\)/,
      `${rel} must authenticate with validateEngineProcessorHeaders`
    );
  });

  test(`${cron.path} — records an ops_processor_runs row`, () => {
    assert.match(src, /claimProcessorRun\(/, `${rel} must claim a processor run for idempotency`);
    assert.match(src, /finishProcessorRun\(/, `${rel} must finish the processor run so health can report it`);
  });
}

test('every scheduled processor is tracked by the health endpoint', () => {
  const health = fs.readFileSync(
    path.join(OPS, 'src', 'app', 'api', 'engine', 'health', 'route.ts'),
    'utf8'
  );
  const tracked = (health.match(/TRACKED_PROCESSORS\s*=\s*\[([\s\S]*?)\]/) || [, ''])[1];
  const names = [...tracked.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);

  for (const cron of crons) {
    const slug = cron.path.split('/').pop();
    // reconciliation is registered under its historical processor name
    const expected = slug === 'reconciliation' ? 'reconciliation-daily' : slug;
    assert.ok(
      names.includes(expected),
      `GET /api/engine/health does not track '${expected}'. A scheduled processor ` +
        `that is not tracked is invisible in readiness — nobody can tell whether it ran.`
    );
  }
});

test('health does not track processors that nothing schedules', () => {
  const health = fs.readFileSync(
    path.join(OPS, 'src', 'app', 'api', 'engine', 'health', 'route.ts'),
    'utf8'
  );
  const tracked = (health.match(/TRACKED_PROCESSORS\s*=\s*\[([\s\S]*?)\]/) || [, ''])[1];
  const names = [...tracked.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]);

  const scheduled = new Set(
    crons.map((c) => {
      const slug = c.path.split('/').pop();
      return slug === 'reconciliation' ? 'reconciliation-daily' : slug;
    })
  );

  for (const name of names) {
    assert.ok(
      scheduled.has(name),
      `GET /api/engine/health tracks '${name}' but nothing schedules it, so its ` +
        `lastSuccessAt is permanently null — a readiness signal that always looks broken ` +
        `trains operators to ignore readiness entirely.`
    );
  }
});
