import { NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    let query = supabase
      .from('chef_profiles')
      .select('*, chef_storefronts(name, slug)')
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
    const supabase = createAdminClient();
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

    // Create a new chef profile (storefront is created when chef sets up kitchen)
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

    return NextResponse.json({ data: chef }, { status: 201 });
  } catch (error) {
    console.error('Failed to create chef:', error);
    return NextResponse.json(
      { error: 'Failed to create chef' },
      { status: 500 }
    );
  }
}
