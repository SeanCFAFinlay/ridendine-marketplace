import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type ChefProfile = Tables<'chef_profiles'>;
export interface ChefStorefrontGovernanceSummary {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
  is_featured: boolean;
}

export interface ChefProfileWithStorefronts extends ChefProfile {
  chef_storefronts: ChefStorefrontGovernanceSummary[] | null;
}

export interface ChefGovernanceStorefrontDetail extends ChefStorefrontGovernanceSummary {
  average_rating: number | null;
  total_reviews: number | null;
  cuisine_types: string[] | null;
}

export interface ChefGovernanceDetail extends ChefProfile {
  chef_storefronts: ChefGovernanceStorefrontDetail[] | null;
  order_count: number;
  total_revenue: number;
}

type DeliveredOrderTotalRow = {
  total: number | null;
};

export async function getChefByUserId(
  client: SupabaseClient,
  userId: string
): Promise<ChefProfile | null> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getChefById(
  client: SupabaseClient,
  id: string
): Promise<ChefProfile | null> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getChefWithStorefronts(
  client: SupabaseClient,
  id: string
): Promise<ChefProfileWithStorefronts | null> {
  const { data, error } = await client
    .from('chef_profiles')
    .select(`
      *,
      chef_storefronts (
        id,
        name,
        slug,
        is_active,
        is_featured
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as ChefProfileWithStorefronts;
}

export async function getChefGovernanceDetail(
  client: SupabaseClient,
  id: string
): Promise<ChefGovernanceDetail | null> {
  const { data: chef, error } = await client
    .from('chef_profiles')
    .select(`
      *,
      chef_storefronts (
        id,
        name,
        slug,
        is_active,
        is_featured,
        average_rating,
        total_reviews,
        cuisine_types
      )
    `)
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const storefronts = (chef.chef_storefronts ?? []) as ChefGovernanceStorefrontDetail[];
  const storefrontIds = storefronts.map((storefront) => storefront.id);

  if (storefrontIds.length === 0) {
    return {
      ...(chef as unknown as ChefProfile),
      chef_storefronts: storefronts,
      order_count: 0,
      total_revenue: 0,
    };
  }

  const { data: orders, error: ordersError } = await client
    .from('orders')
    .select('total')
    .in('storefront_id', storefrontIds)
    .eq('status', 'delivered');

  if (ordersError) throw ordersError;

  return {
    ...(chef as unknown as ChefProfile),
    chef_storefronts: storefronts,
    order_count: orders?.length ?? 0,
    total_revenue: ((orders ?? []) as DeliveredOrderTotalRow[]).reduce(
      (sum, order) => sum + (order.total ?? 0),
      0
    ),
  };
}

export async function createChefProfile(
  client: SupabaseClient,
  profile: Omit<ChefProfile, 'id' | 'created_at' | 'updated_at'>
): Promise<ChefProfile> {
  const { data, error } = await client
    .from('chef_profiles')
    .insert(profile)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateChefProfile(
  client: SupabaseClient,
  id: string,
  updates: Partial<ChefProfile>
): Promise<ChefProfile> {
  const { data, error } = await client
    .from('chef_profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getPendingChefApprovals(
  client: SupabaseClient
): Promise<ChefProfile[]> {
  const { data, error } = await client
    .from('chef_profiles')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function listChefsWithStorefronts(
  client: SupabaseClient,
  options: { status?: string } = {}
): Promise<ChefProfileWithStorefronts[]> {
  let query = client
    .from('chef_profiles')
    .select(`
      *,
      chef_storefronts (
        id,
        name,
        slug,
        is_active,
        is_featured
      )
    `)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as unknown as ChefProfileWithStorefronts[];
}

export async function approveChef(
  client: SupabaseClient,
  id: string
): Promise<ChefProfile> {
  return updateChefProfile(client, id, { status: 'approved' });
}

export async function rejectChef(
  client: SupabaseClient,
  id: string
): Promise<ChefProfile> {
  return updateChefProfile(client, id, { status: 'rejected' });
}
