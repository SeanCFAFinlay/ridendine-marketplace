// ==========================================
// OPS-ADMIN DASHBOARD API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { dashboardCommandSchema } from '@ridendine/validation';
import { operationResultResponse, parseJsonBody } from '@/lib/validation';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  finalizeOpsActor,
  guardPlatformApi,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engine/dashboard
 * Get ops dashboard data
 */
export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'dashboard_read');
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const today = new Date().toISOString().substring(0, 10);
  const startDate = searchParams.get('startDate') || today;
  const endDate = searchParams.get('endDate') || today;

  const engine = getEngine();
  const adminDb = createAdminClient();
  const repositoryClient = adminDb as unknown as SupabaseClient;

  // Get dashboard stats via RPC (cast to any for new tables)
  const { data: stats } = await repositoryClient.rpc('get_ops_dashboard_stats');

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
  const { data: urgentOrders } = await adminDb
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
  const { data: alerts } = await repositoryClient
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
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'dashboard_actions'));
  if (opsActor instanceof Response) return opsActor;

  const actionInput = await parseJsonBody(request, dashboardCommandSchema);
  if (actionInput instanceof Response) return actionInput;
  const engine = getEngine();
  const result = await engine.operations.execute(actionInput, opsActor);
  return operationResultResponse(result);
}
