import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getEngine, getOpsActorContext, guardPlatformApi, successResponse, errorResponse, finalizeOpsActor } from '@/lib/engine';
import { AuditAction } from '@ridendine/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_payouts'));
  if (opsActor instanceof Response) return opsActor;

  const { id } = await context.params;
  const client = createAdminClient();
  const { data: row } = await client
    .from('instant_payout_requests')
    .select('id, driver_id, amount_cents, status')
    .eq('id', id)
    .single();

  if (!row || row.status !== 'pending') {
    return errorResponse('NOT_FOUND', 'Instant payout request not found or not pending', 404);
  }

  const engine = getEngine();
  const exec = await engine.payoutAutomation.executeInstantPayout({
    requestId: id,
    driverId: row.driver_id as string,
    amountCents: row.amount_cents as number,
    currency: 'CAD',
    actor: opsActor,
  });

  await engine.audit.log({
    action: AuditAction.PAYOUT,
    entityType: 'instant_payout_request',
    entityId: id,
    actor: opsActor,
    afterState: { ok: exec.ok, error: exec.error },
  });

  if (!exec.ok) {
    return errorResponse('EXECUTE_FAILED', exec.error ?? 'execute failed', 500);
  }

  return successResponse({ executed: true });
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_payouts'));
  if (opsActor instanceof Response) return opsActor;

  const { id } = await context.params;
  const engine = getEngine();
  const r = await engine.payoutAutomation.cancelInstantPayout(id);
  if (!r.ok) {
    return errorResponse('CANCEL_FAILED', r.error ?? 'cancel failed', 400);
  }
  return successResponse({ cancelled: true });
}
