import { NextResponse } from 'next/server';
import {
  createAdminClient,
  listCompletedProcessorRuns,
  type SupabaseClient,
} from '@ridendine/db';
import { checkSystemHealth } from '@ridendine/engine';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * Must match the cron entries in apps/ops-admin/vercel.json exactly — enforced
 * by scripts/smoke/processor-method-contract.test.cjs.
 *
 * Previously this list also carried 'payouts-chef-preview' and
 * 'payouts-driver-preview', which nothing schedules and which never write
 * ops_processor_runs, so their lastSuccessAt was permanently null. A readiness
 * signal that always looks broken gets ignored, so they are gone. Meanwhile
 * 'partner-webhooks' was scheduled but untracked, which is the opposite
 * failure — a real job nobody could see.
 */
const TRACKED_PROCESSORS = [
  'sla',
  'expired-offers',
  'partner-webhooks',
  'reconciliation-daily',
  'retention',
] as const;

function envReadiness() {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'CRON_SECRET',
    'ENGINE_PROCESSOR_TOKEN',
  ];

  // Not required to boot, but their absence silently degrades a capability the
  // platform appears to have: no outbound email/SMS, per-instance rate limits
  // instead of global ones, and an unverified finance webhook.
  const optional = [
    'STRIPE_WEBHOOK_SECRET_OPS',
    'UPSTASH_REDIS_REST_URL',
    'UPSTASH_REDIS_REST_TOKEN',
    'RESEND_API_KEY',
    'TWILIO_ACCOUNT_SID',
    'NEXT_PUBLIC_SENTRY_DSN',
  ];

  return {
    ...Object.fromEntries(
      required.map((key) => [key, { configured: Boolean(process.env[key]), required: true }])
    ),
    ...Object.fromEntries(
      optional.map((key) => [key, { configured: Boolean(process.env[key]), required: false }])
    ),
  };
}

async function processorRunsReadiness(
  client: SupabaseClient,
): Promise<Record<string, { lastSuccessAt: string | null }>> {
  const initial: Record<string, { lastSuccessAt: string | null }> = {};
  for (const name of TRACKED_PROCESSORS) {
    initial[name] = { lastSuccessAt: null };
  }

  try {
    const data = await listCompletedProcessorRuns(client, 50);
    if (!Array.isArray(data)) return initial;

    for (const row of data) {
      const slot = initial[row.processor_name];
      if (!slot) continue;
      if (slot.lastSuccessAt === null && row.finished_at) {
        slot.lastSuccessAt = row.finished_at;
      }
    }
    return initial;
  } catch {
    return initial;
  }
}

export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'engine_health');
  if (denied) return denied;

  try {
    const client = createAdminClient();
    const [health, processorRuns] = await Promise.all([
      checkSystemHealth(client as any),
      processorRunsReadiness(client as unknown as SupabaseClient),
    ]);
    const readiness = {
      env: envReadiness(),
      processorRoutes: {
        sla: '/api/engine/processors/sla',
        expiredOffers: '/api/engine/processors/expired-offers',
        partnerWebhooks: '/api/engine/processors/partner-webhooks',
        reconciliationDaily: '/api/engine/processors/reconciliation',
        retention: '/api/engine/processors/retention',
      },
      processorRuns,
    };
    const statusCode = health.overall.status === 'down' ? 503 : 200;
    return NextResponse.json({ ...health, readiness }, { status: statusCode });
  } catch {
    return NextResponse.json(
      {
        overall: {
          status: 'down',
          timestamp: new Date().toISOString(),
          details: { error: 'Health check failed' },
        },
        components: {},
      },
      { status: 503 },
    );
  }
}
