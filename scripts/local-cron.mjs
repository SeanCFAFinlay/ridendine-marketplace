// ==========================================
// LOCAL CRON RUNNER
// Simulates Vercel cron jobs during local development.
// Runs sla-tick and expired-offers on configurable intervals.
//
// Reconciliation and retention run on their own daily Vercel schedules and are
// not simulated here. Trigger them manually if needed:
//   POST /api/engine/processors/reconciliation
//   POST /api/engine/processors/retention
// ==========================================

const CRON_SECRET = process.env.CRON_SECRET ?? 'dev-cron-secret';
const OPS_ADMIN_URL = process.env.OPS_ADMIN_URL ?? 'http://localhost:3002';

const ROUTES = [
  // Canonical SLA processor (writes ops_processor_runs). The legacy
  // /api/cron/* wrapper routes were unscheduled duplicates and have been removed.
  { path: '/api/engine/processors/sla', intervalMs: 60_000 },
  { path: '/api/engine/processors/expired-offers', intervalMs: 30_000 },
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
