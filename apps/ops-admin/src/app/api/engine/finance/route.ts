// ==========================================
// OPS-ADMIN FINANCE API
// Powered by Central Engine
// ==========================================

import { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  successResponse,
  hasRequiredRole,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engine/finance
 * Get financial data
 */
export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  // Finance data requires elevated permissions
  if (!hasRequiredRole(actor, ['ops_manager', 'finance_admin', 'super_admin'])) {
    return errorResponse('FORBIDDEN', 'Not authorized to view financial data', 403);
  }

  const { searchParams } = new URL(request.url);
  const today = new Date().toISOString().substring(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const startDate = searchParams.get('startDate') || thirtyDaysAgo;
  const endDate = searchParams.get('endDate') || today;

  const engine = getEngine();
  const adminClient = createAdminClient();

  // Get financial summary
  const summary = await engine.commerce.getFinancialSummary({ start: startDate, end: endDate });

  // Get pending refunds
  const pendingRefunds = await engine.commerce.getPendingRefunds();

  // Get recent ledger entries (cast to any for new table)
  const { data: recentLedger } = await (adminClient as any)
    .from('ledger_entries')
    .select(`
      *,
      orders (order_number)
    `)
    .gte('created_at', startDate)
    .lte('created_at', endDate + 'T23:59:59')
    .order('created_at', { ascending: false })
    .limit(100);

  // Get payout adjustments pending (cast to any for new table)
  const { data: pendingAdjustments } = await (adminClient as any)
    .from('payout_adjustments')
    .select(`
      *,
      orders (order_number)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  // Get daily totals for chart (cast to any for RPC)
  const { data: dailyTotals } = await (adminClient as any).rpc('get_financial_summary', {
    start_date: startDate,
    end_date: endDate,
  });

  return successResponse({
    summary,
    pendingRefunds,
    recentLedger: recentLedger || [],
    pendingAdjustments: pendingAdjustments || [],
    dailyTotals: dailyTotals || [],
  });
}

/**
 * POST /api/engine/finance
 * Finance actions
 */
export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  if (!hasRequiredRole(actor, ['ops_manager', 'finance_admin', 'super_admin'])) {
    return errorResponse('FORBIDDEN', 'Not authorized for financial actions', 403);
  }

  const body = await request.json();
  const { action, ...actionParams } = body;

  const engine = getEngine();

  switch (action) {
    case 'create_payout_hold': {
      const result = await engine.commerce.createPayoutHold(
        actionParams.payeeType,
        actionParams.payeeId,
        actionParams.orderId,
        actionParams.amountCents,
        actionParams.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data, 201);
    }

    case 'release_payout_hold': {
      const result = await engine.commerce.releasePayoutHold(
        actionParams.adjustmentId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'get_order_financials': {
      const result = await engine.commerce.getOrderFinancials(actionParams.orderId);
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    default:
      return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
  }
}
