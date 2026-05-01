import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { finalizeOpsActor, getOpsActorContext, guardPlatformApi } from '@/lib/engine';

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

  const { action, message } = await request.json();
  const client = createAdminClient() as any;

  if (action === 'activate') {
    // Pause all active storefronts
    const { data: activeStorefronts } = await client
      .from('chef_storefronts')
      .select('id')
      .eq('is_active', true)
      .eq('is_paused', false);

    for (const sf of activeStorefronts || []) {
      await client.from('chef_storefronts').update({
        is_paused: true,
        paused_reason: `Maintenance mode: ${message || 'Platform maintenance'}`,
        paused_at: new Date().toISOString(),
        paused_by: opsActor.userId,
      }).eq('id', sf.id);
    }

    // Store maintenance state
    await client.from('platform_settings').update({
      setting_value: {
        maintenance_mode: true,
        maintenance_message: message || 'Platform is under maintenance',
        maintenance_activated_at: new Date().toISOString(),
        maintenance_activated_by: opsActor.userId,
        paused_storefront_ids: (activeStorefronts || []).map((s: any) => s.id),
      },
    }).not('id', 'is', null);

    // Create system alert
    await (client as any).from('system_alerts').insert({
      alert_type: 'maintenance_mode',
      severity: 'warning',
      title: 'Maintenance Mode Activated',
      message: `Platform maintenance activated by ops. ${(activeStorefronts || []).length} storefronts paused.`,
      metadata: { activatedBy: opsActor.userId, storefrontsPaused: (activeStorefronts || []).length },
    });

    return NextResponse.json({
      success: true,
      data: { storefrontsPaused: (activeStorefronts || []).length },
    });

  } else if (action === 'deactivate') {
    // Get the list of storefronts that were paused by maintenance
    const { data: settings } = await client.from('platform_settings').select('setting_value').limit(1).single();
    const pausedIds = settings?.setting_value?.paused_storefront_ids || [];

    // Unpause only storefronts that were paused by maintenance (not manually paused)
    let restored = 0;
    for (const id of pausedIds) {
      const { data: sf } = await client.from('chef_storefronts')
        .select('id, paused_reason')
        .eq('id', id)
        .single();

      if (sf?.paused_reason?.startsWith('Maintenance mode:')) {
        await client.from('chef_storefronts').update({
          is_paused: false,
          paused_reason: null,
          paused_at: null,
          paused_by: null,
        }).eq('id', id);
        restored++;
      }
    }

    // Clear maintenance state
    await client.from('platform_settings').update({
      setting_value: { maintenance_mode: false },
    }).not('id', 'is', null);

    await (client as any).from('system_alerts').insert({
      alert_type: 'maintenance_mode',
      severity: 'info',
      title: 'Maintenance Mode Deactivated',
      message: `Platform maintenance ended. ${restored} storefronts restored.`,
    });

    return NextResponse.json({ success: true, data: { storefrontsRestored: restored } });
  }

  return NextResponse.json({ error: 'Invalid action. Use activate or deactivate' }, { status: 400 });
}
