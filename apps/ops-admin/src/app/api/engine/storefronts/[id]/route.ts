// ==========================================
// OPS-ADMIN STOREFRONT MANAGEMENT API
// Powered by Central Engine
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, updateStorefront } from '@ridendine/db';
import {
  getEngine,
  getOpsActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engine/storefronts/[id]
 * Get storefront details with kitchen status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storefrontId } = await params;

  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const adminClient = createAdminClient();
  const engine = getEngine();

  // Get storefront with related data
  const { data: storefront, error } = await adminClient
    .from('chef_storefronts')
    .select(`
      *,
      chef:chef_profiles (
        id, display_name, phone, status
      ),
      kitchen:chef_kitchens (
        address, lat, lng
      )
    `)
    .eq('id', storefrontId)
    .single();

  if (error || !storefront) {
    return errorResponse('NOT_FOUND', 'Storefront not found', 404);
  }

  // Get kitchen queue
  const queue = await engine.kitchen.getKitchenQueue(storefrontId);

  // Get availability status
  const availability = await engine.kitchen.getStorefrontAvailability(storefrontId);

  // Get overload status
  const overloadStatus = await engine.kitchen.checkOverloadStatus(storefrontId);

  // Get state change history (cast to any for new table)
  const { data: stateChanges } = await (adminClient as any)
    .from('storefront_state_changes')
    .select('*')
    .eq('storefront_id', storefrontId)
    .order('created_at', { ascending: false })
    .limit(20);

  return successResponse({
    storefront,
    queue,
    availability,
    overloadStatus,
    stateChanges: stateChanges || [],
  });
}

/**
 * PATCH /api/engine/storefronts/[id]
 * Update storefront or perform actions
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: storefrontId } = await params;

  const actor = await getOpsActorContext();
  if (!actor) {
    return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
  }

  const body = await request.json();
  const { action, ...actionParams } = body;

  const engine = getEngine();

  switch (action) {
    case 'pause': {
      const result = await engine.kitchen.pauseStorefront(
        storefrontId,
        actionParams.reason,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'unpause': {
      const result = await engine.kitchen.unpauseStorefront(storefrontId, actor);
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse(result.data);
    }

    case 'update_max_queue': {
      const adminClient = createAdminClient();
      const data = await updateStorefront(adminClient as any, storefrontId, {
        max_queue_size: actionParams.maxQueueSize,
      });
      return successResponse(data);
    }

    case 'reorder_queue': {
      const result = await engine.kitchen.reorderQueue(
        storefrontId,
        actionParams.orderIds,
        actor
      );
      if (!result.success) {
        return errorResponse(result.error!.code, result.error!.message);
      }
      return successResponse({ reordered: true });
    }

    default:
      return errorResponse('INVALID_ACTION', `Unknown action: ${action}`);
  }
}
