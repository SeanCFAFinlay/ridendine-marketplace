// ==========================================
// DATA RETENTION PROCESSOR
// Scheduled by apps/ops-admin/vercel.json. Prunes high-volume operational
// tables to the retention windows defined in migration 00064_data_retention.
//
// There was previously no retention policy, TTL, partitioning or archival
// anywhere in the schema — every row ever written was kept forever, with
// driver_locations alone growing ~4 rows/minute per online driver.
//
// Financial and audit tables (audit_logs, ledger_entries, ops_override_logs,
// order_status_history, stripe_events_processed) are deliberately NOT pruned;
// deleting those is a compliance decision, not housekeeping.
//
// `?dryRun=1` reports what WOULD be deleted without deleting anything. Run
// that first against production — the first real run may remove years of rows.
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
import { validateEngineProcessorHeaders } from '@ridendine/utils';
import { claimProcessorRun, finishProcessorRun } from '@/lib/processor-runs';

export const dynamic = 'force-dynamic';

interface PruneRow {
  table_name: string;
  rows_affected: number;
}

async function runRetentionProcessor(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get('dryRun') === '1';

  const client = createAdminClient();
  const day = new Date().toISOString().slice(0, 10);

  // Key on the day: pruning is idempotent by nature (a second run finds nothing
  // left in the window) but there is no reason to scan five tables twice.
  // A dry run never claims, so it can be repeated freely.
  const headers = new Headers(request.headers);
  if (!dryRun && !headers.get('x-idempotency-key')) {
    headers.set('x-idempotency-key', `retention:${day}`);
  }

  if (dryRun) {
    const { data, error } = await client.rpc('prune_expired_data', { dry_run: true });
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Retention dry run failed', message: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json({
      success: true,
      processor: 'retention',
      data: { dryRun: true, day, wouldDelete: (data ?? []) as PruneRow[] },
    });
  }

  const processorRun = await claimProcessorRun(client, 'retention', headers);
  if (!processorRun.claimed) {
    return NextResponse.json(
      {
        success: !processorRun.error,
        data: { skipped: true, day, idempotencyKey: processorRun.idempotencyKey },
        error: processorRun.error,
      },
      { status: processorRun.error ? 500 : 200 }
    );
  }

  try {
    const { data, error } = await client.rpc('prune_expired_data', { dry_run: false });
    if (error) throw new Error(error.message);

    const pruned = (data ?? []) as PruneRow[];
    const total = pruned.reduce((sum, r) => sum + Number(r.rows_affected ?? 0), 0);

    const result = {
      processedAt: new Date().toISOString(),
      idempotencyKey: processorRun.idempotencyKey,
      totalRowsDeleted: total,
      // The function batches at 50k per table; a full batch means there is more
      // to remove and the next run will continue.
      moreRemaining: pruned.some((r) => Number(r.rows_affected ?? 0) >= 50000),
      tables: pruned,
    };
    await finishProcessorRun(client, processorRun.runId, 'completed', result);
    return NextResponse.json({ success: true, processor: 'retention', data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Retention processor error:', error);
    await finishProcessorRun(client, processorRun.runId, 'failed', { day }, message);
    return NextResponse.json(
      { success: false, error: 'Retention prune failed', message },
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
  return runRetentionProcessor(request);
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
      processor: 'retention',
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  }

  return runRetentionProcessor(request);
}
