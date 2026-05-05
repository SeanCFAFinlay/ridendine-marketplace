import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getCurrentCustomer } from '@/lib/auth-helpers';
import { createServerClient } from '@ridendine/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code')?.trim().toUpperCase();
  const subtotalParam = searchParams.get('subtotal');

  if (!code) {
    return NextResponse.json({ success: false, error: 'code is required' }, { status: 400 });
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    await getCurrentCustomer(supabase);
  } catch {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const subtotal = subtotalParam ? parseFloat(subtotalParam) : 0;
  const adminClient = createAdminClient() as any;

  const { data: promo } = await adminClient
    .from('promo_codes')
    .select('id, code, discount_type, discount_value, is_active, expires_at, max_uses, used_count, min_order_amount')
    .eq('code', code)
    .maybeSingle();

  if (!promo) {
    return NextResponse.json({ success: false, error: 'Promo code not found' });
  }

  if (!promo.is_active) {
    return NextResponse.json({ success: false, error: 'This promo code is no longer active' });
  }

  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ success: false, error: 'This promo code has expired' });
  }

  if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
    return NextResponse.json({ success: false, error: 'This promo code has reached its usage limit' });
  }

  if (promo.min_order_amount !== null && subtotal < promo.min_order_amount) {
    const minFormatted = `$${(promo.min_order_amount / 100).toFixed(2)}`;
    return NextResponse.json({
      success: false,
      error: `Minimum order of ${minFormatted} required for this promo`,
    });
  }

  let discount = 0;
  if (promo.discount_type === 'percentage') {
    discount = Math.round(subtotal * (promo.discount_value / 100));
  } else {
    discount = Math.round(promo.discount_value * 100);
  }

  return NextResponse.json({
    success: true,
    data: {
      code: promo.code,
      discountType: promo.discount_type,
      discountValue: promo.discount_value,
      discountAmount: discount / 100,
    },
  });
}
