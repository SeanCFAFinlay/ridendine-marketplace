// ==========================================
// OPS-ADMIN EXCEPTIONS API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  finalizeOpsActor,
  guardPlatformApi,
  successResponse,
} from '@/lib/engine';
import type { ExceptionStatus, ExceptionSeverity, ExceptionType } from '@ridendine/types';

/**
 * GET /api/engine/exceptions
 * Get exceptions queue
 */
export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'exceptions_read');
  if (denied) return denied;

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
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'exceptions_write'));
  if (opsActor instanceof Response) return opsActor;

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
        opsActor
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
        opsActor
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
