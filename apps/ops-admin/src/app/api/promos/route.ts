import type { NextRequest} from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext, guardPlatformApi } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'promos');
  if (denied) return denied;

  const client = createAdminClient() as any;
  const { data, error } = await client
    .from('promo_codes')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function POST(request: NextRequest) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'promos');
  if (denied) return denied;

  const body = await request.json();
  const { code, discountType, discountValue, minOrderAmount, usageLimit, startsAt, expiresAt } = body;

  if (!code || !discountType || !discountValue) {
    return NextResponse.json({ error: 'code, discountType, and discountValue are required' }, { status: 400 });
  }

  const client = createAdminClient() as any;
  const { data, error } = await client
    .from('promo_codes')
    .insert({
      code: code.toUpperCase().trim(),
      discount_type: discountType,
      discount_value: discountValue,
      min_order_amount: minOrderAmount || 0,
      usage_limit: usageLimit || null,
      usage_count: 0,
      starts_at: startsAt || null,
      expires_at: expiresAt || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}

export async function PATCH(request: NextRequest) {
  const actor = await getOpsActorContext();
  const denied = guardPlatformApi(actor, 'promos');
  if (denied) return denied;

  const body = await request.json();
  const { id, is_active } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const client = createAdminClient() as any;
  const { data, error } = await client
    .from('promo_codes')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
