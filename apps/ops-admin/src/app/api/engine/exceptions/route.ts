// ==========================================
// OPS-ADMIN EXCEPTIONS API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';
import type { ExceptionStatus, ExceptionSeverity, ExceptionType } from '@ridendine/types';

/**
 * GET /api/engine/exceptions
 * Get exceptions queue
 */
export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status')?.split(',') as ExceptionStatus[] | undefined;
  const severity = searchParams.get('severity')?.split(',') as ExceptionSeverity[] | undefined;
  const type = searchParams.get('type')?.split(',') as ExceptionType[] | undefined;
  const assignedTo = searchParams.get('assignedTo') || undefined;

  const engine = getEngine();

  const exceptions = await engine.support.getExceptionQueue({
    status,
    severity,
    type,
    assignedTo,
  });

  const counts = await engine.support.getExceptionCounts();
  const slaStatus = await engine.support.getSLAStatus();

  return successResponse({
    exceptions,
    counts,
    slaStatus,
  });
}

/**
 * POST /api/engine/exceptions
 * Create exception or perform actions
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
    case 'create': {
      const result = await engine.support.createException(
        {
          type: actionParams.type,
          severity: actionParams.severity,
          orderId: actionParams.orderId,
          customerId: actionParams.customerId,
          chefId: actionParams.chefId,
          driverId: actionParams.driverId,
          deliveryId: actionParams.deliveryId,
          title: actionParams.title,
          description: actionParams.description,
          recommendedActions: actionParams.recommendedActions,
          slaMinutes: actionParams.slaMinutes,
        },
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data, 201);
    }

    case 'from_ticket': {
      const result = await engine.support.createFromSupportTicket(
        actionParams.ticketId,
        actionParams.exceptionType,
        actionParams.severity,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data, 201);
    }

    default:
      return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
  }
}
