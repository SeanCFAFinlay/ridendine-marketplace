// ==========================================
// CHEF-ADMIN PRODUCTION API — forecast prep tasks
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { forecastSchema } from '@ridendine/validation';
import {
  evaluateRateLimit,
  RATE_LIMIT_POLICIES,
  rateLimitPolicyResponse,
} from '@ridendine/utils';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';
import {
  computePrepPlan,
  type PrepMenuItem,
  type HistoricalOrderForPrep,
} from '@/lib/kitchen';

export const dynamic = 'force-dynamic';

/**
 * POST /api/production/forecast
 * Generate suggested prep tasks for a date from historical same-weekday demand.
 * Items that already have a prep task for that date are skipped (no duplicates).
 */
export async function POST(request: NextRequest) {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const limit = await evaluateRateLimit({
      request,
      policy: RATE_LIMIT_POLICIES.chefWrite,
      namespace: 'chef-production-forecast',
      userId: ctx.actor.userId,
      routeKey: 'POST:/api/production/forecast',
    });
    if (!limit.allowed) return rateLimitPolicyResponse(limit);

    const parsed = forecastSchema.safeParse(await request.json());
    if (!parsed.success) {
      return errorResponse('VALIDATION_ERROR', parsed.error.issues[0]?.message ?? 'Invalid forecast request', 400);
    }
    const { planDate, lookbackWeeks } = parsed.data;
    const storefrontId = ctx.storefrontId ?? ''; // no active brand → matches nothing (empty state)
    const admin = createAdminClient() as unknown as SupabaseClient;

    // Forecast for the plan date's weekday; look back a few weeks of history.
    const planNoon = new Date(`${planDate}T12:00:00Z`);
    const cutoff = new Date(Date.now() - (lookbackWeeks * 7 + 2) * 24 * 60 * 60 * 1000);

    const [menuResult, historyResult, existingResult] = await Promise.all([
      admin
        .from('menu_items')
        .select('id, name, daily_limit, daily_sold, prep_time_minutes, is_available, is_sold_out')
        .eq('storefront_id', storefrontId),
      admin
        .from('orders')
        .select('id, created_at, order_items ( quantity, menu_item:menu_items ( id ) )')
        .eq('storefront_id', storefrontId)
        .in('status', ['delivered', 'completed'])
        .gte('created_at', cutoff.toISOString()),
      admin
        .from('prep_tasks')
        .select('menu_item_id')
        .eq('kitchen_id', ctx.kitchenId)
        .eq('plan_date', planDate),
    ]);

    const menuItems = (menuResult.data ?? []) as PrepMenuItem[];
    const history = (historyResult.data ?? []) as unknown as HistoricalOrderForPrep[];
    const alreadyPlanned = new Set(
      (existingResult.data ?? []).map((r) => r.menu_item_id).filter(Boolean) as string[]
    );

    const plan = computePrepPlan(menuItems, history, planNoon);
    const toCreate = plan.filter((p) => p.suggestedQty > 0 && !alreadyPlanned.has(p.id));

    if (toCreate.length === 0) {
      return successResponse({ created: 0, planDate, message: 'Nothing new to forecast' });
    }

    const rows = toCreate.map((p) => ({
      kitchen_id: ctx.kitchenId,
      menu_item_id: p.id,
      title: p.name,
      target_quantity: p.suggestedQty,
      plan_date: planDate,
      created_by: ctx.actor.userId,
    }));
    const { data: inserted, error } = await admin.from('prep_tasks').insert(rows).select('id');
    if (error) {
      console.error('Forecast insert error:', error);
      return errorResponse('INTERNAL_ERROR', 'Failed to create prep tasks', 500);
    }

    return successResponse({ created: inserted?.length ?? rows.length, planDate }, 201);
  } catch (error) {
    console.error('Error forecasting production:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
