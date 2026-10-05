// ==========================================
// RECONCILIATION PROCESSOR
// Scheduled by apps/ops-admin/vercel.json. Reconciles Stripe against
// ledger_entries for the previous day and records the outcome in
// ops_processor_runs so GET /api/engine/health can report it.
//
// Replaces /api/cron/reconciliation-daily, which was never scheduled and
// never wrote ops_processor_runs — so money divergence between Stripe and the
// ledger went undetected until someone ran it by hand. That route remains for
// backward compatibility and now delegates here.
//
// METHOD CONTRACT — do not narrow this without reading the note.
// Vercel Cron invokes a scheduled path with GET. scripts/local-cron.mjs and
// manual `curl` use POST. Both MUST perform the work, or the processor runs
// in development and silently does nothing in production. `?mode=status`
// keeps a lightweight readiness ping available for monitors.
// Regression-tested by scripts/smoke/processor-method-contract.test.cjs.
// ==========================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import { validateEngineProcessorHeaders } from '@ridendine/utils';
import { claimProcessorRun, finishProcessorRun } from '@/lib/processor-runs';

export const dynamic = 'force-dynamic';

/**
 * Reconcile the previous UTC day by default. Running "yesterday" rather than
 * "today" means the day being reconciled is closed, so late-settling Stripe
 * events are already present. An explicit `?date=YYYY-MM-DD` overrides it.
 */
function resolveTargetDate(request: NextRequest): string {
  const explicit = new URL(request.url).searchParams.get('date');
  if (explicit && /^\d{4}-\d{2}-\d{2}$/.test(explicit)) return explicit;
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function runReconciliationProcessor(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const client = createAdminClient();
  const targetDate = resolveTargetDate(request);

  // Key on the date, not the minute: reconciling one day twice is wasteful and
  // would double-count into stripe_reconciliation.
  const headers = new Headers(request.headers);
  if (!headers.get('x-idempotency-key')) {
    headers.set('x-idempotency-key', `reconciliation:${targetDate}`);
  }

  const processorRun = await claimProcessorRun(client, 'reconciliation-daily', headers);
  if (!processorRun.claimed) {
    return NextResponse.json(
      {
        success: !processorRun.error,
        data: { skipped: true, targetDate, idempotencyKey: processorRun.idempotencyKey },
        error: processorRun.error,
      },
      { status: processorRun.error ? 500 : 200 }
    );
  }

  try {
    const engine = createCentralEngine(client);
    const summary = await engine.reconciliation.runDaily(targetDate);
    const data = {
      processedAt: new Date().toISOString(),
      targetDate,
      idempotencyKey: processorRun.idempotencyKey,
      summary,
    };
    await finishProcessorRun(client, processorRun.runId, 'completed', data);
    return NextResponse.json({ success: true, processor: 'reconciliation-daily', data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Reconciliation processor error:', error);
    await finishProcessorRun(client, processorRun.runId, 'failed', { targetDate }, message);
    return NextResponse.json(
      { success: false, error: 'Reconciliation failed', message },
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
  return runReconciliationProcessor(request);
}

/**
 * Vercel Cron sends GET, so GET performs the work. `?mode=status` returns the
 * readiness ping instead, for uptime monitors that must not trigger a run.
 */
export async function GET(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (new URL(request.url).searchParams.get('mode') === 'status') {
    return NextResponse.json({
      success: true,
      processor: 'reconciliation-daily',
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  }

  return runReconciliationProcessor(request);
}
