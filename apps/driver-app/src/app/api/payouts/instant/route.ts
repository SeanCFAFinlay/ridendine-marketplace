import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { createCentralEngine } from '@ridendine/engine';
import { getDriverActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const ctx = await getDriverActorContext({ requireApproved: true });
    if (!ctx) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated or driver not approved', 401);
    }

    const db = createAdminClient();

    const { data: row } = await db
      .from('drivers')
      .select('instant_payouts_enabled')
      .eq('id', ctx.driverId)
      .single();

    const instantOn = Boolean((row as { instant_payouts_enabled?: boolean } | null)?.instant_payouts_enabled);
    if (!instantOn) {
      return errorResponse('DISABLED', 'Enable instant payouts in Settings first', 400);
    }

    let body: { amountCents?: number };
    try {
      body = (await request.json()) as { amountCents?: number };
    } catch {
      return errorResponse('INVALID_JSON', 'Expected JSON body', 400);
    }

    const amountCents = Math.floor(Number(body.amountCents));
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      return errorResponse('INVALID_AMOUNT', 'amountCents must be a positive integer', 400);
    }

    const { data: acct } = await (db as import('@supabase/supabase-js').SupabaseClient & { from: (t: string) => import('@supabase/supabase-js').SupabaseClient['from'] })
      .from('platform_accounts' as never)
      .select('balance_cents, currency')
      .eq('account_type', 'driver_payable')
      .eq('owner_id', ctx.driverId)
      .maybeSingle();

    const bal = Number((acct as { balance_cents?: number } | null)?.balance_cents ?? 0);
    if (amountCents > bal) {
      return errorResponse('INSUFFICIENT_BALANCE', 'Amount exceeds available payable balance', 400);
    }

    const currency = (acct as { currency?: string } | null)?.currency || 'CAD';
    const engine = createCentralEngine(db);
    const created = await engine.payoutAutomation.requestInstantPayout({
      driverId: ctx.driverId,
      amountCents,
      currency,
    });

    if (created.error) {
      return errorResponse('REQUEST_FAILED', created.error, 400);
    }

    return successResponse({
      requestId: created.requestId,
      feeCents: created.feeCents,
      amountCents,
      currency,
    });
  } catch (error) {
    console.error('[driver-app][instant-payout]', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
