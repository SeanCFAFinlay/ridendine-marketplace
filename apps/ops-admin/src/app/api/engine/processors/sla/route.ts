// ==========================================
// SLA PROCESSOR ENDPOINT
// Scheduled by apps/ops-admin/vercel.json. Processes SLA timers and enforces
// timeout automation (chef acceptance, driver assignment, stale preparing).
//
// METHOD CONTRACT — do not narrow this without reading the note.
// Vercel Cron invokes a scheduled path with GET. scripts/local-cron.mjs and
// manual `curl` use POST. Both MUST perform the work, or the processor runs
// in development and silently does nothing in production. `?mode=status`
// keeps the old lightweight readiness ping available for monitors.
// Regression-tested by scripts/smoke/processor-method-contract.test.cjs.
// ==========================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  createAdminClient,
  insertSystemAlert,
  markDeliveryEscalatedToOps,
  type SupabaseClient,
} from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import {
  checkAbandonedCheckouts,
  checkChefAcceptanceTimeout,
  checkDriverAssignmentTimeout,
  checkStalePreparingOrders,
} from '@ridendine/engine';
import { validateEngineProcessorHeaders } from '@ridendine/utils';
import { claimProcessorRun, finishProcessorRun } from '@/lib/processor-runs';

async function runSlaProcessor(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const client = createAdminClient();
    const processorRun = await claimProcessorRun(client, 'sla', request.headers);
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

    // Step 1: Process expired SLA timers (warnings + breaches)
    const timerResult = await engine.sla.processExpiredTimers(actor);

    // Step 2: Auto-cancel orders where chef hasn't accepted within 5 minutes
    let chefTimeoutsCancelled = 0;
    const chefTimeouts = await checkChefAcceptanceTimeout(client, 5);
    for (const v of chefTimeouts) {
      try {
        await engine.masterOrder.cancelOrder({
          orderId: v.entityId,
          actorId: 'system',
          actorType: 'system',
          reason: 'Chef acceptance timeout (5 min)',
        });
        chefTimeoutsCancelled++;
      } catch {
        console.warn(`[sla-processor] Failed to cancel order ${v.entityId}`);
      }
    }

    // Step 3: Escalate deliveries with no driver assignment after 10 minutes
    const repositoryClient = client as unknown as SupabaseClient;
    let driverEscalations = 0;
    const driverTimeouts = await checkDriverAssignmentTimeout(client, 10);
    for (const v of driverTimeouts) {
      await markDeliveryEscalatedToOps(repositoryClient, v.entityId);

      await insertSystemAlert(repositoryClient, {
        alert_type: 'driver_assignment_timeout',
        severity: 'error',
        title: 'Driver assignment timeout',
        message: `Delivery ${v.entityId} has no driver after ${v.elapsedMinutes} minutes.`,
        entity_type: 'delivery',
        entity_id: v.entityId,
        metadata: { elapsedMinutes: v.elapsedMinutes },
      });
      driverEscalations++;
    }

    // Step 4: Alert on orders stuck in preparing > 45 minutes
    let staleAlerts = 0;
    const staleOrders = await checkStalePreparingOrders(client, 45);
    for (const v of staleOrders) {
      await insertSystemAlert(repositoryClient, {
        alert_type: 'stale_preparing_order',
        severity: 'warning',
        title: 'Order stale in preparing state',
        message: `Order ${v.entityId} has been preparing for ${v.elapsedMinutes} minutes.`,
        entity_type: 'order',
        entity_id: v.entityId,
        metadata: { elapsedMinutes: v.elapsedMinutes },
      });
      staleAlerts++;
    }

    // Step 5: Cancel orders abandoned before payment. Without this they sit in
    // `checkout_pending` forever — nothing else in the system ever resolves them.
    let abandonedCancelled = 0;
    const abandoned = await checkAbandonedCheckouts(client, 60);
    for (const v of abandoned) {
      try {
        const { data: current } = await client
          .from('orders')
          .select('engine_status,payment_status')
          .eq('id', v.entityId)
          .maybeSingle();
        if (
          !current ||
          current.engine_status !== 'checkout_pending' ||
          current.payment_status === 'completed'
        ) {
          continue;
        }

        await engine.masterOrder.cancelOrder({
          orderId: v.entityId,
          actorId: 'system',
          actorType: 'system',
          reason: 'Checkout abandoned before payment (60 min)',
        });
        abandonedCancelled++;
      } catch {
        console.warn(`[sla-processor] Failed to cancel abandoned checkout ${v.entityId}`);
      }
    }

    // Flush queued domain events
    await engine.events.flush();

    const result = {
      success: true,
      data: {
        processedAt: new Date().toISOString(),
        idempotencyKey: processorRun.idempotencyKey,
        slaTimers: {
          warnings: timerResult.warnings.length,
          breaches: timerResult.breaches.length,
        },
        timeoutAutomation: {
          chefTimeoutsCancelled,
          driverEscalations,
          staleAlerts,
          abandonedCancelled,
        },
      },
    };
    await finishProcessorRun(client, processorRun.runId, 'completed', result.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error('SLA processor error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'SLA processing failed',
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
  return runSlaProcessor(request);
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
      processor: 'sla',
      status: 'ready',
      timestamp: new Date().toISOString(),
    });
  }

  return runSlaProcessor(request);
}
