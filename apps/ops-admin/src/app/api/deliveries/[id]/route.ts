import { NextResponse } from 'next/server';
import {
  finalizeOpsActor,
  getEngine,
  getOpsActorContext,
  guardPlatformApi,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const actor = await getOpsActorContext();
    const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'deliveries_write'));
    if (opsActor instanceof Response) return opsActor;

    const { id } = await params;
    const body = await request.json();
    const engine = getEngine();

    if (body.driverId) {
      const result = await engine.dispatch.manualAssign(id, body.driverId, opsActor);
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
