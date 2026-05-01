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
  finalizeOpsActor,
  guardPlatformApi,
} from '@/lib/engine';
import type { RefundReason } from '@ridendine/types';

/** Real Stripe refund IDs (live or test) use this prefix; never accept synthetic `mock_*` IDs (Phase 13). */
function isValidStripeRefundId(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const id = value.trim();
  if (id.length < 10 || id.length > 255) return false;
  if (id.startsWith('mock_')) return false;
  return /^re_[A-Za-z0-9]+$/.test(id);
}

/**
 * GET /api/engine/refunds
 * Get pending refunds
 */
export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'finance_refunds_read');
  if (denied) return denied;

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
  const body = await request.json();
  const { action, ...actionParams } = body;

  const engine = getEngine();

  switch (action) {
    case 'request': {
      const opsActor = finalizeOpsActor(
        actor,
        guardPlatformApi(actor, 'finance_refunds_request')
      );
      if (opsActor instanceof Response) return opsActor;

      const result = await engine.commerce.requestRefund(
        actionParams.orderId,
        actionParams.amountCents,
        actionParams.reason as RefundReason,
        actionParams.notes,
        opsActor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data, 201);
    }

    case 'approve': {
      const opsActor = finalizeOpsActor(
        actor,
        guardPlatformApi(actor, 'finance_refunds_sensitive')
      );
      if (opsActor instanceof Response) return opsActor;

      const result = await engine.commerce.approveRefund(
        actionParams.refundCaseId,
        actionParams.approvedAmountCents,
        opsActor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'deny': {
      const opsActor = finalizeOpsActor(
        actor,
        guardPlatformApi(actor, 'finance_refunds_sensitive')
      );
      if (opsActor instanceof Response) return opsActor;

      const result = await engine.commerce.denyRefund(
        actionParams.refundCaseId,
        actionParams.reason,
        opsActor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'process': {
      const opsActor = finalizeOpsActor(
        actor,
        guardPlatformApi(actor, 'finance_refunds_sensitive')
      );
      if (opsActor instanceof Response) return opsActor;

      if (!isValidStripeRefundId(actionParams.stripeRefundId)) {
        return errorResponse(
          'STRIPE_REFUND_ID_REQUIRED',
          'process requires a real Stripe refund id (re_...) from your Stripe API after the refund is created; synthetic ids are not allowed.',
          400
        );
      }

      const result = await engine.commerce.processRefund(
        actionParams.refundCaseId,
        actionParams.stripeRefundId,
        opsActor
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
