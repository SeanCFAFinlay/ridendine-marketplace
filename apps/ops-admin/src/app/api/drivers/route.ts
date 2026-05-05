import { NextResponse } from 'next/server';
import { createAdminClient, createDriver, listOpsDrivers, type SupabaseClient } from '@ridendine/db';
import { createDriverProfileSchema, paginationSchema, signupSchema } from '@ridendine/validation';
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

    const body = await request.json();
    const authInput = signupSchema.parse(body);
    const profileInput = createDriverProfileSchema.parse({
      firstName: authInput.firstName,
      lastName: authInput.lastName,
      phone: authInput.phone,
      email: authInput.email,
      profileImageUrl: null,
    });
    const rawStatus = (body as Record<string, unknown>).status;
    const status = rawStatus === 'approved' ? 'approved' : 'pending';
    const rawVehicleType = (body as Record<string, unknown>).vehicleType;
    const vehicleType = typeof rawVehicleType === 'string' && rawVehicleType.length > 0 ? rawVehicleType : null;

    const supabase = createAdminClient() as unknown as SupabaseClient;
    const { data: authData, error: authError } = await (supabase as any).auth.admin.createUser({
      email: authInput.email,
      password: authInput.password,
      email_confirm: true,
      user_metadata: {
        first_name: authInput.firstName,
        last_name: authInput.lastName,
        phone: authInput.phone ?? null,
        role: 'driver',
        created_by_ops: true,
        created_by: actor?.userId ?? null,
      },
    });

    if (authError || !authData?.user) {
      return errorResponse('AUTH_CREATE_FAILED', authError?.message || 'Unable to create driver auth user', 400);
    }

    const driver = await createDriver(supabase, {
      user_id: authData.user.id,
      first_name: profileInput.firstName,
      last_name: profileInput.lastName,
      phone: profileInput.phone,
      email: profileInput.email,
      status,
      vehicle_type: vehicleType,
      profile_image_url: null,
      rating: null,
      total_deliveries: 0,
      vehicle_description: null,
    });

    await (supabase as any).from('driver_presence').insert({ driver_id: driver.id, status: 'offline' });
    await (supabase as any).from('audit_logs').insert({
      action: 'ops_create',
      actor_type: 'platform_user',
      entity_type: 'driver',
      entity_id: driver.id,
      actor_id: actor?.userId ?? null,
      actor_role: actor?.role ?? null,
      new_data: { status, email: authInput.email, vehicleType },
      reason: 'Driver account created from ops-admin',
    });

    return NextResponse.json({ success: true, data: driver });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create driver' },
      { status: error instanceof Error && error.name === 'ZodError' ? 400 : 500 }
    );
  }
}
