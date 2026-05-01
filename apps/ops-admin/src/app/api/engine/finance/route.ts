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
  finalizeOpsActor,
  guardPlatformApi,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engine/finance
 * Get financial data
 */
export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_engine'));
  if (opsActor instanceof Response) return opsActor;

  const { searchParams } = new URL(request.url);
  const today = new Date().toISOString().substring(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const startDate = searchParams.get('startDate') || thirtyDaysAgo;
  const endDate = searchParams.get('endDate') || today;

  const engine = getEngine();
  const result = await engine.ops.getFinanceOperations(opsActor, {
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
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_engine'));
  if (opsActor instanceof Response) return opsActor;

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
        opsActor
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
        opsActor
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
        opsActor
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
        opsActor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data, 201);
    }

    case 'release_payout_hold': {
      const result = await engine.commerce.releasePayoutHold(
        actionInput.adjustmentId,
        opsActor
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
