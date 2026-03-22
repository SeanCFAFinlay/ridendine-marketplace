import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type ChefStorefront = Tables<'chef_storefronts'>;

export interface StorefrontWithChef extends ChefStorefront {
  chef_profiles: {
    id: string;
    display_name: string;
    profile_image_url: string | null;
  };
}

export async function getActiveStorefronts(
  client: SupabaseClient,
  options: {
    limit?: number;
    offset?: number;
    cuisineTypes?: string[];
    featured?: boolean;
  } = {}
): Promise<StorefrontWithChef[]> {
  let query = client
    .from('chef_storefronts')
    .select(`
      *,
      chef_profiles (
        id,
        display_name,
        profile_image_url
      )
    `)
    .eq('is_active', true);

  if (options.featured) {
    query = query.eq('is_featured', true);
  }

  if (options.cuisineTypes && options.cuisineTypes.length > 0) {
    query = query.overlaps('cuisine_types', options.cuisineTypes);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  query = query.order('is_featured', { ascending: false })
    .order('average_rating', { ascending: false, nullsFirst: false });

  const { data, error } = await query;

  if (error) throw error;
  return data as unknown as StorefrontWithChef[];
}

export async function getStorefrontBySlug(
  client: SupabaseClient,
  slug: string
): Promise<StorefrontWithChef | null> {
  const { data, error } = await client
    .from('chef_storefronts')
    .select(`
      *,
      chef_profiles (
        id,
        display_name,
        profile_image_url
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as StorefrontWithChef;
}

export async function getStorefrontById(
  client: SupabaseClient,
  id: string
): Promise<ChefStorefront | null> {
  const { data, error } = await client
    .from('chef_storefronts')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getStorefrontByChefId(
  client: SupabaseClient,
  chefId: string
): Promise<ChefStorefront | null> {
  const { data, error } = await client
    .from('chef_storefronts')
    .select('*')
    .eq('chef_id', chefId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createStorefront(
  client: SupabaseClient,
  storefront: Omit<ChefStorefront, 'id' | 'created_at' | 'updated_at' | 'average_rating' | 'total_reviews'>
): Promise<ChefStorefront> {
  const { data, error } = await client
    .from('chef_storefronts')
    .insert(storefront)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateStorefront(
  client: SupabaseClient,
  id: string,
  updates: Partial<ChefStorefront>
): Promise<ChefStorefront> {
  const { data, error } = await client
    .from('chef_storefronts')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function searchStorefronts(
  client: SupabaseClient,
  query: string,
  limit = 20
): Promise<StorefrontWithChef[]> {
  const { data, error } = await client
    .from('chef_storefronts')
    .select(`
      *,
      chef_profiles (
        id,
        display_name,
        profile_image_url
      )
    `)
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
    .limit(limit);

  if (error) throw error;
  return data as unknown as StorefrontWithChef[];
}
