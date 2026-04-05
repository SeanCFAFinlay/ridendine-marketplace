import type { NextRequest } from 'next/server';
import { platformSettingsUpdateSchema } from '@ridendine/validation';
import {
  errorResponse,
  getEngine,
  getOpsActorContext,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const rules = await getEngine().ops.getPlatformRules();
  return successResponse(rules);
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const body = await request.json();
  const parsed = platformSettingsUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse('INVALID_INPUT', parsed.error.issues[0]?.message || 'Invalid settings payload');
  }

  const result = await getEngine().ops.updatePlatformRules(parsed.data, actor);
  if (!result.success) {
    return errorResponse(result.error!.code, result.error!.message, result.error!.code === 'FORBIDDEN' ? 403 : 400);
  }

  return successResponse(result.data);
}
