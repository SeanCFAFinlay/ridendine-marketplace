import { NextResponse } from 'next/server';
import {
  createAdminClient,
  getSupportTicketById,
  updateSupportTicket,
  type SupabaseClient,
} from '@ridendine/db';
import { getOpsActorContext, errorResponse, hasRequiredRole } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    if (!hasRequiredRole(actor, ['ops_agent', 'ops_manager', 'super_admin'])) {
      return errorResponse('FORBIDDEN', 'Only ops staff can update support tickets.', 403);
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient() as unknown as SupabaseClient;

    let updates = body;

    if (body.action === 'start_review') {
      updates = {
        status: 'in_progress',
        assigned_to: actor.entityId || actor.userId,
      };
    } else if (body.action === 'resolve') {
      const existing = await getSupportTicketById(supabase, id);
      if (!existing) {
        return errorResponse('NOT_FOUND', 'Support ticket not found', 404);
      }

      updates = {
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        assigned_to: existing.assigned_to || actor.entityId || actor.userId,
      };
    }

    const ticket = await updateSupportTicket(supabase, id, updates);
    return NextResponse.json({ data: ticket });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
