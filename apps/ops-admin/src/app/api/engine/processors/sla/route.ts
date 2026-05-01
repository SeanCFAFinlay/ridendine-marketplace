// ==========================================
// SLA PROCESSOR ENDPOINT
// Called by Vercel Cron every minute to process SLA timers
// and enforce timeout automation.
// ==========================================

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import {
  checkChefAcceptanceTimeout,
  checkDriverAssignmentTimeout,
  checkStalePreparingOrders,
} from '@ridendine/engine';
import { validateEngineProcessorHeaders } from '@ridendine/utils';

export async function POST(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const client = createAdminClient();
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
    let driverEscalations = 0;
    const driverTimeouts = await checkDriverAssignmentTimeout(client, 10);
    for (const v of driverTimeouts) {
      await client
        .from('deliveries')
        .update({ escalated_to_ops: true, updated_at: new Date().toISOString() })
        .eq('id', v.entityId);

      await (client as any).from('system_alerts').insert({
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
      await (client as any).from('system_alerts').insert({
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

    // Flush queued domain events
    await engine.events.flush();

    return NextResponse.json({
      success: true,
      data: {
        processedAt: new Date().toISOString(),
        slaTimers: {
          warnings: timerResult.warnings.length,
          breaches: timerResult.breaches.length,
        },
        timeoutAutomation: {
          chefTimeoutsCancelled,
          driverEscalations,
          staleAlerts,
        },
      },
    });
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

// Health check
export async function GET(request: NextRequest) {
  if (!validateEngineProcessorHeaders(request.headers)) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    success: true,
    processor: 'sla',
    status: 'ready',
    timestamp: new Date().toISOString(),
  });
}
