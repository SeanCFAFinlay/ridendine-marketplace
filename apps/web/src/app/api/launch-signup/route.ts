import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient, addLaunchSignup, type SupabaseClient } from '@ridendine/db';
import { LAUNCH_CONSENT_TEXT, launchSignupSchema } from '@ridendine/validation';
import { evaluateRateLimit, RATE_LIMIT_POLICIES, rateLimitPolicyResponse } from '@ridendine/utils';

/**
 * Public by design: people join the launch list before they have an account.
 * Rate limited by IP. The reply never reveals whether an address was already on
 * the list.
 */
export async function POST(request: NextRequest) {
  const limit = await evaluateRateLimit({
    request,
    policy: RATE_LIMIT_POLICIES.supportWrite,
    namespace: 'web-launch-signup',
    routeKey: 'POST:/api/launch-signup',
  });
  if (!limit.allowed) return rateLimitPolicyResponse(limit);

  const parsed = launchSignupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Enter a valid email address' },
      { status: 400 }
    );
  }

  const { email, source, company } = parsed.data;
  if (company) return NextResponse.json({ success: true });

  try {
    await addLaunchSignup(createAdminClient() as unknown as SupabaseClient, {
      email,
      source,
      consent_text: LAUNCH_CONSENT_TEXT,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log only the database code: messages can contain the address.
    console.error('Launch sign-up failed:', (error as { code?: string })?.code ?? 'unknown');
    return NextResponse.json(
      { success: false, error: 'We could not save that. Please try again.' },
      { status: 500 }
    );
  }
}
