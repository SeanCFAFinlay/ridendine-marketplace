// ==========================================
// CHEF SERVICE - Chef & Storefront Logic
// ==========================================

import type { SupabaseClient } from '@ridendine/db';

// Types
export interface ChefStorefront {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  cuisineTypes: string[];
  averageRating: number | null;
  totalReviews: number;
  estimatedPrepTimeMin: number;
  estimatedPrepTimeMax: number;
  minOrderAmount: number;
  coverImageUrl: string | null;
  logoUrl: string | null;
  isActive: boolean;
  chef: {
    id: string;
    displayName: string;
    profileImageUrl: string | null;
  };
}

export interface ChefStats {
  activeChefs: number;
  pendingApprovals: number;
  totalStorefronts: number;
}

// Get active storefronts for customer browsing
export async function getActiveStorefronts(
  client: SupabaseClient,
  options: {
    limit?: number;
    cuisineType?: string;
    minRating?: number;
    searchTerm?: string;
  } = {}
) {
  let query = client
    .from('chef_storefronts')
    .select(
      `
      *,
      chef_profiles (
        id,
        display_name,
        profile_image_url
      )
    `
    )
    .eq('is_active', true)
    .order('is_featured', { ascending: false })
    .order('average_rating', { ascending: false, nullsFirst: false });

  if (options.cuisineType) {
    query = query.contains('cuisine_types', [options.cuisineType]);
  }

  if (options.minRating) {
    query = query.gte('average_rating', options.minRating);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

// Get storefront by slug
export async function getStorefrontBySlug(
  client: SupabaseClient,
  slug: string
): Promise<ChefStorefront | null> {
  const { data, error } = await client
    .from('chef_storefronts')
    .select(
      `
      *,
      chef_profiles (
        id,
        display_name,
        profile_image_url
      )
    `
    )
    .eq('slug', slug)
    .eq('is_active', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  if (!data) return null;

  return {
    id: data.id,
    slug: data.slug,
    name: data.name,
    description: data.description,
    cuisineTypes: data.cuisine_types || [],
    averageRating: data.average_rating,
    totalReviews: data.total_reviews || 0,
    estimatedPrepTimeMin: data.estimated_prep_time_min || 15,
    estimatedPrepTimeMax: data.estimated_prep_time_max || 45,
    minOrderAmount: data.min_order_amount || 0,
    coverImageUrl: data.cover_image_url,
    logoUrl: data.logo_url,
    isActive: data.is_active,
    chef: {
      id: (data.chef_profiles as any)?.id || '',
      displayName: (data.chef_profiles as any)?.display_name || 'Chef',
      profileImageUrl: (data.chef_profiles as any)?.profile_image_url || null,
    },
  };
}

// Get pending chef approvals
export async function getPendingChefApprovals(client: SupabaseClient) {
  const { data, error } = await client
    .from('chef_profiles')
    .select(
      `
      *,
      chef_storefronts (
        id,
        name,
        slug
      )
    `
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

// Approve chef
export async function approveChef(
  client: SupabaseClient,
  chefId: string
): Promise<{ success: boolean; error?: string }> {
  const { error: profileError } = await client
    .from('chef_profiles')
    .update({ status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', chefId);

  if (profileError) {
    return { success: false, error: profileError.message };
  }

  // Activate their storefront
  const { error: storefrontError } = await client
    .from('chef_storefronts')
    .update({ is_active: true, updated_at: new Date().toISOString() })
    .eq('chef_id', chefId);

  if (storefrontError) {
    return { success: false, error: storefrontError.message };
  }

  return { success: true };
}

// Reject chef
export async function rejectChef(
  client: SupabaseClient,
  chefId: string,
  reason?: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await client
    .from('chef_profiles')
    .update({
      status: 'rejected',
      updated_at: new Date().toISOString(),
    })
    .eq('id', chefId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

// Get chef statistics for admin dashboard
export async function getChefStats(client: SupabaseClient): Promise<ChefStats> {
  const [activeResult, pendingResult, storefrontsResult] = await Promise.all([
    client
      .from('chef_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved'),
    client
      .from('chef_profiles')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending'),
    client
      .from('chef_storefronts')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true),
  ]);

  return {
    activeChefs: activeResult.count ?? 0,
    pendingApprovals: pendingResult.count ?? 0,
    totalStorefronts: storefrontsResult.count ?? 0,
  };
}

// Get menu items for a storefront
export async function getMenuItemsByStorefront(
  client: SupabaseClient,
  storefrontId: string
) {
  const { data, error } = await client
    .from('menu_items')
    .select(
      `
      *,
      menu_categories (
        id,
        name,
        sort_order
      )
    `
    )
    .eq('storefront_id', storefrontId)
    .eq('is_available', true)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data ?? [];
}
