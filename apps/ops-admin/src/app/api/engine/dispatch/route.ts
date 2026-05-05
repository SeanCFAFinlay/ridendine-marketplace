// ==========================================
// OPS-ADMIN DISPATCH API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { deliveryInterventionActionSchema } from '@ridendine/validation';
import { operationResultResponse, parseJsonBody } from '@/lib/validation';
import {
  getEngine,
  getOpsActorContext,
  finalizeOpsActor,
  guardPlatformApi,
  successResponse,
} from '@/lib/engine';

/**
 * GET /api/engine/dispatch
 * Get dispatch board data
 */
export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'dispatch_read');
  if (denied) return denied;

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
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'dispatch_write'));
  if (opsActor instanceof Response) return opsActor;

  const actionInput = await parseJsonBody(request, deliveryInterventionActionSchema);
  if (actionInput instanceof Response) return actionInput;
  const engine = getEngine();
  const result = await engine.operations.execute(actionInput, opsActor);
  return operationResultResponse(result);
}
