// ==========================================
// OPS-ADMIN EXCEPTIONS API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { exceptionCommandSchema, type OpsCommandInput } from '@ridendine/validation';
import { operationResultResponse, parseJsonBody } from '@/lib/validation';
import {
  getEngine,
  getOpsActorContext,
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

  const actionInput = await parseJsonBody(request, exceptionCommandSchema);
  if (actionInput instanceof Response) return actionInput;

  const result = await getEngine().operations.execute(actionInput as OpsCommandInput, opsActor);
  return operationResultResponse(result, 201);
}
