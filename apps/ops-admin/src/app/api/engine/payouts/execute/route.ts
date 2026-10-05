import type { NextRequest } from 'next/server';
import { AuditAction } from '@ridendine/types';
import {
  createAdminClient,
  getProcessingPayoutRun,
  reclaimStalePayoutRun,
  PAYOUT_RUN_STALE_MS,
  type SupabaseClient,
} from '@ridendine/db';
import { bankPayoutCommandSchema } from '@ridendine/validation';
import { getEngine, getOpsActorContext, guardPlatformApi, successResponse, errorResponse, finalizeOpsActor } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_payouts'));
  if (opsActor instanceof Response) return opsActor;

  let body: { type?: string; periodStart?: string; periodEnd?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('INVALID_JSON', 'Expected JSON body', 400);
  }

  if (!body.periodStart || !body.periodEnd) {
    return errorResponse('INVALID_INPUT', 'periodStart and periodEnd required', 400);
  }

  const runType = body.type === 'driver' ? 'driver' : 'chef';

  // Validate against the shared payout-run command schema (execute_chef_run /
  // execute_driver_run variants) so period bounds must be ISO datetimes.
  const parsed = bankPayoutCommandSchema.safeParse({
    action: runType === 'driver' ? 'execute_driver_run' : 'execute_chef_run',
    periodStart: body.periodStart,
    periodEnd: body.periodEnd,
  });
  if (!parsed.success) {
    return errorResponse(
      'INVALID_INPUT',
      parsed.error.issues[0]?.message || 'Invalid payout run payload',
      400
    );
  }

  // C.5 / O2 — refuse to start a second concurrent run for this rail.
  // The migration 00032 partial unique index is the ironclad guard; this is
  // the friendly 409 the UI can show instead of a generic DB error.
  const adminClient = createAdminClient() as unknown as SupabaseClient;
  const inProgress = await getProcessingPayoutRun(adminClient, runType);
  if (inProgress) {
    // A run left in 'processing' by a crashed or timed-out invocation blocks
    // EVERY future run of this type via the partial unique index. Reclaim it if
    // it is older than the staleness window; a genuinely live run is untouched.
    const claimedAt = inProgress.updated_at ?? inProgress.created_at ?? null;
    const isStale =
      claimedAt !== null && Date.now() - new Date(claimedAt).getTime() > PAYOUT_RUN_STALE_MS;

    const reclaimed = isStale ? await reclaimStalePayoutRun(adminClient, runType) : null;

    if (!reclaimed) {
      return errorResponse(
        'PAYOUT_RUN_IN_PROGRESS',
        `A ${runType} payout run is already processing (id=${inProgress.id}). Wait for it to finish before triggering another.`,
        409
      );
    }

    await getEngine().audit.log({
      action: 'override',
      entityType: 'payout_run',
      entityId: reclaimed.id,
      actor: opsActor,
      metadata: {
        code: 'STALE_PAYOUT_RUN_RECLAIMED',
        runType,
        claimedAt,
        staleMs: PAYOUT_RUN_STALE_MS,
      },
    });
  }

  const engine = getEngine();
  const result =
    runType === 'driver'
      ? await engine.payoutAutomation.executeDriverRun({
          periodStart: body.periodStart,
          periodEnd: body.periodEnd,
          actor: opsActor,
        })
      : await engine.payoutAutomation.executeChefRun({
          periodStart: body.periodStart,
          periodEnd: body.periodEnd,
          actor: opsActor,
        });

  await engine.audit.log({
    action: AuditAction.PAYOUT,
    entityType: 'payout_run',
    entityId: result.runId || '00000000-0000-0000-0000-000000000000',
    actor: opsActor,
    afterState: {
      periodStart: body.periodStart,
      periodEnd: body.periodEnd,
      type: body.type,
      processed: result.processed,
      errors: result.errors,
    },
  });

  if (result.errors.length > 0 && result.processed === 0) {
    return errorResponse('PAYOUT_FAILED', result.errors.join('; '), 500);
  }

  return successResponse(result);
}
