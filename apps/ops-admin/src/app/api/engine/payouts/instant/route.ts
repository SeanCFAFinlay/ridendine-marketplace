import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext, guardPlatformApi, successResponse, finalizeOpsActor } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_payouts'));
  if (opsActor instanceof Response) return opsActor;

  const client = createAdminClient();
  const { data, error } = await client
    .from('instant_payout_requests')
    .select('id, driver_id, amount_cents, fee_cents, status, requested_at, executed_at, failure_reason')
    .order('requested_at', { ascending: false })
    .limit(100);

  if (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }

  return successResponse({ queue: data ?? [] });
}
