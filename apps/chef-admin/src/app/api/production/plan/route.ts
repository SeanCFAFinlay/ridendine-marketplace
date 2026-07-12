// ==========================================
// CHEF-ADMIN PRODUCTION API — today's / tomorrow's plan
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { prepTaskProgress } from '@ridendine/engine';
import { getOperatorKitchenContext, errorResponse, successResponse } from '@/lib/engine';
import { kitchenDateKey } from '@/lib/kitchen';

export const dynamic = 'force-dynamic';

/**
 * GET /api/production/plan
 * Persistent prep tasks + open batches for today and tomorrow (kitchen tz), so
 * prep progress survives refresh and is shared across devices.
 */
export async function GET() {
  try {
    const ctx = await getOperatorKitchenContext();
    if (!ctx) return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);

    const today = kitchenDateKey(new Date());
    const tomorrow = kitchenDateKey(new Date(Date.now() + 24 * 60 * 60 * 1000));
    const admin = createAdminClient() as unknown as SupabaseClient;

    const [tasksResult, batchesResult] = await Promise.all([
      admin
        .from('prep_tasks')
        .select('*')
        .eq('kitchen_id', ctx.kitchenId)
        .in('plan_date', [today, tomorrow])
        .order('created_at', { ascending: true }),
      admin
        .from('production_batches')
        .select('*')
        .eq('kitchen_id', ctx.kitchenId)
        .in('status', ['planned', 'in_progress'])
        .order('created_at', { ascending: true }),
    ]);

    const tasks = tasksResult.data ?? [];
    const todayTasks = tasks.filter((t) => t.plan_date === today);
    const tomorrowTasks = tasks.filter((t) => t.plan_date === tomorrow);

    return successResponse({
      today,
      tomorrow,
      todayTasks,
      tomorrowTasks,
      todayProgress: prepTaskProgress(todayTasks),
      tomorrowProgress: prepTaskProgress(tomorrowTasks),
      openBatches: batchesResult.data ?? [],
    });
  } catch (error) {
    console.error('Error loading production plan:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
