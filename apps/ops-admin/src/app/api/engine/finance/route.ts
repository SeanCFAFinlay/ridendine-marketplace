// ==========================================
// OPS-ADMIN FINANCE API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { financeActionSchema } from '@ridendine/validation';
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
  const result = await engine.ops.getFinanceOperations(actor, {
    start: `${startDate}T00:00:00`,
    end: `${endDate}T23:59:59`,
  });

  if (!result.success) {
    return errorResponse(result.error!.code, result.error!.message, 400);
  }

  return successResponse(result.data);
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
  const parsed = financeActionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('INVALID_INPUT', parsed.error.issues[0]?.message || 'Invalid finance action');
  }

  const actionInput = parsed.data;

  const engine = getEngine();

  switch (actionInput.action) {
    case 'approve_refund': {
      const result = await engine.commerce.approveRefund(
        actionInput.refundCaseId,
        actionInput.approvedAmountCents,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'deny_refund': {
      const result = await engine.commerce.denyRefund(
        actionInput.refundCaseId,
        actionInput.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'process_refund': {
      const result = await engine.commerce.processRefund(
        actionInput.refundCaseId,
        actionInput.stripeRefundId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'create_payout_hold': {
      const result = await engine.commerce.createPayoutHold(
        actionInput.payeeType,
        actionInput.payeeId,
        actionInput.orderId,
        actionInput.amountCents,
        actionInput.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data, 201);
    }

    case 'release_payout_hold': {
      const result = await engine.commerce.releasePayoutHold(
        actionInput.adjustmentId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    default:
      return errorResponse('INVALID_ACTION', 'Unknown action');
  }
}
