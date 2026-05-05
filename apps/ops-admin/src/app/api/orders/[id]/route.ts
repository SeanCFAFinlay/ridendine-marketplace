import { NextResponse } from 'next/server';
import { createAdminClient, getOrderById, type SupabaseClient } from '@ridendine/db';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import {
  finalizeOpsActor,
  getEngine,
  getOpsActorContext,
  guardPlatformApi,
} from '@/lib/engine';
import type { OrderCancelReason, OrderRejectReason } from '@ridendine/types';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getOpsActorContext();
    const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'ops_orders_read'));
    if (opsActor instanceof Response) return opsActor;

    const { id } = await params;
    const supabase = createAdminClient() as unknown as SupabaseClient;

    const order = await getOrderById(supabase, id);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ data: order });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getOpsActorContext();
    const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'ops_orders_write'));
    if (opsActor instanceof Response) return opsActor;

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.opsAdminMutation,
      namespace: 'ops-orders-patch',
      userId: opsActor.userId,
      routeKey: 'PATCH:/api/orders/[id]',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const { id } = await params;
    const body = await request.json();
    const engine = getEngine();

    if (body.status) {
      const statusToAction: Record<string, { action: string; extra?: Record<string, unknown> }> = {
        accepted: { action: 'accept' },
        rejected: { action: 'reject', extra: { reason: 'other', notes: 'Rejected from ops-admin legacy route' } },
        preparing: { action: 'start_preparing' },
        ready: { action: 'mark_ready' },
        ready_for_pickup: { action: 'mark_ready' },
        cancelled: { action: 'cancel', extra: { reason: 'ops_override', notes: 'Cancelled from ops-admin legacy route' } },
        completed: { action: 'complete' },
      };

      const mapped = statusToAction[body.status];
      if (!mapped) {
        return NextResponse.json(
          { error: `Unsupported status transition: ${body.status}` },
          { status: 400 }
        );
      }

      switch (mapped.action) {
        case 'accept': {
          const result = await engine.orders.acceptOrder(id, 20, opsActor);
          if (!result.success) {
            return NextResponse.json({ error: result.error?.message || 'Failed to accept order' }, { status: 400 });
          }
          return NextResponse.json({ data: result.data });
        }
        case 'reject': {
          const result = await engine.orders.rejectOrder(
            id,
            (mapped.extra?.reason as OrderRejectReason | undefined) || 'other',
            mapped.extra?.notes as string | undefined,
            opsActor
          );
          if (!result.success) {
            return NextResponse.json({ error: result.error?.message || 'Failed to reject order' }, { status: 400 });
          }
          return NextResponse.json({ data: result.data });
        }
        case 'start_preparing': {
          const result = await engine.orders.startPreparing(id, opsActor);
          if (!result.success) {
            return NextResponse.json({ error: result.error?.message || 'Failed to start preparing' }, { status: 400 });
          }
          return NextResponse.json({ data: result.data });
        }
        case 'mark_ready': {
          const result = await engine.platform.markOrderReady(id, opsActor);
          if (!result.success) {
            return NextResponse.json({ error: result.error?.message || 'Failed to mark ready' }, { status: 400 });
          }
          return NextResponse.json({ data: result.data });
        }
        case 'cancel': {
          const result = await engine.orders.cancelOrder({
            orderId: id,
            actorId: opsActor.userId,
            actorType: opsActor.role,
            actorRole: opsActor.role,
            reason: (mapped.extra?.reason as OrderCancelReason | undefined) || 'ops_override',
            notes: mapped.extra?.notes as string | undefined,
            actor: opsActor,
          });
          if (!result.success) {
            return NextResponse.json({ error: result.error || 'Failed to cancel order' }, { status: 400 });
          }
          return NextResponse.json({ data: result.order });
        }
        case 'complete': {
          const result = await engine.orders.completeOrder({
            orderId: id,
            actorId: opsActor.userId,
            actorRole: opsActor.role,
          });
          if (!result.success) {
            return NextResponse.json({ error: result.error || 'Failed to complete order' }, { status: 400 });
          }
          return NextResponse.json({ data: result.order });
        }
      }
    }

    return NextResponse.json(
      { error: 'Invalid request body' },
      { status: 400 }
    );
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
