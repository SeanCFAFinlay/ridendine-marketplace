import { NextResponse } from 'next/server';
import { createAdminClient, listOpsDrivers, type SupabaseClient } from '@ridendine/db';
import { paginationSchema } from '@ridendine/validation';
import { getOpsActorContext, errorResponse, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'ops_entity_read');
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const { page, limit } = paginationSchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    const supabase = createAdminClient() as unknown as SupabaseClient;
    const { items, total } = await listOpsDrivers(supabase, {
      status: status || undefined,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({
      success: true,
      data: { items, total, page, limit, totalPages, hasMore: page < totalPages },
    });
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'drivers_governance');
    if (denied) return denied;

    void request;
    return errorResponse(
      'NOT_SUPPORTED',
      'Drivers must originate from the driver onboarding flow. Ops-admin can review and govern real driver records only.',
      400
    );
  } catch {
    return NextResponse.json({ error: 'Failed to create driver' }, { status: 500 });
  }
}
