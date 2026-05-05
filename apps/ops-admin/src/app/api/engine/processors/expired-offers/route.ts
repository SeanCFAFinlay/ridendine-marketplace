// ==========================================
// EXPIRED OFFERS PROCESSOR ENDPOINT
// Called by external cron to expire stale delivery assignment offers
// FND-014 fix: automated expired offer processing
// ==========================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import { validateEngineProcessorHeaders } from '@ridendine/utils';
import { claimProcessorRun, finishProcessorRun } from '@/lib/processor-runs';

export async function POST(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const client = createAdminClient();
    const processorRun = await claimProcessorRun(client, 'expired-offers', request.headers);
    if (!processorRun.claimed) {
      return NextResponse.json({
        success: !processorRun.error,
        data: {
          skipped: true,
          idempotencyKey: processorRun.idempotencyKey,
        },
        error: processorRun.error,
      }, { status: processorRun.error ? 500 : 200 });
    }
    const engine = createCentralEngine(client);

    const actor = { userId: 'system', role: 'system' as const };

    const expiredCount = await engine.dispatch.processExpiredOffers(actor);

    // Flush any queued domain events
    await engine.events.flush();

    const result = {
      success: true,
      data: {
        processedAt: new Date().toISOString(),
        expiredOffers: expiredCount,
        idempotencyKey: processorRun.idempotencyKey,
      },
    };
    await finishProcessorRun(client, processorRun.runId, 'completed', result.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Expired offers processor error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Expired offers processing failed',
        message: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    processor: 'expired-offers',
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
}
