import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext, hasRequiredRole } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getOpsActorContext();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const client = createAdminClient() as any;
  const { data, error } = await client
    .from('platform_users')
    .select('id, user_id, email, name, role, is_active, created_at')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, ['super_admin'])) {
    return NextResponse.json({ error: 'Only super admins can manage team' }, { status: 403 });
  }

  const { email, name, role, password } = await request.json();
  if (!email || !name || !role || !password) {
    return NextResponse.json({ error: 'email, name, role, and password required' }, { status: 400 });
  }

  const validRoles = ['ops_agent', 'ops_manager', 'finance_admin', 'super_admin', 'support'];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `Invalid role. Use: ${validRoles.join(', ')}` }, { status: 400 });
  }

  const client = createAdminClient() as any;

  // Create auth user via admin API
  const { data: authData, error: authError } = await client.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name, role },
  });

  if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });

  // Create platform_users record
  const { error: platformError } = await client.from('platform_users').insert({
    user_id: authData.user.id,
    email,
    name,
    role,
    is_active: true,
  });

  if (platformError) {
    return NextResponse.json({ error: platformError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data: { userId: authData.user.id, email, name, role } });
}

export async function PATCH(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor || !hasRequiredRole(actor, ['super_admin'])) {
    return NextResponse.json({ error: 'Only super admins can manage team' }, { status: 403 });
  }

  const { id, role, is_active } = await request.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const client = createAdminClient() as any;
  const update: Record<string, unknown> = {};
  if (role !== undefined) update.role = role;
  if (is_active !== undefined) update.is_active = is_active;

  const { error } = await client.from('platform_users').update(update).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
