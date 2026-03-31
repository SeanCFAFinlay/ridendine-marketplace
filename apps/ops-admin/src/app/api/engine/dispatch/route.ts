// ==========================================
// OPS-ADMIN DISPATCH API
// Powered by Central Engine
// ==========================================

import { NextRequest } from 'next/server';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

/**
 * GET /api/engine/dispatch
 * Get dispatch board data
 */
export async function GET() {
  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const engine = getEngine();
  const board = await engine.dispatch.getDispatchBoard();

  return successResponse(board);
}

/**
 * POST /api/engine/dispatch
 * Dispatch actions
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
    case 'request_dispatch': {
      const result = await engine.dispatch.requestDispatch(
        actionParams.orderId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'manual_assign': {
      const result = await engine.dispatch.manualAssign(
        actionParams.deliveryId,
        actionParams.driverId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'reassign': {
      const result = await engine.dispatch.reassignDelivery(
        actionParams.deliveryId,
        actionParams.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse({ reassigned: true });
    }

    case 'retry_assignment': {
      const result = await engine.dispatch.findAndAssignDriver(
        actionParams.deliveryId,
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
