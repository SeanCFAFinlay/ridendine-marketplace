import { NextResponse } from 'next/server';
import { createAdminClient, listOpsCustomers, type SupabaseClient } from '@ridendine/db';
import { paginationSchema } from '@ridendine/validation';
import { getOpsActorContext, errorResponse, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'ops_entity_read');
    if (denied) return denied;

    const { searchParams } = new URL(request.url);
    const { page, limit } = paginationSchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    const supabase = createAdminClient() as unknown as SupabaseClient;
    const { items, total } = await listOpsCustomers(supabase, { page, limit });

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
    const denied = guardPlatformApi(actor, 'customers_write');
    if (denied) return denied;

    void request;
    return errorResponse(
      'NOT_SUPPORTED',
      'Customers must originate from the customer app. Ops-admin can oversee and support real customer records only.',
      400
    );
  } catch {
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
