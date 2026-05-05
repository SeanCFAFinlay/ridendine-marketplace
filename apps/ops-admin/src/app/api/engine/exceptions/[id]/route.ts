// ==========================================
// OPS-ADMIN EXCEPTION DETAIL API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { exceptionCommandSchema, type OpsCommandInput } from '@ridendine/validation';
import { operationResultResponse } from '@/lib/validation';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  successResponse,
  finalizeOpsActor,
  guardPlatformApi,
} from '@/lib/engine';

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
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'exceptions_write'));
  if (opsActor instanceof Response) return opsActor;

  let body: any;
  try {
    body = await request.json();
  } catch {
    return errorResponse('INVALID_JSON', 'Request body must be valid JSON', 400);
  }
  const actionMap: Record<string, string> = {
    acknowledge: 'acknowledge_exception',
    update_status: 'update_exception_status',
    escalate: 'escalate_exception',
    resolve: 'resolve_exception',
    add_note: 'add_exception_note',
  };
  const parsed = exceptionCommandSchema.safeParse({
    ...body,
    action: actionMap[body?.action] || body?.action,
    exceptionId,
  });
  if (!parsed.success) {
    return errorResponse(
      'INVALID_INPUT',
      parsed.error.issues[0]?.message || 'Invalid exception action',
      400
    );
  }
  const actionInput = parsed.data;

  const result = await getEngine().operations.execute(actionInput as OpsCommandInput, opsActor);
  return operationResultResponse(result);
}
