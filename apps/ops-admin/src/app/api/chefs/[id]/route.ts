import { NextResponse } from 'next/server';
import { getOpsActorContext, errorResponse, hasRequiredRole, getEngine } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (!hasRequiredRole(actor, ['ops_manager', 'super_admin'])) {
      return errorResponse('FORBIDDEN', 'Not authorized to govern chefs', 403);
    }

    const action = body.action ?? (
      body.status === 'approved'
        ? 'approve'
        : body.status === 'rejected'
          ? 'reject'
          : body.status === 'suspended'
            ? 'suspend'
            : undefined
    );

    const engine = getEngine();

    switch (action) {
      case 'approve': {
        const result = await engine.platform.updateChefGovernance(id, 'approved', actor, body.reason);
        if (!result.success) {
          return errorResponse(result.error!.code, result.error!.message);
        }
        return NextResponse.json({ data: result.data });
      }

      case 'reject': {
        const result = await engine.platform.updateChefGovernance(id, 'rejected', actor, body.reason);
        if (!result.success) {
          return errorResponse(result.error!.code, result.error!.message);
        }
        return NextResponse.json({ data: result.data });
      }

      case 'suspend': {
        const result = await engine.platform.updateChefGovernance(id, 'suspended', actor, body.reason);
        if (!result.success) {
          return errorResponse(result.error!.code, result.error!.message);
        }
        return NextResponse.json({ data: result.data });
      }

      case 'unsuspend': {
        const result = await engine.platform.updateChefGovernance(id, 'approved', actor, body.reason);
        if (!result.success) {
          return errorResponse(result.error!.code, result.error!.message);
        }
        return NextResponse.json({ data: result.data });
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
