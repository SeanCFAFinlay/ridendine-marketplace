import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, createChefProfile } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('chef_profiles')
      .select('*, chef_storefronts(name, status)')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const body = await request.json();

    const { display_name, phone, bio, status = 'pending' } = body;

    if (!display_name) {
      return NextResponse.json(
        { error: 'Display name is required' },
        { status: 400 }
      );
    }

    // Generate a placeholder user_id for ops-admin created chefs
    const placeholderUserId = `ops-created-${Date.now()}`;

    // Create a new chef profile
    const { data: chef, error: chefError } = await supabase
      .from('chef_profiles')
      .insert({
        user_id: placeholderUserId,
        display_name,
        phone: phone || null,
        bio: bio || null,
        status,
        profile_image_url: null,
      })
      .select()
      .single();

    if (chefError) {
      console.error('Failed to create chef:', chefError);
      return NextResponse.json(
        { error: chefError.message },
        { status: 500 }
      );
    }

    // Create associated storefront
    const slug = display_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { error: storefrontError } = await supabase
      .from('chef_storefronts')
      .insert({
        chef_id: chef.id,
        name: display_name,
        slug: `${slug}-${Date.now()}`,
        status: 'draft',
        description: bio || null,
        cuisine_types: [],
        rating_avg: 0,
        rating_count: 0,
        min_order_amount: 0,
        prep_time_min: 30,
        delivery_radius_km: 10,
      });

    if (storefrontError) {
      console.error('Failed to create storefront:', storefrontError);
    }

    return NextResponse.json({ data: chef }, { status: 201 });
  } catch (error) {
    console.error('Failed to create chef:', error);
    return NextResponse.json(
      { error: 'Failed to create chef' },
      { status: 500 }
    );
  }
}
