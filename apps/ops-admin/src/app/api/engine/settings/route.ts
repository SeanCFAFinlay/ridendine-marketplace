import type { NextRequest } from 'next/server';
import { platformSettingsUpdateSchema } from '@ridendine/validation';
import {
  errorResponse,
  finalizeOpsActor,
  getEngine,
  getOpsActorContext,
  guardPlatformApi,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'platform_settings'));
  if (opsActor instanceof Response) return opsActor;

  const rules = await getEngine().ops.getPlatformRules();
  return successResponse(rules);
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'platform_settings'));
  if (opsActor instanceof Response) return opsActor;

  const body = await request.json();
  const parsed = platformSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('INVALID_INPUT', parsed.error.issues[0]?.message || 'Invalid settings payload');
  }

  const result = await getEngine().ops.updatePlatformRules(parsed.data, opsActor);
  if (!result.success) {
    return errorResponse(result.error!.code, result.error!.message, result.error!.code === 'FORBIDDEN' ? 403 : 400);
  }

  return successResponse(result.data);
}
