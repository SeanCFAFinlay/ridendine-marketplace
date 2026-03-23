import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getStorefrontByChefId, createMenuItem } from '@ridendine/db';

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

    const { data: menuItems }: any = await supabase
      .from('menu_items')
      .select('*')
      .eq('storefront_id', storefront.id)
      .order('sort_order', { ascending: true });

    return NextResponse.json({ menuItems });
  } catch (error) {
    console.error('Error fetching menu items:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
    const { name, description, price, category_id, image_url, is_available, is_featured, sort_order } = body;

    if (!name || price === undefined || !category_id) {
      return NextResponse.json(
        { error: 'Missing required fields: name, price, category_id' },
        { status: 400 }
      );
    }

    const menuItem = await createMenuItem(supabase as any, {
      storefront_id: storefront.id,
      name,
      description: description || null,
      price,
      category_id,
      image_url: image_url || null,
      is_available: is_available !== undefined ? is_available : true,
      is_featured: is_featured !== undefined ? is_featured : false,
      sort_order: sort_order !== undefined ? sort_order : 0,
      dietary_tags: body.dietary_tags || [],
      prep_time_minutes: body.prep_time_minutes || null,
    });

    return NextResponse.json({ menuItem }, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
