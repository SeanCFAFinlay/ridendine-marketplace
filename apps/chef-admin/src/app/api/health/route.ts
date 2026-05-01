import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import {
  apiSuccess,
  getRateLimitProviderStatus,
  operationalHealthPayload,
} from '@ridendine/utils';

export const dynamic = 'force-dynamic';

export async function GET() {
  const adminClient = createAdminClient() as unknown as SupabaseClient;
  const rateLimitStatus = getRateLimitProviderStatus();
  const dbProbe = await adminClient.from('chefs').select('id').limit(1);
  const envReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const payload = operationalHealthPayload({
    service: 'chef-admin',
    dbReady: !dbProbe.error,
    envReady,
    stripeReady: null,
    rateLimitReady: rateLimitStatus.ready,
    rateLimitProvider: rateLimitStatus.provider,
    rateLimitReason: rateLimitStatus.reason,
  });

  return apiSuccess(payload, payload.readiness === 'not_ready' ? 503 : 200);
}
