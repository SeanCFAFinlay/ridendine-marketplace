// ==========================================
// OPS-ADMIN REFUNDS API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import {
  getEngine,
  getOpsActorContext,
  successResponse,
  finalizeOpsActor,
  guardPlatformApi,
} from '@/lib/engine';
import { refundCommandSchema, type OpsCommandInput } from '@ridendine/validation';
import { operationResultResponse, parseJsonBody } from '@/lib/validation';

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
  const actionInput = await parseJsonBody(request, refundCommandSchema);
  if (actionInput instanceof Response) return actionInput;

  const command = actionInput as OpsCommandInput;
  const capability =
    command.action === 'request_refund' ? 'finance_refunds_request' : 'finance_refunds_sensitive';
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, capability));
  if (opsActor instanceof Response) return opsActor;

  const result = await getEngine().operations.execute(command, opsActor);
  return operationResultResponse(result, command.action === 'request_refund' ? 201 : 200);
}
