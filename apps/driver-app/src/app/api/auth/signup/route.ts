import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createServerClient,
  createAdminClient,
  getDriverByUserId,
  createDriver,
  type SupabaseClient,
} from '@ridendine/db';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { signupSchema } from '@ridendine/validation';

async function createDriverPresence(adminClient: SupabaseClient, driverId: string) {
  await (adminClient as any)
    .from('driver_presence')
    .insert({ driver_id: driverId, status: 'offline' });
}

async function createAuthUser({
  supabase,
  adminClient,
  firstName,
  lastName,
  email,
  phone,
  password,
}: {
  supabase: SupabaseClient;
  adminClient: SupabaseClient;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const userMetadata = {
    first_name: firstName,
    last_name: lastName,
    phone,
    role: 'driver',
  };

  if (process.env.E2E_FIXTURE_RESET_ENABLED === 'true') {
    const { data, error } = await (adminClient as any).auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });
    return {
      user: data?.user ?? null,
      session: null,
      error,
      requiresEmailConfirmation: false,
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: userMetadata,
    },
  });

  return {
    user: data.user,
    session: data.session,
    error,
    requiresEmailConfirmation: !data.session,
  };
}

export async function POST(request: Request) {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.auth,
    namespace: 'driver-auth-signup',
    routeKey: 'POST:/api/auth/signup',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  try {
    const body = await request.json();
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'All fields are required' },
        { status: 400 }
      );
    }
    const { firstName, lastName, email, password } = parsed.data;
    // Drivers must provide a phone number (optional in the shared signupSchema).
    const phone = parsed.data.phone;
    if (!phone) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }
    // vehicleType is not covered by signupSchema; read it from the raw body.
    const vehicleType =
      typeof (body as { vehicleType?: unknown }).vehicleType === 'string'
        ? ((body as { vehicleType: string }).vehicleType)
        : undefined;

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore) as unknown as SupabaseClient;
    const adminClient = createAdminClient() as unknown as SupabaseClient;

    const authData = await createAuthUser({
      supabase,
      adminClient,
      firstName,
      lastName,
      email,
      phone,
      password,
    });

    if (authData.error) {
      return NextResponse.json({ error: authData.error.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    const existing = await getDriverByUserId(adminClient, authData.user.id);

    if (!existing) {
      const newDriver = await createDriver(adminClient, {
        user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
        // Self-serve driver accounts require ops approval and document review
        // before dispatch readiness clears. Do not grant approved status at
        // signup time.
        status: 'pending',
        vehicle_type: vehicleType ?? null,
        profile_image_url: null,
        rating: null,
        total_deliveries: 0,
        vehicle_description: null,
      });

      await createDriverPresence(adminClient, newDriver.id);
    }

    return NextResponse.json({
      success: true,
      data: {
        user: authData.user,
        requiresEmailConfirmation: authData.requiresEmailConfirmation,
      },
    });
  } catch (error) {
    console.error('Driver signup error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
