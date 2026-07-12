// ==========================================
// CHEF-ADMIN INVENTORY API — one-click auto-reorder (Ghost-Kitchen Phase B.4)
//
// Drafts purchase orders for low-stock shared-pool items: finds items at/below
// their reorder point, groups them by preferred supplier, and creates one DRAFT
// PO per supplier with lines at qty-back-to-par (computeReorderSuggestion). The
// operator reviews + submits before anything is "sent" — this only drafts.
// Items with no preferred supplier are reported, never guessed.
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { computeReorderSuggestion, purchaseOrderTotal } from '@ridendine/engine';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getEngine, getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

interface Candidate {
  id: string;
  name: string;
  unit: string | null;
  supplierId: string;
  suggestion: number;
  costPerUnit: number;
}

/** POST /api/inventory/reorder — draft POs to bring low-stock items back to par. */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-inventory-reorder',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/inventory/reorder',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    // Optional: restrict to a specific set of item ids; otherwise all low items.
    let itemIds: string[] | null = null;
    try {
      const body = await request.json();
      if (Array.isArray(body?.itemIds)) itemIds = body.itemIds.filter((x: unknown) => typeof x === 'string');
    } catch {
      // no body → reorder every low item
    }

    const admin = createAdminClient() as unknown as SupabaseClient;
    const { data: items, error } = await admin
      .from('inventory_items')
      .select('id, name, unit, current_quantity, reorder_point, par_quantity, cost_per_unit, preferred_supplier_id, is_active')
      .eq('kitchen_id', ctx.kitchenId);
    if (error) {
      console.error('Reorder: inventory query error', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to load inventory', 500);
    }

    const candidates: Candidate[] = [];
    const skippedNoSupplier: { id: string; name: string; suggestion: number }[] = [];

    for (const i of items ?? []) {
      if (!i.is_active) continue;
      if (itemIds && !itemIds.includes(i.id)) continue;
      const suggestion = computeReorderSuggestion({
        onHand: Number(i.current_quantity ?? 0),
        reorderPoint: i.reorder_point,
        parQuantity: i.par_quantity,
      });
      if (suggestion <= 0) continue;
      if (!i.preferred_supplier_id) {
        skippedNoSupplier.push({ id: i.id, name: i.name, suggestion });
        continue;
      }
      candidates.push({
        id: i.id,
        name: i.name,
        unit: i.unit ?? null,
        supplierId: i.preferred_supplier_id,
        suggestion,
        costPerUnit: Number(i.cost_per_unit ?? 0),
      });
    }

    if (candidates.length === 0) {
      return successResponse({
        draftedPurchaseOrders: [],
        skippedNoSupplier,
        message: candidates.length === 0 && skippedNoSupplier.length === 0 ? 'Nothing needs reordering.' : undefined,
      });
    }

    // Group by supplier → one draft PO each.
    const bySupplier = new Map<string, Candidate[]>();
    for (const c of candidates) {
      const list = bySupplier.get(c.supplierId) ?? [];
      list.push(c);
      bySupplier.set(c.supplierId, list);
    }

    const drafted: { purchaseOrderId: string; supplierId: string; lineCount: number; total: number }[] = [];

    for (const [supplierId, group] of bySupplier) {
      const total = purchaseOrderTotal(group.map((c) => ({ quantity: c.suggestion, unitCost: c.costPerUnit })));

      const { data: po, error: poErr } = await admin
        .from('purchase_orders')
        .insert({
          kitchen_id: ctx.kitchenId,
          supplier_id: supplierId,
          status: 'draft',
          notes: 'Auto-drafted from low stock (review before submitting)',
          total_cost: total,
          created_by: ctx.actor.userId,
        })
        .select('id')
        .single();
      if (poErr || !po) {
        console.error('Reorder: PO insert error', poErr);
        continue;
      }

      const lineRows = group.map((c) => ({
        purchase_order_id: po.id,
        inventory_item_id: c.id,
        description: c.name,
        quantity: c.suggestion, // base units; pack_size 1
        pack_size: 1,
        unit_cost: c.costPerUnit,
      }));
      const { error: linesErr } = await admin.from('purchase_order_lines').insert(lineRows);
      if (linesErr) {
        console.error('Reorder: PO lines insert error', linesErr);
        continue;
      }

      await getEngine().audit.log({
        action: 'create',
        entityType: 'purchase_order',
        entityId: po.id,
        actor: ctx.actor,
        afterState: { source: 'auto_reorder', supplierId, lines: group.length, total },
      });

      drafted.push({ purchaseOrderId: po.id, supplierId, lineCount: group.length, total });
    }

    return successResponse({ draftedPurchaseOrders: drafted, skippedNoSupplier }, 201);
  } catch (error) {
    console.error('Error auto-reordering:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
