import type { NextRequest } from 'next/server';
import { getEngine, getOpsActorContext, guardPlatformApi, successResponse, errorResponse, finalizeOpsActor } from '@/lib/engine';
import { createAdminClient } from '@ridendine/db';
import { AuditAction } from '@ridendine/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_engine'));
  if (opsActor instanceof Response) return opsActor;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? undefined;
  const client = createAdminClient();
  let query = client.from('stripe_reconciliation').select('*').order('created_at', { ascending: false }).limit(200);
  if (status) query = query.eq('status', status);
  const { data, error } = await query;

  if (error) return errorResponse('QUERY_FAILED', error.message, 500);
  return successResponse({ rows: data ?? [] });
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'finance_engine'));
  if (opsActor instanceof Response) return opsActor;

  let body: { action?: string; date?: string; reconId?: string; notes?: string; ledgerEntryIds?: string[] };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse('INVALID_JSON', 'Expected JSON', 400);
  }

  const engine = getEngine();

  if (body.action === 'run_daily' && body.date) {
    const summary = await engine.reconciliation.runDaily(body.date);
    await engine.audit.log({
      action: AuditAction.UPDATE,
      entityType: 'stripe_reconciliation',
      entityId: '00000000-0000-0000-0000-000000000001',
      actor: opsActor,
      afterState: { ...summary, date: body.date } as unknown as Record<string, unknown>,
    });
    return successResponse(summary);
  }

  if (body.action === 'resolve_manual' && body.reconId && body.notes) {
    const r = await engine.reconciliation.resolveManual({
      reconId: body.reconId,
      actor: opsActor,
      notes: body.notes,
      ledgerEntryIds: body.ledgerEntryIds,
    });
    if (!r.ok) return errorResponse('RESOLVE_FAILED', r.error ?? 'failed', 400);
    return successResponse({ resolved: true });
  }

  return errorResponse('INVALID_ACTION', 'Use run_daily or resolve_manual', 400);
}
