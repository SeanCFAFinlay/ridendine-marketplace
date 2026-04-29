import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { checkSystemHealth } from '@ridendine/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = createAdminClient();
    const health = await checkSystemHealth(client as any);
    const statusCode = health.overall.status === 'down' ? 503 : 200;
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
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
