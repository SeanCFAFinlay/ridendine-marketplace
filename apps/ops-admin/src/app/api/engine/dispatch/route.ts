// ==========================================
// OPS-ADMIN DISPATCH API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { deliveryInterventionActionSchema } from '@ridendine/validation';
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
  const board = await engine.ops.getDispatchCommandCenter();

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
  const parsed = deliveryInterventionActionSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('INVALID_INPUT', parsed.error.issues[0]?.message || 'Invalid dispatch action');
  }

  const actionInput = parsed.data;

  const engine = getEngine();

  switch (actionInput.action) {
    case 'manual_assign': {
      const result = await engine.dispatch.manualAssign(
        actionInput.deliveryId,
        actionInput.driverId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'reassign': {
      const result = await engine.dispatch.reassignDelivery(
        actionInput.deliveryId,
        actionInput.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse({ reassigned: true });
    }

    case 'retry_assignment': {
      const result = await engine.dispatch.findAndAssignDriver(
        actionInput.deliveryId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'escalate_exception': {
      const result = await engine.ops.escalateDeliveryException(
        actionInput.deliveryId,
        actionInput.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'cancel_delivery': {
      const result = await engine.ops.cancelDelivery(
        actionInput.deliveryId,
        actionInput.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'acknowledge_issue': {
      const result = await engine.ops.acknowledgeException(
        actionInput.exceptionId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'add_ops_note': {
      const result = await engine.ops.addDeliveryOpsNote(
        actionInput.deliveryId,
        actionInput.note,
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
