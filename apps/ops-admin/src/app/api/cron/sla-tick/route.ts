import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import { validateEngineProcessorHeaders } from '@ridendine/utils';
import type { ActorContext } from '@ridendine/types';

export const dynamic = 'force-dynamic';

const SYSTEM_ACTOR: ActorContext = { userId: 'system', role: 'system' };

async function run(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const client = createAdminClient();
  const engine = createCentralEngine(client);
  const { warnings, breaches } = await engine.sla.processExpiredTimers(SYSTEM_ACTOR);

  return NextResponse.json({
    success: true,
    data: {
      warningsCount: warnings.length,
      breachesCount: breaches.length,
      ts: new Date().toISOString(),
    },
  });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
