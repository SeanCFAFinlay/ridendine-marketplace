import type { NextRequest } from 'next/server';
import { AuditAction } from '@ridendine/types';
import { getEngine, getOpsActorContext, guardPlatformApi, successResponse, errorResponse, finalizeOpsActor } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_payouts'));
  if (opsActor instanceof Response) return opsActor;

  let body: { type?: string; periodStart?: string; periodEnd?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('INVALID_JSON', 'Expected JSON body', 400);
  }

  if (!body.periodStart || !body.periodEnd) {
    return errorResponse('INVALID_INPUT', 'periodStart and periodEnd required', 400);
  }

  const engine = getEngine();
  const result =
    body.type === 'driver'
      ? await engine.payoutAutomation.executeDriverRun({
          periodStart: body.periodStart,
          periodEnd: body.periodEnd,
          actor: opsActor,
        })
      : await engine.payoutAutomation.executeChefRun({
          periodStart: body.periodStart,
          periodEnd: body.periodEnd,
          actor: opsActor,
        });

  await engine.audit.log({
    action: AuditAction.PAYOUT,
    entityType: 'payout_run',
    entityId: result.runId || '00000000-0000-0000-0000-000000000000',
    actor: opsActor,
    afterState: {
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      type: body.type,
      processed: result.processed,
      errors: result.errors,
    },
  });

  if (result.errors.length > 0 && result.processed === 0) {
    return errorResponse('PAYOUT_FAILED', result.errors.join('; '), 500);
  }

  return successResponse(result);
}
