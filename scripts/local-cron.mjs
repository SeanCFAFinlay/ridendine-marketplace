// ==========================================
// LOCAL CRON RUNNER
// Simulates Vercel cron jobs during local development.
// Runs sla-tick and expired-offers on configurable intervals.
//
// Skipped (run rarely, trigger manually):
//   /api/cron/payouts-chef-preview
//   /api/cron/payouts-driver-preview
//   /api/cron/reconciliation-daily
// ==========================================

const CRON_SECRET = process.env.CRON_SECRET ?? 'dev-cron-secret';
const OPS_ADMIN_URL = process.env.OPS_ADMIN_URL ?? 'http://localhost:3002';

const ROUTES = [
  { path: '/api/cron/sla-tick', intervalMs: 60_000 },
  { path: '/api/cron/expired-offers', intervalMs: 30_000 },
];

function now() {
  return new Date().toISOString();
}

async function tick(path) {
  const url = `${OPS_ADMIN_URL}${path}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${CRON_SECRET}` },
    });
    const body = await res.json().catch(() => null);
    console.log(JSON.stringify({ ts: now(), path, status: res.status, body }));
  } catch (err) {
    console.error(JSON.stringify({ ts: now(), path, error: err instanceof Error ? err.message : String(err) }));
  }
}

const timers = ROUTES.map(({ path, intervalMs }) => {
  tick(path); // fire immediately on start
  return setInterval(() => tick(path), intervalMs);
});

console.log(JSON.stringify({ ts: now(), msg: 'Local cron runner started', opsAdminUrl: OPS_ADMIN_URL }));

process.on('SIGINT', () => {
  console.log(JSON.stringify({ ts: now(), msg: 'Shutting down local cron runner' }));
  timers.forEach(clearInterval);
  process.exit(0);
});

process.on('SIGTERM', () => {
  timers.forEach(clearInterval);
  process.exit(0);
});
