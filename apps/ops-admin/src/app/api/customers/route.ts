import { NextResponse } from 'next/server';
import { createAdminClient, listOpsCustomers, type SupabaseClient } from '@ridendine/db';
import { paginationSchema } from '@ridendine/validation';
import { getOpsActorContext, errorResponse, hasRequiredRole } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

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
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }
    if (!hasRequiredRole(actor, ['ops_manager', 'super_admin'])) {
      return errorResponse('FORBIDDEN', 'Customer records must be created through the customer ordering flow.', 403);
    }

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
