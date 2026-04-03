// ==========================================
// OPS-ADMIN REFUNDS API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  successResponse,
  hasRequiredRole,
} from '@/lib/engine';
import type { RefundReason } from '@ridendine/types';

/**
 * GET /api/engine/refunds
 * Get pending refunds
 */
export async function GET() {
  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const engine = getEngine();
  const pendingRefunds = await engine.commerce.getPendingRefunds();

  return successResponse({ refunds: pendingRefunds });
}

/**
 * POST /api/engine/refunds
 * Request, approve, or process refund
 */
export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const body = await request.json();
  const { action, ...actionParams } = body;

  const engine = getEngine();

  switch (action) {
    case 'request': {
      const result = await engine.commerce.requestRefund(
        actionParams.orderId,
        actionParams.amountCents,
        actionParams.reason as RefundReason,
        actionParams.notes,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data, 201);
    }

    case 'approve': {
      if (!hasRequiredRole(actor, ['ops_agent', 'ops_manager', 'finance_admin', 'super_admin'])) {
        return errorResponse('FORBIDDEN', 'Not authorized to approve refunds', 403);
      }

      const result = await engine.commerce.approveRefund(
        actionParams.refundCaseId,
        actionParams.approvedAmountCents,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'deny': {
      if (!hasRequiredRole(actor, ['ops_agent', 'ops_manager', 'finance_admin', 'super_admin'])) {
        return errorResponse('FORBIDDEN', 'Not authorized to deny refunds', 403);
      }

      const result = await engine.commerce.denyRefund(
        actionParams.refundCaseId,
        actionParams.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'process': {
      if (!hasRequiredRole(actor, ['ops_manager', 'finance_admin', 'super_admin'])) {
        return errorResponse('FORBIDDEN', 'Not authorized to process refunds', 403);
      }

      // In production, this would call Stripe to process the refund
      // and then record the stripe refund ID
      const result = await engine.commerce.processRefund(
        actionParams.refundCaseId,
        actionParams.stripeRefundId || `mock_refund_${Date.now()}`, // Mock for now
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    default:
      return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
  }
}
