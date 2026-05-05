import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getDriverByUserId } from '@ridendine/db';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getDriverAppPlatformRole } from '@/lib/platform-access';

export async function POST(request: Request) {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.auth,
    namespace: 'driver-auth-login',
    routeKey: 'POST:/api/auth/login',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError || !authData.user) {
      return NextResponse.json(
        { error: authError?.message || 'Invalid credentials' },
        { status: 401 }
      );
    }

    const [driver, platformRole] = await Promise.all([
      getDriverByUserId(supabase, authData.user.id),
      getDriverAppPlatformRole(authData.user.id),
    ]);

    if (platformRole) {
      return NextResponse.json({
        success: true,
        data: {
          user: authData.user,
          driver: driver ?? null,
          platformRole,
          session: authData.session,
        },
      });
    }

    if (!driver) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 403 }
      );
    }

    if (driver.status !== 'approved') {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: 'Driver account is not approved yet' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        user: authData.user,
        driver,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sign in failed' },
      { status: 500 }
    );
  }
}
