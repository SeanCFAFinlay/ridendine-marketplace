import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, ['ops_manager', 'super_admin'])) {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const { audience, title, body } = await request.json();

  if (!audience || !title || !body) {
    return NextResponse.json({ error: 'audience, title, and body required' }, { status: 400 });
  }

  const validAudiences = ['all_customers', 'all_chefs', 'all_drivers', 'all_ops'];
  if (!validAudiences.includes(audience)) {
    return NextResponse.json({ error: `Invalid audience. Use: ${validAudiences.join(', ')}` }, { status: 400 });
  }

  const client = createAdminClient() as any;
  let userIds: string[] = [];

  try {
    if (audience === 'all_customers') {
      const { data } = await client.from('customers').select('user_id');
      userIds = (data || []).map((r: any) => r.user_id);
    } else if (audience === 'all_chefs') {
      const { data } = await client.from('chef_profiles').select('user_id');
      userIds = (data || []).map((r: any) => r.user_id);
    } else if (audience === 'all_drivers') {
      const { data } = await client.from('drivers').select('user_id');
      userIds = (data || []).map((r: any) => r.user_id);
    } else if (audience === 'all_ops') {
      const { data } = await client.from('platform_users').select('user_id').eq('is_active', true);
      userIds = (data || []).map((r: any) => r.user_id);
    }

    if (userIds.length === 0) {
      return NextResponse.json({ success: true, data: { sent: 0, audience } });
    }

    // Batch insert notifications (max 100 at a time)
    const notifications = userIds.map(userId => ({
      user_id: userId,
      type: 'announcement',
      title,
      body,
      message: body,
      data: { audience, sentBy: actor.userId, sentAt: new Date().toISOString() },
    }));

    for (let i = 0; i < notifications.length; i += 100) {
      const batch = notifications.slice(i, i + 100);
      await client.from('notifications').insert(batch);
    }

    return NextResponse.json({
      success: true,
      data: { sent: userIds.length, audience },
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to send',
    }, { status: 500 });
  }
}
