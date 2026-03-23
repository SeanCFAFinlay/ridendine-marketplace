import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getMenuItemById, updateMenuItem, deleteMenuItem, getStorefrontByChefId } from '@ridendine/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const menuItem = await getMenuItemById(supabase as any, params.id);
    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
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
    if (!storefront || storefront.id !== menuItem.storefront_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ menuItem });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const menuItem = await getMenuItemById(supabase as any, params.id);
    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
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
    if (!storefront || storefront.id !== menuItem.storefront_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { name, description, price, is_available, is_featured, image_url, sort_order } = body;

    const updates: any = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (is_available !== undefined) updates.is_available = is_available;
    if (is_featured !== undefined) updates.is_featured = is_featured;
    if (image_url !== undefined) updates.image_url = image_url;
    if (sort_order !== undefined) updates.sort_order = sort_order;

    const updatedMenuItem = await updateMenuItem(supabase as any, params.id, updates);

    return NextResponse.json({ menuItem: updatedMenuItem });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const menuItem = await getMenuItemById(supabase as any, params.id);
    if (!menuItem) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
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
    if (!storefront || storefront.id !== menuItem.storefront_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await deleteMenuItem(supabase as any, params.id);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
