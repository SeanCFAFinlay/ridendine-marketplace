// ==========================================
// OPS-ADMIN FINANCE API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { financeActionSchema, type OpsCommandInput } from '@ridendine/validation';
import { operationResultResponse, parseJsonBody } from '@/lib/validation';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  finalizeOpsActor,
  guardPlatformApi,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engine/finance
 * Get financial data
 */
export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_engine'));
  if (opsActor instanceof Response) return opsActor;

  const { searchParams } = new URL(request.url);
  const today = new Date().toISOString().substring(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);
  const startDate = searchParams.get('startDate') || thirtyDaysAgo;
  const endDate = searchParams.get('endDate') || today;

  const engine = getEngine();
  const result = await engine.ops.getFinanceOperations(opsActor, {
    start: `${startDate}T00:00:00`,
    end: `${endDate}T23:59:59`,
  });

  if (!result.success) {
    return errorResponse(result.error!.code, result.error!.message, 400);
  }

  return successResponse(result.data);
}

/**
 * POST /api/engine/finance
 * Finance actions
 */
export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_engine'));
  if (opsActor instanceof Response) return opsActor;

  const actionInput = await parseJsonBody(request, financeActionSchema);
  if (actionInput instanceof Response) return actionInput;
  const engine = getEngine();
  const command = actionInput as OpsCommandInput;
  const result = await engine.operations.execute(command, opsActor);
  return operationResultResponse(result, command.action === 'create_payout_hold' ? 201 : 200);
}
