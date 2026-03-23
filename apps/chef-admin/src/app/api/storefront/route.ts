import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getStorefrontByChefId, updateStorefront } from '@ridendine/db';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: chefProfile }: any = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    const storefront = await getStorefrontByChefId(supabase as any, chefProfile.id);
    if (!storefront) {
      return NextResponse.json({ error: 'Storefront not found' }, { status: 404 });
    }

    return NextResponse.json({ storefront });
  } catch (error) {
    console.error('Error fetching storefront:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: chefProfile }: any = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!chefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    const storefront = await getStorefrontByChefId(supabase as any, chefProfile.id);
    if (!storefront) {
      return NextResponse.json({ error: 'Storefront not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      cuisine_types,
      min_order_amount,
      estimated_prep_time_min,
      estimated_prep_time_max,
      is_active,
    } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (cuisine_types !== undefined) updates.cuisine_types = cuisine_types;
    if (min_order_amount !== undefined) updates.min_order_amount = min_order_amount;
    if (estimated_prep_time_min !== undefined) updates.estimated_prep_time_min = estimated_prep_time_min;
    if (estimated_prep_time_max !== undefined) updates.estimated_prep_time_max = estimated_prep_time_max;
    if (is_active !== undefined) updates.is_active = is_active;

    const updatedStorefront = await updateStorefront(supabase as any, storefront.id, updates);

    return NextResponse.json({ storefront: updatedStorefront });
  } catch (error) {
    console.error('Error updating storefront:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
