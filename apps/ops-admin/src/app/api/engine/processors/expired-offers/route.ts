// ==========================================
// EXPIRED OFFERS PROCESSOR ENDPOINT
// Called by external cron to expire stale delivery assignment offers
// FND-014 fix: automated expired offer processing
// ==========================================

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';

function validateProcessorToken(request: NextRequest): boolean {
  // Support both Vercel Cron (Authorization: Bearer <CRON_SECRET>) and
  // external cron (x-processor-token header)
  const vercelSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  if (vercelSecret && authHeader === `Bearer ${vercelSecret}`) {
    return true;
  }

  const token = request.headers.get('x-processor-token');
  const expected = process.env.ENGINE_PROCESSOR_TOKEN;
  if (!expected && !vercelSecret) {
    console.error('Neither ENGINE_PROCESSOR_TOKEN nor CRON_SECRET configured');
    return false;
  }
  return !!expected && token === expected;
}

export async function POST(request: NextRequest) {
  if (!validateProcessorToken(request)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const client = createAdminClient();
    const engine = createCentralEngine(client);

    const actor = { userId: 'system', role: 'system' as const };

    const expiredCount = await engine.dispatch.processExpiredOffers(actor);

    // Flush any queued domain events
    await engine.events.flush();

    return NextResponse.json({
      success: true,
      data: {
        processedAt: new Date().toISOString(),
        expiredOffers: expiredCount,
      },
    });
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
  if (!validateProcessorToken(request)) {
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
