// ==========================================
// PARTNER WEBHOOKS PROCESSOR
// Enqueues order-lifecycle events for partners with a registered webhook_url and
// delivers them (HMAC-signed, retried). Scheduled by apps/ops-admin/vercel.json;
// protected by the engine processor token.//
// METHOD CONTRACT — do not narrow this without reading the note.
// Vercel Cron invokes a scheduled path with GET. scripts/local-cron.mjs and
// manual `curl` use POST. Both MUST perform the work, or the processor runs
// in development and silently does nothing in production. `?mode=status`
// keeps the old lightweight readiness ping available for monitors.
// Regression-tested by scripts/smoke/processor-method-contract.test.cjs.
// ==========================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { validateEngineProcessorHeaders } from '@ridendine/utils';
import { runPartnerWebhookProcessor } from '@/lib/partner-webhooks';
import { claimProcessorRun, finishProcessorRun } from '@/lib/processor-runs';

export const dynamic = 'force-dynamic';

async function handlePartnerWebhookRun(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const client = createAdminClient() as unknown as SupabaseClient;

  // Claim the run so a double invocation in the same minute is skipped rather
  // than delivering every queued webhook twice, and so this processor is
  // visible to GET /api/engine/health readiness like sla + expired-offers.
  const processorRun = await claimProcessorRun(client, 'partner-webhooks', request.headers);
  if (!processorRun.claimed) {
    return NextResponse.json(
      {
        success: !processorRun.error,
        data: { skipped: true, idempotencyKey: processorRun.idempotencyKey },
        error: processorRun.error,
      },
      { status: processorRun.error ? 500 : 200 }
    );
  }

  try {
    const result = await runPartnerWebhookProcessor(client, Date.now());
    const data = { processedAt: new Date().toISOString(), idempotencyKey: processorRun.idempotencyKey, ...result };
    await finishProcessorRun(client, processorRun.runId, 'completed', data);
    return NextResponse.json({ success: true, processor: 'partner-webhooks', data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Partner webhooks processor error:', error);
    await finishProcessorRun(client, processorRun.runId, 'failed', {}, message);
    return NextResponse.json(
      {
        success: false,
        error: 'Partner webhook processing failed',
        message,
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
  return handlePartnerWebhookRun(request);
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
      processor: 'partner-webhooks',
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  }

  return handlePartnerWebhookRun(request);
}
