import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  createMenuCategory,
  getMenuCategoriesByStorefront,
  type SupabaseClient,
  createAdminClient,
} from '@ridendine/db';
import { getChefActorContext } from '@/lib/engine';

export async function GET() {
  try {
    const context = await getChefActorContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const categories = await getMenuCategoriesByStorefront(adminClient, context.storefrontId);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const context = await getChefActorContext();
    if (!context) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, sort_order } = body;

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const category = await createMenuCategory(adminClient, {
      storefront_id: context.storefrontId,
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
