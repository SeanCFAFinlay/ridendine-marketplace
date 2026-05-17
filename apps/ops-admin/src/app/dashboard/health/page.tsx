import { Card } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

type HealthCheck = {
  ready: boolean;
  count?: number;
  error?: string | null;
};

async function loadHealth() {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}` ||
    'http://localhost:3002';
  const response = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' });
  return response.json() as Promise<{
    readiness?: string;
    checks?: Record<string, HealthCheck>;
  }>;
}

export default async function HealthPage() {
  let health: Awaited<ReturnType<typeof loadHealth>>;
  try {
    health = await loadHealth();
  } catch (error) {
    health = {
      readiness: 'not_ready',
      checks: {
        healthApi: {
          ready: false,
          error: error instanceof Error ? error.message : 'Health API failed',
        },
      },
    };
  }

  const checks = Object.entries(health.checks ?? {});

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Ops Health</h1>
          <p className="mt-1 text-textMuted">
            Live readiness for the dashboard, Supabase tables, seed data, driver presence, and business engine dependencies.
          </p>
        </div>

        <Card className="border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wide text-textMuted">Readiness</p>
              <p className="mt-1 text-2xl font-semibold text-white">{health.readiness ?? 'unknown'}</p>
            </div>
            <span
              className={`rounded-full px-3 py-1 text-sm ${
                health.readiness === 'ready'
                  ? 'bg-success/20 text-success'
                  : 'bg-danger/20 text-danger'
              }`}
            >
              {health.readiness === 'ready' ? 'Operational' : 'Needs attention'}
            </span>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {checks.map(([name, check]) => (
            <Card key={name} className="border-border bg-surface p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold capitalize text-white">{name.replace(/([A-Z])/g, ' $1')}</p>
                  <p className="mt-1 text-sm text-textMuted">
                    {typeof check.count === 'number' ? `${check.count} records` : 'Connectivity check'}
                  </p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    check.ready
                      ? 'bg-success/20 text-success'
                      : 'bg-danger/20 text-danger'
                  }`}
                >
                  {check.ready ? 'Ready' : 'Error'}
                </span>
              </div>
              {check.error && <p className="mt-3 text-sm text-danger">{check.error}</p>}
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
