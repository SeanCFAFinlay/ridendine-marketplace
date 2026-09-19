import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createServerClient,
  createAdminClient,
  createChefProfile,
  getChefByUserId,
  type SupabaseClient,
} from '@ridendine/db';
import { signupSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';

function getErrorResponse(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, status: 400 };
  }

  return { message: 'Unable to create chef account', status: 500 };
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
  phone?: string | null;
  password: string;
}) {
  const userMetadata = {
    first_name: firstName,
    last_name: lastName,
    phone: phone ?? null,
    role: 'chef',
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
    namespace: 'chef-auth-signup',
    routeKey: 'POST:/api/auth/signup',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  try {
    const body = await request.json();
    const validated = signupSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore) as SupabaseClient;
    const adminClient = createAdminClient() as unknown as SupabaseClient;

    const authData = await createAuthUser({
      supabase,
      adminClient,
      firstName: validated.firstName,
      lastName: validated.lastName,
      email: validated.email,
      phone: validated.phone ?? null,
      password: validated.password,
    });

    if (authData.error) {
      return NextResponse.json({ error: authData.error.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create chef user' }, { status: 500 });
    }

    const existingChef = await getChefByUserId(adminClient, authData.user.id);

    if (!existingChef) {
      await createChefProfile(adminClient, {
        user_id: authData.user.id,
        display_name: `${validated.firstName} ${validated.lastName}`.trim(),
        bio: null,
        profile_image_url: null,
        phone: validated.phone ?? null,
        // Self-serve chef accounts require ops approval before they can publish
        // or receive customer traffic. Storefronts remain inactive by default,
        // but the profile status must not start as approved.
        status: 'pending',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: authData.user,
        requiresEmailConfirmation: authData.requiresEmailConfirmation,
      },
    });
  } catch (error) {
    const { message, status } = getErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
