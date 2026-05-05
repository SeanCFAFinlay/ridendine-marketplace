import { NextResponse } from 'next/server';
import {
  createAdminClient,
  createChefProfile,
  listChefsWithStorefronts,
  type SupabaseClient,
} from '@ridendine/db';
import { paginationSchema, signupSchema } from '@ridendine/validation';
import { getOpsActorContext, errorResponse, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'ops_entity_read');
    if (denied) return denied;

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

function normalizeChefStatus(status: unknown): 'pending' | 'approved' {
  return status === 'approved' ? 'approved' : 'pending';
}

export async function POST(request: Request) {
  try {
    const actor = await getOpsActorContext();
    const denied = guardPlatformApi(actor, 'chefs_governance');
    if (denied) return denied;

    const body = await request.json();
    const validated = signupSchema.parse(body);
    const status = normalizeChefStatus((body as Record<string, unknown>).status);

    const supabase = createAdminClient() as unknown as SupabaseClient;
    const { data: authData, error: authError } = await (supabase as any).auth.admin.createUser({
      email: validated.email,
      password: validated.password,
      email_confirm: true,
      user_metadata: {
        first_name: validated.firstName,
        last_name: validated.lastName,
        phone: validated.phone ?? null,
        role: 'chef',
        created_by_ops: true,
        created_by: actor?.userId ?? null,
      },
    });

    if (authError || !authData?.user) {
      return errorResponse('AUTH_CREATE_FAILED', authError?.message || 'Unable to create chef auth user', 400);
    }

    const chef = await createChefProfile(supabase, {
      user_id: authData.user.id,
      display_name: `${validated.firstName} ${validated.lastName}`.trim(),
      bio: null,
      profile_image_url: null,
      phone: validated.phone ?? null,
      status,
    });

    await (supabase as any).from('audit_logs').insert({
      action: 'ops_create',
      actor_type: 'platform_user',
      entity_type: 'chef',
      entity_id: chef.id,
      actor_id: actor?.userId ?? null,
      actor_role: actor?.role ?? null,
      new_data: { status, email: validated.email },
      reason: 'Chef account created from ops-admin',
    });

    return NextResponse.json({ success: true, data: chef });
  } catch (error) {
    console.error('Failed to create chef:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create chef' },
      { status: error instanceof Error && error.name === 'ZodError' ? 400 : 500 }
    );
  }
}
