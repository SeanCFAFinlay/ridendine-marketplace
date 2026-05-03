import type { NextRequest } from 'next/server';
import { getEngine, getOpsActorContext, guardPlatformApi, successResponse, errorResponse, finalizeOpsActor } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_payouts'));
  if (opsActor instanceof Response) return opsActor;

  let body: { type?: string };
  try {
    body = (await request.json()) as { type?: string };
  } catch {
    return errorResponse('INVALID_JSON', 'Expected JSON body', 400);
  }

  const engine = getEngine();
  const t = body.type === 'driver' ? 'driver' : 'chef';
  const preview =
    t === 'chef'
      ? await engine.payoutAutomation.previewChefRun(new Date())
      : await engine.payoutAutomation.previewDriverRun(new Date());

  return successResponse({ type: t, ...preview });
}
