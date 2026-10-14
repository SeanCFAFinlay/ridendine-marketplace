import { createAdminClient, getActiveStorefronts, searchStorefronts } from '@ridendine/db';
import { successResponse, errorResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

function publicStorefront(row: any) {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    cuisineTypes: row.cuisine_types ?? [],
    coverImageUrl: row.cover_image_url,
    logoUrl: row.logo_url,
    averageRating: row.average_rating,
    totalReviews: row.total_reviews,
    minOrderAmount: row.min_order_amount,
    estimatedPrepTimeMin: row.estimated_prep_time_min,
    estimatedPrepTimeMax: row.estimated_prep_time_max,
    // chef_storefronts has no `accepting_orders` column — a storefront is taking
    // orders when it is active and not paused.
    acceptingOrders: row.is_active === true && row.is_paused !== true,
    isPaused: row.is_paused === true,
    isFeatured: row.is_featured,
    chef: row.chef_profiles
      ? {
          id: row.chef_profiles.id,
          displayName: row.chef_profiles.display_name,
          profileImageUrl: row.chef_profiles.profile_image_url,
        }
      : null,
    availability: row.chef_availability ?? [],
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || searchParams.get('search'))?.trim();
    const limit = Math.min(Number(searchParams.get('limit') || 20), 50);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);
    const sortBy = (searchParams.get('sortBy') as any) || 'default';
    const cuisineTypes = searchParams.getAll('cuisine');

    const client = createAdminClient();
    const rows = query
      ? await searchStorefronts(client as any, query, limit, sortBy)
      : await getActiveStorefronts(client as any, {
          limit,
          offset,
          sortBy,
          cuisineTypes,
          featured: searchParams.get('featured') === 'true' ? true : undefined,
        });

    return successResponse({ storefronts: rows.map(publicStorefront), pagination: { limit, offset } });
  } catch (error) {
    console.error('Error fetching storefronts:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
