// ==========================================
// OPS-ADMIN DASHBOARD API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engine/dashboard
 * Get ops dashboard data
 */
export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const { searchParams } = new URL(request.url);
  const today = new Date().toISOString().substring(0, 10);
  const startDate = searchParams.get('startDate') || today;
  const endDate = searchParams.get('endDate') || today;

  const engine = getEngine();
  const adminClient = createAdminClient();

  // Get dashboard stats via RPC (cast to any for new tables)
  const { data: stats } = await (adminClient as any).rpc('get_ops_dashboard_stats');

  // Convert to object
  const statsObj: Record<string, number> = {};
  if (stats && Array.isArray(stats)) {
    for (const row of stats as Array<{ stat_name: string; stat_value: string | number }>) {
      statsObj[row.stat_name] = Number(row.stat_value);
    }
  }

  // Get exception counts
  const exceptionCounts = await engine.support.getExceptionCounts();

  // Get SLA metrics
  const slaMetrics = await engine.sla.getMetrics({ startDate, endDate });

  // Get financial summary
  const financialSummary = await engine.commerce.getFinancialSummary({ start: startDate, end: endDate });

  // Get dispatch board summary
  const dispatchBoard = await engine.dispatch.getDispatchBoard();

  // Get recent orders needing attention
  const { data: urgentOrders } = await adminClient
    .from('orders')
    .select(`
      id, order_number, total, engine_status, created_at,
      customer:customers (first_name, last_name),
      storefront:chef_storefronts (name)
    `)
    .in('engine_status', ['pending', 'dispatch_pending', 'exception'])
    .order('created_at', { ascending: true })
    .limit(10);

  // Get active alerts (cast to any for new table)
  const { data: alerts } = await (adminClient as any)
    .from('system_alerts')
    .select('*')
    .eq('acknowledged', false)
    .order('created_at', { ascending: false })
    .limit(20);

  // Get SLA breaches
  const breachedTimers = await engine.sla.getBreachedTimers(10);

  return successResponse({
    stats: {
      activeOrders: statsObj.active_orders || 0,
      pendingOrders: statsObj.pending_orders || 0,
      readyOrders: statsObj.ready_orders || 0,
      activeDeliveries: statsObj.active_deliveries || 0,
      onlineDrivers: statsObj.online_drivers || 0,
      busyDrivers: statsObj.busy_drivers || 0,
      openExceptions: statsObj.open_exceptions || 0,
      criticalExceptions: statsObj.critical_exceptions || 0,
      pendingRefunds: statsObj.pending_refunds || 0,
      pausedStorefronts: statsObj.paused_storefronts || 0,
      slaBreachesToday: statsObj.sla_breaches_today || 0,
    },
    exceptions: exceptionCounts,
    sla: slaMetrics,
    financials: financialSummary,
    dispatch: {
      pendingCount: dispatchBoard.pendingDispatch.length,
      activeCount: dispatchBoard.activeDeliveries.length,
      availableDrivers: dispatchBoard.availableDrivers.length,
      escalatedCount: dispatchBoard.escalated.length,
    },
    urgentOrders: urgentOrders || [],
    alerts: alerts || [],
    slaBreaches: breachedTimers,
  });
}

/**
 * POST /api/engine/dashboard
 * Dashboard actions
 */
export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const body = await request.json();
  const { action, ...actionParams } = body;

  const adminClient = createAdminClient();
  const engine = getEngine();

  switch (action) {
    case 'acknowledge_alert': {
      const { error } = await (adminClient as any)
        .from('system_alerts')
        .update({
          acknowledged: true,
          acknowledged_by: actor.userId,
          acknowledged_at: new Date().toISOString(),
        })
        .eq('id', actionParams.alertId);

      if (error) {
        return errorResponse('UPDATE_FAILED', error.message);
      }
      return successResponse({ acknowledged: true });
    }

    case 'process_expired_offers': {
      const processed = await engine.dispatch.processExpiredOffers(actor);
      return successResponse({ processedCount: processed });
    }

    case 'process_sla_timers': {
      const { warnings, breaches } = await engine.sla.processExpiredTimers(actor);
      return successResponse({
        warningsCount: warnings.length,
        breachesCount: breaches.length,
      });
    }

    default:
      return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
  }
}
