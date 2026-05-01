import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { checkSystemHealth } from '@ridendine/engine';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'engine_health');
  if (denied) return denied;

  try {
    const client = createAdminClient();
    const health = await checkSystemHealth(client as any);
    const statusCode = health.overall.status === 'down' ? 503 : 200;
    return NextResponse.json(health, { status: statusCode });
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
