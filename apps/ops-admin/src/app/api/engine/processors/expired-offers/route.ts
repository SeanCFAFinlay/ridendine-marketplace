// ==========================================
// EXPIRED OFFERS PROCESSOR ENDPOINT
// Scheduled by apps/ops-admin/vercel.json. Expires stale delivery offers so
// they can be re-offered to the next ranked driver.//
// METHOD CONTRACT — do not narrow this without reading the note.
// Vercel Cron invokes a scheduled path with GET. scripts/local-cron.mjs and
// manual `curl` use POST. Both MUST perform the work, or the processor runs
// in development and silently does nothing in production. `?mode=status`
// keeps the old lightweight readiness ping available for monitors.
// Regression-tested by scripts/smoke/processor-method-contract.test.cjs.
// ==========================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import { validateEngineProcessorHeaders } from '@ridendine/utils';
import { claimProcessorRun, finishProcessorRun } from '@/lib/processor-runs';

async function runExpiredOffersProcessor(request: NextRequest) {
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

export async function POST(request: NextRequest) {
  // Checked here as well as in the runner so each exported entry point is
  // self-evidently guarded when read in isolation.
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }
  return runExpiredOffersProcessor(request);
}

/**
 * Vercel Cron sends GET, so GET performs the work. `?mode=status` returns the
 * readiness ping instead, for uptime monitors that must not trigger a run.
 */
export async function GET(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (new URL(request.url).searchParams.get('mode') === 'status') {
    return NextResponse.json({
      success: true,
      processor: 'expired-offers',
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  }

  return runExpiredOffersProcessor(request);
}
