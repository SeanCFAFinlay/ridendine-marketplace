import { NextResponse } from 'next/server';
import {
  createAdminClient,
  getSupportTicketById,
  updateSupportTicket,
  type SupabaseClient,
} from '@ridendine/db';
import { ActorRole } from '@ridendine/types';
import {
  finalizeOpsActor,
  getOpsActorContext,
  errorResponse,
  guardPlatformApi,
  getEngine,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getOpsActorContext();
    const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'support_queue'));
    if (opsActor instanceof Response) return opsActor;

    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient() as unknown as SupabaseClient;
    const engine = getEngine();

    if (opsActor.role === ActorRole.SUPPORT_AGENT) {
      const existing = await getSupportTicketById(supabase, id);
      if (!existing) {
        return errorResponse('NOT_FOUND', 'Support ticket not found', 404);
      }
      if (existing.assigned_to && existing.assigned_to !== opsActor.userId) {
        return errorResponse('FORBIDDEN', 'Ticket is assigned to another agent', 403);
      }
    }

    let updates = body;

    if (body.action === 'start_review') {
      updates = {
        status: 'in_progress',
        assigned_to: opsActor.entityId || opsActor.userId,
      };
    } else if (body.action === 'resolve') {
      const existing = await getSupportTicketById(supabase, id);
      if (!existing) {
        return errorResponse('NOT_FOUND', 'Support ticket not found', 404);
      }

      updates = {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        assigned_to: existing.assigned_to || opsActor.entityId || opsActor.userId,
      };
    }

    const ticket = await updateSupportTicket(supabase, id, updates);
    await engine.audit.log({
      action: 'update',
      entityType: 'support_ticket',
      entityId: id,
      actor: opsActor,
      afterState: updates,
      reason: body.action ? `support_${body.action}` : 'support_update',
    });
    return NextResponse.json({ data: ticket });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
