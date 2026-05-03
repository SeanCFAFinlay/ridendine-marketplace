import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import { validateEngineProcessorHeaders } from '@ridendine/utils';

export const dynamic = 'force-dynamic';

async function run(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  const client = createAdminClient();
  const engine = createCentralEngine(client);
  const day = new Date().toISOString().slice(0, 10);
  const summary = await engine.reconciliation.runDaily(day);
  return NextResponse.json({ success: true, data: summary });
}

export async function GET(request: NextRequest) {
  return run(request);
}

export async function POST(request: NextRequest) {
  return run(request);
}
