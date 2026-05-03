import { createAdminClient } from '@ridendine/db';
import {
  getOpsActorContext,
  errorResponse,
  guardPlatformApi,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/engine/dispatch/offer-history
 * Last 24h assignment attempts for dispatch console.
 */
export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'dispatch_read');
  if (denied) return denied;

  const client = createAdminClient();
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data: attempts, error } = await client
    .from('assignment_attempts')
    .select(
      'id, delivery_id, driver_id, response, offered_at, responded_at, expires_at, decline_reason, attempt_number'
    )
    .gte('offered_at', since)
    .order('offered_at', { ascending: false })
    .limit(500);

  if (error) {
    return errorResponse('FETCH_ERROR', error.message);
  }

  const rows = attempts ?? [];
  const driverIds = [...new Set(rows.map((r: { driver_id: string }) => r.driver_id))];

  const acceptByDriver = new Map<string, number>();
  const totalByDriver = new Map<string, number>();

  if (driverIds.length) {
    const { data: stats } = await client
      .from('assignment_attempts')
      .select('driver_id, response')
      .in('driver_id', driverIds)
      .gte('offered_at', since);

    for (const row of stats ?? []) {
      const id = (row as { driver_id: string }).driver_id;
      totalByDriver.set(id, (totalByDriver.get(id) ?? 0) + 1);
      if ((row as { response: string }).response === 'accepted') {
        acceptByDriver.set(id, (acceptByDriver.get(id) ?? 0) + 1);
      }
    }
  }

  const enriched = rows.map((row: Record<string, unknown>) => {
    const driverId = row.driver_id as string;
    const accepted = acceptByDriver.get(driverId) ?? 0;
    const total = totalByDriver.get(driverId) ?? 1;
    const responseMs =
      row.responded_at && row.offered_at
        ? new Date(row.responded_at as string).getTime() - new Date(row.offered_at as string).getTime()
        : null;
    return {
      ...row,
      responseTimeMs: responseMs,
      successRate: total > 0 ? accepted / total : 0,
    };
  });

  return successResponse({ attempts: enriched });
}
