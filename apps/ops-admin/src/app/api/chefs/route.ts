import { NextResponse } from 'next/server';
import { createAdminClient, listChefsWithStorefronts, type SupabaseClient } from '@ridendine/db';
import { paginationSchema } from '@ridendine/validation';
import { getOpsActorContext, errorResponse, hasRequiredRole } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    const supabase = createAdminClient() as unknown as SupabaseClient;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const { page, limit } = paginationSchema.parse({
      page: searchParams.get('page') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    });

    const { items, total } = await listChefsWithStorefronts(supabase, {
      status: status || undefined,
      page,
      limit,
    });

    const totalPages = Math.ceil(total / limit);
    return NextResponse.json({
      success: true,
      data: { items, total, page, limit, totalPages, hasMore: page < totalPages },
    });
  } catch (error) {
    console.error('GET /api/chefs error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request) {
  try {
    const actor = await getOpsActorContext();
    if (!actor) {
      return errorResponse('UNAUTHORIZED', 'Authentication required', 401);
    }

    if (!hasRequiredRole(actor, ['ops_manager', 'super_admin'])) {
      return errorResponse('FORBIDDEN', 'Not authorized to create chefs', 403);
    }

    return errorResponse(
      'NOT_SUPPORTED',
      'Chef profiles must be created through chef signup, not manually in ops-admin.',
      400
    );
  } catch (error) {
    console.error('Failed to create chef:', error);
    return NextResponse.json(
      { error: 'Failed to create chef' },
      { status: 500 }
    );
  }
}
