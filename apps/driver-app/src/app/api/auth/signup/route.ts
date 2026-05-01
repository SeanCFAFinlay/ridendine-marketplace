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

function validateDriverSignupBody(body: Record<string, unknown>) {
  const { firstName, lastName, email, phone, password } = body;
  if (!firstName || !lastName || !email || !phone || !password) {
    return 'All fields are required';
  }
  if (typeof password === 'string' && password.length < 8) {
    return 'Password must be at least 8 characters';
  }
  return null;
}

async function createDriverPresence(adminClient: SupabaseClient, driverId: string) {
  await (adminClient as any)
    .from('driver_presence')
    .insert({ driver_id: driverId, status: 'offline' });
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
    const validationError = validateDriverSignupBody(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { firstName, lastName, email, phone, password, vehicleType } = body as {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      password: string;
      vehicleType?: string;
    };

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          phone,
          role: 'driver',
        },
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const existing = await getDriverByUserId(adminClient, authData.user.id);

    if (!existing) {
      const newDriver = await createDriver(adminClient, {
        user_id: authData.user.id,
        first_name: firstName,
        last_name: lastName,
        phone,
        email,
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
        requiresApproval: true,
        message: 'Account created! Your application is pending approval.',
      },
    });
  } catch (error) {
    console.error('Driver signup error:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}
