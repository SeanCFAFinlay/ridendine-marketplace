// ==========================================
// OPS-ADMIN ENGINE CLIENT
// FND-016: uses shared getEngine/errorResponse/successResponse
// ==========================================

import type { ActorContext } from '@ridendine/types';
import { errorResponse, getAdminEngine as getEngine, successResponse } from '@ridendine/engine';

export { getEngine, errorResponse, successResponse };
export {
  getOpsActorContext,
  hasRequiredRole,
  guardPlatformApi,
  hasPlatformApiCapability,
} from '@ridendine/engine/server';
export type { PlatformApiCapability } from '@ridendine/engine/server';

/** After `guardPlatformApi`, narrows `actor` for TypeScript (401 if missing). */
export function finalizeOpsActor(
  actor: ActorContext | null,
  denied: Response | null
): ActorContext | Response {
  if (denied) return denied;
  if (!actor) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  return actor;
}
