import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import {
  createMenuCategory,
  createServerClient,
  getMenuCategoriesByStorefront,
  getStorefrontByChefId,
  type SupabaseClient,
} from '@ridendine/db';

interface ChefProfileRow {
  id: string;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const repositoryClient = supabase as unknown as SupabaseClient;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const typedChefProfile = chefProfile as ChefProfileRow | null;
    if (!typedChefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    const storefront = await getStorefrontByChefId(repositoryClient, typedChefProfile.id);
    if (!storefront) {
      return NextResponse.json({ error: 'Storefront not found' }, { status: 404 });
    }

    const categories = await getMenuCategoriesByStorefront(repositoryClient, storefront.id);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const repositoryClient = supabase as unknown as SupabaseClient;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: chefProfile } = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    const typedChefProfile = chefProfile as ChefProfileRow | null;

    if (!typedChefProfile) {
      return NextResponse.json({ error: 'Chef profile not found' }, { status: 404 });
    }

    const storefront = await getStorefrontByChefId(repositoryClient, typedChefProfile.id);
    if (!storefront) {
      return NextResponse.json({ error: 'Storefront not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, description, sort_order } = body;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const category = await createMenuCategory(repositoryClient, {
        storefront_id: storefront.id,
        name,
        description: description || null,
        sort_order: sort_order !== undefined ? sort_order : 0,
        is_active: true,
      });

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
