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

  const refundAmount =
    command.action === 'request_refund'
      ? command.amountCents
      : command.action === 'approve_refund'
        ? command.approvedAmountCents
        : 0;

  if (refundAmount > 0) {
    const isSuperOrFinanceAdmin =
      opsActor.role === 'super_admin' || opsActor.role === 'finance_admin';
    const isManagerOrAdmin =
      isSuperOrFinanceAdmin ||
      opsActor.role === 'ops_manager' ||
      opsActor.role === 'finance_manager' ||
      opsActor.role === 'ops_admin';

    if (refundAmount > 10000 && !isSuperOrFinanceAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message:
              'Refunds exceeding $100.00 CAD require Super-Admin or Finance Admin authorization.',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (refundAmount > 3000 && !isManagerOrAdmin) {
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message:
              'Refunds between $30.01 and $100.00 CAD require Ops Manager approval. Support agent authorization limit is $30.00 CAD.',
          },
        }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  const result = await getEngine().operations.execute(command, opsActor);
  return operationResultResponse(result, command.action === 'request_refund' ? 201 : 200);
}
