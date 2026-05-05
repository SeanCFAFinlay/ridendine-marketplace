import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { finalizeOpsActor, getEngine, getOpsActorContext, guardPlatformApi } from '@/lib/engine';
import { maintenanceCommandSchema } from '@ridendine/validation';
import { operationResultResponse, parseJsonBody } from '@/lib/validation';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'engine_maintenance');
  if (denied) return denied;

  const client = createAdminClient() as any;

  // Check if maintenance mode is active (stored in platform_settings)
  const { data: settings } = await client.from('platform_settings').select('*').limit(1).single();

  // Count active storefronts
  const { count: activeCount } = await client.from('chef_storefronts').select('*', { count: 'exact', head: true }).eq('is_active', true).eq('is_paused', false);
  const { count: pausedCount } = await client.from('chef_storefronts').select('*', { count: 'exact', head: true }).eq('is_paused', true);
  const { count: totalCount } = await client.from('chef_storefronts').select('*', { count: 'exact', head: true });

  return NextResponse.json({
    success: true,
    data: {
      maintenanceMode: settings?.setting_value?.maintenance_mode === true,
      maintenanceMessage: settings?.setting_value?.maintenance_message || '',
      activatedAt: settings?.setting_value?.maintenance_activated_at || null,
      activatedBy: settings?.setting_value?.maintenance_activated_by || null,
      storefronts: { active: activeCount || 0, paused: pausedCount || 0, total: totalCount || 0 },
    },
  });
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const opsActor = finalizeOpsActor(actor, guardPlatformApi(actor, 'engine_maintenance'));
  if (opsActor instanceof Response) return opsActor;

  const actionInput = await parseJsonBody(request, maintenanceCommandSchema);
  if (actionInput instanceof Response) return actionInput;
  const result = await getEngine().operations.execute(actionInput, opsActor);
  return operationResultResponse(result);
}
