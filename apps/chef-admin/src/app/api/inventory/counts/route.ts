// ==========================================
// CHEF-ADMIN INVENTORY API — physical count
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { inventoryCountSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * POST /api/inventory/counts
 * Record a physical count. Each line's variance against the cached quantity is
 * reconciled with a `count_correction` movement so the ledger and cache match
 * the counted truth.
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-inventory-count',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/inventory/counts',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = inventoryCountSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid count', 400);
    }
    const { note, lines } = parsed.data;

    const admin = createAdminClient() as unknown as SupabaseClient;

    // Verify every counted item belongs to this kitchen.
    const itemIds = [...new Set(lines.map((l) => l.inventoryItemId))];
    const { data: items } = await admin
      .from('inventory_items')
      .select('id, current_quantity')
      .eq('kitchen_id', ctx.kitchenId)
      .in('id', itemIds);

    const itemById = new Map((items ?? []).map((i) => [i.id, i]));
    const unknownIds = itemIds.filter((id) => !itemById.has(id));
    if (unknownIds.length > 0) {
      return errorResponse('VALIDATION_ERROR', 'One or more items do not belong to your kitchen', 400);
    }

    const { data: count, error: countErr } = await admin
      .from('inventory_counts')
      .insert({
        kitchen_id: ctx.kitchenId,
        status: 'completed',
        counted_by: ctx.actor.userId,
        note: note ?? null,
        completed_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    if (countErr || !count) {
      console.error('Inventory count create error:', countErr);
      return errorResponse('INTERNAL_ERROR', 'Failed to create count', 500);
    }

    let corrections = 0;
    for (const line of lines) {
      const item = itemById.get(line.inventoryItemId)!;
      const systemQty = Number(item.current_quantity ?? 0);
      const variance = line.countedQuantity - systemQty;

      await admin.from('inventory_count_lines').insert({
        count_id: count.id,
        inventory_item_id: line.inventoryItemId,
        counted_quantity: line.countedQuantity,
        system_quantity: systemQty,
        variance,
      });

      if (variance !== 0) {
        corrections += 1;
        await admin.from('inventory_stock_movements').insert({
          kitchen_id: ctx.kitchenId,
          inventory_item_id: line.inventoryItemId,
          movement_type: 'count_correction',
          quantity: variance,
          reference_type: 'inventory_count',
          reference_id: count.id,
          note: 'Count reconciliation',
          created_by: ctx.actor.userId,
        });
        await admin
          .from('inventory_items')
          .update({ current_quantity: line.countedQuantity })
          .eq('id', line.inventoryItemId)
          .eq('kitchen_id', ctx.kitchenId);
      }
    }

    return successResponse({ count, linesRecorded: lines.length, corrections }, 201);
  } catch (error) {
    console.error('Error recording inventory count:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
