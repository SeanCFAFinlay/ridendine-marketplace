import { NextResponse } from 'next/server';
import { getEngine, getOpsActorContext, errorResponse } from '@/lib/engine';

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

    const { id } = await params;
    const body = await request.json();
    const engine = getEngine();

    if (body.driverId) {
      const result = await engine.dispatch.manualAssign(id, body.driverId, actor);
      if (!result.success) {
        return NextResponse.json({ error: result.error?.message || 'Failed to assign driver' }, { status: 400 });
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
