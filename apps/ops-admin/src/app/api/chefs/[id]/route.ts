import { NextResponse } from 'next/server';
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
    const { id } = await params;
    const body = await request.json();
    const actor = await getOpsActorContext();
    const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'chefs_governance'));
    if (opsActor instanceof Response) return opsActor;

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
        const result = await engine.platform.updateChefGovernance(id, 'approved', opsActor, body.reason);
        if (!result.success) {
          return errorResponse(result.error!.code, result.error!.message);
        }
        return NextResponse.json({ data: result.data });
      }

      case 'reject': {
        const result = await engine.platform.updateChefGovernance(id, 'rejected', opsActor, body.reason);
        if (!result.success) {
          return errorResponse(result.error!.code, result.error!.message);
        }
        return NextResponse.json({ data: result.data });
      }

      case 'suspend': {
        const result = await engine.platform.updateChefGovernance(id, 'suspended', opsActor, body.reason);
        if (!result.success) {
          return errorResponse(result.error!.code, result.error!.message);
        }
        return NextResponse.json({ data: result.data });
      }

      case 'unsuspend': {
        const result = await engine.platform.updateChefGovernance(id, 'approved', opsActor, body.reason);
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
