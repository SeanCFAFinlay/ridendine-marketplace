import { NextResponse } from 'next/server';
import { getEngine, getOpsActorContext, errorResponse, hasRequiredRole } from '@/lib/engine';

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

    if (body.status) {
      const engine = getEngine();
      const result = await engine.platform.updateDriverGovernance(
        id,
        body.status,
        actor,
        body.reason
      );

      if (!result.success) {
        return errorResponse(
          result.error?.code || 'UPDATE_FAILED',
          result.error?.message || 'Failed to update driver',
          400
        );
      }

      return NextResponse.json({ data: result.data });
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
