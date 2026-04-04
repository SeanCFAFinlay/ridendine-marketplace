import { NextResponse } from 'next/server';
import { createAdminClient, updateDriver, type SupabaseClient } from '@ridendine/db';
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
    if (!hasRequiredRole(actor, ['ops_manager', 'super_admin'])) {
      return errorResponse('FORBIDDEN', 'Only ops managers and super admins can govern driver status.', 403);
    }

    const { id } = await params;
    const body = await request.json();
    const supabase = createAdminClient() as unknown as SupabaseClient;

    if (body.status) {
      const driver = await updateDriver(supabase, id, { status: body.status });
      return NextResponse.json({ data: driver });
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
