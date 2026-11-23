import type { SupabaseClient } from '../client/types';

// ==========================================
// REVIEW REPOSITORY
// ==========================================

/** Exact count of reviews at or below `maxRating` created since `sinceIso`. */
export async function countLowRatingReviewsSince(
  client: SupabaseClient,
  maxRating: number,
  sinceIso: string
): Promise<number> {
  const { count, error } = await client
    .from('reviews')
    .select('*', { count: 'exact', head: true })
    .lte('rating', maxRating)
    .gte('created_at', sinceIso);

  if (error) throw error;
  return count ?? 0;
}

export interface ChefReviewRow {
  id: string;
  storefront_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  chef_response: string | null;
  chef_responded_at: string | null;
  customer: { first_name: string | null; last_name: string | null } | null;
  order: { order_number: string | null } | null;
}

/** Every review for one storefront (incl. hidden), newest first — chef dashboard. */
export async function listReviewsForStorefront(
  client: SupabaseClient,
  storefrontId: string
): Promise<ChefReviewRow[]> {
  const { data, error } = await client
    .from('reviews')
    .select(
      'id, storefront_id, rating, comment, created_at, chef_response, chef_responded_at, customer:customers (first_name, last_name), order:orders (order_number)'
    )
    .eq('storefront_id', storefrontId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as ChefReviewRow[];
}

/** The storefront a review belongs to, or null when the review does not exist. */
export async function getReviewStorefrontId(
  client: SupabaseClient,
  reviewId: string
): Promise<string | null> {
  const { data, error } = await client
    .from('reviews')
    .select('storefront_id')
    .eq('id', reviewId)
    .maybeSingle();

  if (error) throw error;
  return (data as { storefront_id: string } | null)?.storefront_id ?? null;
}

/**
 * Set (or clear, with `null`) the chef's public reply to a review. Scoped by
 * storefront so a caller can never write to another kitchen's review.
 */
export async function setReviewChefResponse(
  client: SupabaseClient,
  reviewId: string,
  storefrontId: string,
  response: string | null
): Promise<{ chef_response: string | null; chef_responded_at: string | null } | null> {
  const { data, error } = await client
    .from('reviews')
    .update({
      chef_response: response,
      chef_responded_at: response ? new Date().toISOString() : null,
    } as never)
    .eq('id', reviewId)
    .eq('storefront_id', storefrontId)
    .select('chef_response, chef_responded_at')
    .maybeSingle();

  if (error) throw error;
  return (data as { chef_response: string | null; chef_responded_at: string | null } | null) ?? null;
}
