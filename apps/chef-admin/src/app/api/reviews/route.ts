// ==========================================
// CHEF-ADMIN REVIEWS API — list the active storefront's reviews.
// Uses the service-role client after the chef guard: chefs have no RLS read
// path to customer names on reviews, and the anon column grant (00049) hides
// order/customer linkage on purpose.
// ==========================================

import {
  createAdminClient,
  listReviewsForStorefront,
  type SupabaseClient,
} from '@ridendine/db';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const admin = createAdminClient() as unknown as SupabaseClient;
    const reviews = await listReviewsForStorefront(admin, chefContext.storefrontId);

    return successResponse({
      reviews: reviews.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        chef_response: r.chef_response,
        chef_responded_at: r.chef_responded_at,
        // First name + last initial only: enough to address the customer.
        customer_name: r.customer?.first_name
          ? `${r.customer.first_name}${r.customer.last_name ? ` ${r.customer.last_name.charAt(0)}.` : ''}`
          : null,
        order_number: r.order?.order_number ?? null,
      })),
    });
  } catch (err) {
    console.error('reviews GET', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to load reviews', 500);
  }
}
