import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type ChefStorefront = Tables<'chef_storefronts'>;

export interface ChefAvailabilityRow {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

export interface StorefrontWithChef extends ChefStorefront {
  chef_profiles: {
    id: string;
    display_name: string;
    profile_image_url: string | null;
    status: string;
  };
  chef_availability?: ChefAvailabilityRow[];
}

export type StorefrontSortBy = 'rating' | 'newest' | 'popular' | 'fastest' | 'default';

export async function getActiveStorefronts(
  client: SupabaseClient,
  options: {
    limit?: number;
    offset?: number;
    cuisineTypes?: string[];
    featured?: boolean;
    sortBy?: StorefrontSortBy;
  } = {}
): Promise<StorefrontWithChef[]> {
  let query = client
    .from('chef_storefronts')
    .select(`
      *,
      chef_profiles!inner (
        id,
        display_name,
        profile_image_url,
        status
      ),
      chef_availability (
        day_of_week,
        start_time,
        end_time,
        is_available
      )
    `)
    .eq('is_active', true)
    .eq('chef_profiles.status', 'approved');

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

  switch (options.sortBy) {
    case 'newest':
      query = query.order('created_at', { ascending: false });
      break;
    case 'popular':
      query = query.order('total_orders', { ascending: false, nullsFirst: false });
      break;
    case 'fastest':
      query = query
        .order('estimated_prep_time_min', { ascending: true, nullsFirst: false })
        .order('estimated_prep_time_max', { ascending: true, nullsFirst: false });
      break;
    case 'rating':
      query = query.order('average_rating', { ascending: false, nullsFirst: false });
      break;
    default:
      query = query
        .order('is_featured', { ascending: false })
        .order('average_rating', { ascending: false, nullsFirst: false });
      break;
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function getStorefrontBySlug(
  client: SupabaseClient,
  slug: string
): Promise<StorefrontWithChef | null> {
  const { data, error } = await client
    .from('chef_storefronts')
    .select(`
      *,
      chef_profiles!inner (
        id,
        display_name,
        profile_image_url,
        status
      )
    `)
    .eq('slug', slug)
    .eq('is_active', true)
    .eq('chef_profiles.status', 'approved')
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
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
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createStorefront(
  client: SupabaseClient,
  storefront: Partial<ChefStorefront> & Pick<ChefStorefront, 'chef_id' | 'kitchen_id' | 'slug' | 'name'>
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
  updates: Partial<ChefStorefront> & Record<string, unknown>
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
  limit = 20,
  sortBy: StorefrontSortBy = 'default'
): Promise<StorefrontWithChef[]> {
  let q = client
    .from('chef_storefronts')
    .select(`
      *,
      chef_profiles!inner (
        id,
        display_name,
        profile_image_url,
        status
      ),
      chef_availability (
        day_of_week,
        start_time,
        end_time,
        is_available
      )
    `)
    .eq('is_active', true)
    .eq('chef_profiles.status', 'approved')
    .or(`name.ilike.%${query}%,description.ilike.%${query}%,cuisine_types.cs.{"${query}"}`)
    .limit(limit);

  switch (sortBy) {
    case 'newest':
      q = q.order('created_at', { ascending: false });
      break;
    case 'popular':
      q = q.order('total_orders', { ascending: false, nullsFirst: false });
      break;
    case 'fastest':
      q = q
        .order('estimated_prep_time_min', { ascending: true, nullsFirst: false })
        .order('estimated_prep_time_max', { ascending: true, nullsFirst: false });
      break;
    case 'rating':
      q = q.order('average_rating', { ascending: false, nullsFirst: false });
      break;
    default:
      q = q.order('average_rating', { ascending: false, nullsFirst: false });
      break;
  }

  const { data, error } = await q;

  if (error) throw error;
  return data;
}

// ==========================================
// OPS-ADMIN READ MODELS
// ==========================================

/** Exact count of storefronts updated within [start, end] (id projection). */
export async function countStorefrontsUpdatedBetween(
  client: SupabaseClient,
  startIso: string,
  endIso: string
): Promise<number> {
  const { count, error } = await client
    .from('chef_storefronts')
    .select('id', { count: 'exact', head: true })
    .gte('updated_at', startIso)
    .lte('updated_at', endIso);

  if (error) throw error;
  return count ?? 0;
}

/** Exact count of storefronts, optionally filtered by active/paused flags. */
export async function countStorefronts(
  client: SupabaseClient,
  filters: { isActive?: boolean; isPaused?: boolean } = {}
): Promise<number> {
  let query = client
    .from('chef_storefronts')
    .select('*', { count: 'exact', head: true });
  if (filters.isActive !== undefined) query = query.eq('is_active', filters.isActive);
  if (filters.isPaused !== undefined) query = query.eq('is_paused', filters.isPaused);

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

/** `id, name` for the given storefront ids. */
export async function listStorefrontRefs(
  client: SupabaseClient,
  storefrontIds: string[]
): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await client
    .from('chef_storefronts')
    .select('id, name')
    .in('id', storefrontIds as never[]);

  if (error) throw error;
  return (data ?? []) as unknown as Array<{ id: string; name: string }>;
}

/** `id, chef_id` for storefronts owned by the given chefs. */
export async function listStorefrontChefRefs(
  client: SupabaseClient,
  chefIds: string[]
): Promise<Array<{ id: string; chef_id: string }>> {
  const { data, error } = await client
    .from('chef_storefronts')
    .select('id, chef_id')
    .in('chef_id', chefIds as never[]);

  if (error) throw error;
  return (data || []) as unknown as Array<{ id: string; chef_id: string }>;
}

/**
 * Storefront with embedded chef profile + kitchen address for the ops
 * storefront detail view. Returns null when missing.
 */
export async function getStorefrontOpsDetail(
  client: SupabaseClient,
  storefrontId: string
): Promise<Record<string, any> | null> {
  const { data, error } = await client
    .from('chef_storefronts')
    .select(`
      *,
      chef:chef_profiles (
        id, display_name, phone, status
      ),
      kitchen:chef_kitchens (
        address, lat, lng
      )
    `)
    .eq('id', storefrontId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as Record<string, any>;
}

/** State change history for a storefront, newest first. */
export async function listStorefrontStateChanges(
  client: SupabaseClient,
  storefrontId: string,
  limit = 20
): Promise<Record<string, any>[]> {
  const { data, error } = await client
    .from('storefront_state_changes')
    .select('*')
    .eq('storefront_id', storefrontId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as Record<string, any>[];
}

/** Active storefronts with queue/pause state for the ops live board. */
export async function listOpsLiveBoardStorefronts(
  client: SupabaseClient,
  limit = 300
): Promise<Record<string, any>[]> {
  const { data, error } = await client
    .from('chef_storefronts')
    .select(`
          id, name, storefront_state, is_paused,
          current_queue_size, max_queue_size, is_overloaded,
          estimated_prep_time_max, updated_at,
          chef_profiles ( display_name )
        `)
    .eq('is_active', true)
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as unknown as Record<string, any>[];
}
