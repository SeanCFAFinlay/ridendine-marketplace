import { NextResponse } from 'next/server';
import { createAdminClient, updateSupportTicket, type SupabaseClient } from '@ridendine/db';
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

    const ticket = await updateSupportTicket(supabase, id, body);
    return NextResponse.json({ data: ticket });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
