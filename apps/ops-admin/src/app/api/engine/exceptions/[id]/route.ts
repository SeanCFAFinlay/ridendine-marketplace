// ==========================================
// OPS-ADMIN EXCEPTION DETAIL API
// Powered by Central Engine
// ==========================================

import { NextRequest } from 'next/server';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';
import type { ExceptionStatus } from '@ridendine/types';

/**
 * GET /api/engine/exceptions/[id]
 * Get exception details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: exceptionId } = await params;

  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const engine = getEngine();
  const result = await engine.support.getException(exceptionId);

  if (!result.success) {
    return errorResponse(result.error!.code, result.error!.message, 404);
  }

  return successResponse(result.data);
}

/**
 * PATCH /api/engine/exceptions/[id]
 * Update exception
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: exceptionId } = await params;

  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const body = await request.json();
  const { action, ...actionParams } = body;

  const engine = getEngine();

  switch (action) {
    case 'acknowledge': {
      const result = await engine.support.acknowledgeException(exceptionId, actor);
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'update_status': {
      const result = await engine.support.updateExceptionStatus(
        exceptionId,
        actionParams.status as ExceptionStatus,
        actionParams.notes,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'escalate': {
      const result = await engine.support.escalateException(
        exceptionId,
        actionParams.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'resolve': {
      const result = await engine.support.resolveException(
        exceptionId,
        actionParams.resolution,
        actionParams.linkedRefundId,
        actionParams.linkedPayoutAdjustmentId,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'add_note': {
      const result = await engine.support.addNote(
        exceptionId,
        actionParams.content,
        actionParams.isInternal ?? true,
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
