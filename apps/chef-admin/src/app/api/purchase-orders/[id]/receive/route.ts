// ==========================================
// CHEF-ADMIN PURCHASE ORDERS API — receive stock
//
// The integration centerpiece: receiving a PO line
//   1) creates a `receive` inventory stock movement (Stage 7 ledger),
//   2) updates the item's cached quantity and blended unit cost,
//   3) records supplier price history (so FUTURE recipe costs can change),
//   4) advances the line's received quantity and closes the PO when complete.
// Historical recipe_cost_snapshots are never touched.
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { receivePurchaseOrderSchema } from '@ridendine/validation';
import { receivedBaseQuantity, costPerBaseUnit, blendedUnitCost } from '@ridendine/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import {
  getEngine,
  getOperatorKitchenContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-po-receive',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/purchase-orders/[id]/receive',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id: poId } = await params;
    const parsed = receivePurchaseOrderSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid receipt', 400);
    }
    const receipt = parsed.data;
    const kitchenId = ctx.kitchenId;
    const admin = createAdminClient() as unknown as SupabaseClient;

    const { data: po } = await admin
      .from('purchase_orders')
      .select('id, status')
      .eq('id', poId)
      .eq('kitchen_id', kitchenId)
      .maybeSingle();
    if (!po) return errorResponse('NOT_FOUND', 'Purchase order not found', 404);
    if (po.status === 'cancelled' || po.status === 'received') {
      return errorResponse('CONFLICT', `Cannot receive a ${po.status} purchase order`, 409);
    }

    const { data: lines } = await admin
      .from('purchase_order_lines')
      .select('*')
      .eq('purchase_order_id', poId);
    const lineById = new Map((lines ?? []).map((l) => [l.id, l]));

    // Every receipt line must belong to this PO.
    const unknown = receipt.lines.filter((r) => !lineById.has(r.purchaseOrderLineId));
    if (unknown.length > 0) {
      return errorResponse('VALIDATION_ERROR', 'One or more lines do not belong to this purchase order', 400);
    }

    const { data: batch, error: batchErr } = await admin
      .from('receiving_batches')
      .insert({
        kitchen_id: kitchenId,
        purchase_order_id: poId,
        received_by: ctx.actor.userId,
        note: receipt.note ?? null,
      })
      .select('*')
      .single();
    if (batchErr || !batch) {
      console.error('Receiving batch error:', batchErr);
      return errorResponse('INTERNAL_ERROR', 'Failed to create receiving batch', 500);
    }

    let movementsCreated = 0;
    for (const r of receipt.lines) {
      if (r.receivedPacks <= 0) continue;
      const line = lineById.get(r.purchaseOrderLineId)!;
      const baseQty = receivedBaseQuantity(r.receivedPacks, Number(line.pack_size ?? 1));
      const receivedUnitCost = costPerBaseUnit(Number(line.unit_cost ?? 0), Number(line.pack_size ?? 1));

      // 1-2) Stock movement + cached quantity/cost update (if linked to inventory).
      if (line.inventory_item_id) {
        const { data: item } = await admin
          .from('inventory_items')
          .select('id, current_quantity, cost_per_unit')
          .eq('id', line.inventory_item_id)
          .eq('kitchen_id', kitchenId)
          .maybeSingle();
        if (item) {
          const currentQty = Number(item.current_quantity ?? 0);
          const newQty = currentQty + baseQty;
          const newCost = blendedUnitCost(currentQty, Number(item.cost_per_unit ?? 0), baseQty, receivedUnitCost);

          await admin.from('inventory_stock_movements').insert({
            kitchen_id: kitchenId,
            inventory_item_id: line.inventory_item_id,
            movement_type: 'receive',
            quantity: baseQty,
            unit_cost: receivedUnitCost,
            reference_type: 'receiving_batch',
            reference_id: batch.id,
            note: 'PO receipt',
            created_by: ctx.actor.userId,
          });
          movementsCreated += 1;

          await admin
            .from('inventory_items')
            .update({ current_quantity: newQty, cost_per_unit: newCost })
            .eq('id', line.inventory_item_id)
            .eq('kitchen_id', kitchenId);
        }
      }

      // 3) Supplier price history (future recipe costs can move; history stays).
      if (line.supplier_item_id) {
        await admin.from('supplier_price_history').insert({
          supplier_item_id: line.supplier_item_id,
          kitchen_id: kitchenId,
          unit_cost: Number(line.unit_cost ?? 0),
          pack_size: Number(line.pack_size ?? 1),
          source: 'receiving',
        });
      }

      // 4) Advance the line's received quantity.
      await admin
        .from('purchase_order_lines')
        .update({ received_quantity: Number(line.received_quantity ?? 0) + r.receivedPacks })
        .eq('id', line.id);
    }

    // Close the PO if every line is now fully received.
    const { data: refreshed } = await admin
      .from('purchase_order_lines')
      .select('quantity, received_quantity')
      .eq('purchase_order_id', poId);
    const fullyReceived =
      (refreshed ?? []).length > 0 &&
      (refreshed ?? []).every((l) => Number(l.received_quantity ?? 0) >= Number(l.quantity ?? 0));

    let poStatus = po.status;
    if (fullyReceived) {
      poStatus = 'received';
      await admin
        .from('purchase_orders')
        .update({ status: 'received', received_at: new Date().toISOString() })
        .eq('id', poId)
        .eq('kitchen_id', kitchenId);
    }

    await getEngine().audit.log({
      action: 'update',
      entityType: 'purchase_order',
      entityId: poId,
      actor: ctx.actor,
      afterState: { receivedLines: receipt.lines.length, movementsCreated, poStatus },
    });

    return successResponse({ batch, movementsCreated, poStatus, fullyReceived }, 201);
  } catch (error) {
    console.error('Error receiving purchase order:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
