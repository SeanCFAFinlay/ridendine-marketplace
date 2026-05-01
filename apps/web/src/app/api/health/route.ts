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

  const [dbProbe, stripeProbe] = await Promise.allSettled([
    adminClient.from('chef_storefronts').select('id').limit(1),
    Promise.resolve(Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET)),
  ]);

  const dbReady =
    dbProbe.status === 'fulfilled' && !dbProbe.value.error;
  const stripeReady = stripeProbe.status === 'fulfilled' ? stripeProbe.value : false;
  const envReady = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );

  const payload = operationalHealthPayload({
    service: 'web',
    dbReady,
    envReady,
    stripeReady,
    rateLimitReady: rateLimitStatus.ready,
    rateLimitProvider: rateLimitStatus.provider,
    rateLimitReason: rateLimitStatus.reason,
    checkoutIdempotencyMigrationApplied:
      process.env.CHECKOUT_IDEMPOTENCY_MIGRATION_APPLIED === 'true',
  });

  const status =
    payload.readiness === 'not_ready' ? 503 : 200;
  return apiSuccess(payload, status);
}
