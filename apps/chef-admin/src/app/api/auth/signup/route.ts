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
import { checkRateLimit, getClientIp, RATE_LIMITS, rateLimitResponse } from '@ridendine/utils';

function getErrorResponse(error: unknown) {
  if (error instanceof Error) {
    return { message: error.message, status: 400 };
  }

  return { message: 'Unable to create chef account', status: 500 };
}

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, RATE_LIMITS.auth, 'auth');
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter!);

  try {
    const body = await request.json();
    const validated = signupSchema.parse(body);

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          first_name: validated.firstName,
          last_name: validated.lastName,
          phone: validated.phone ?? null,
          role: 'chef',
        },
      },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    if (!authData.user) {
      return NextResponse.json({ error: 'Failed to create chef user' }, { status: 500 });
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const existingChef = await getChefByUserId(adminClient, authData.user.id);

    if (!existingChef) {
      await createChefProfile(adminClient, {
        user_id: authData.user.id,
        display_name: `${validated.firstName} ${validated.lastName}`.trim(),
        bio: null,
        profile_image_url: null,
        phone: validated.phone ?? null,
        status: 'pending',
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        user: authData.user,
        requiresEmailConfirmation: !authData.session,
      },
    });
  } catch (error) {
    const { message, status } = getErrorResponse(error);
    return NextResponse.json({ error: message }, { status });
  }
}
