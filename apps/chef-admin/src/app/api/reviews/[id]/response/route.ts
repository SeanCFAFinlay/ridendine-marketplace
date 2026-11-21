// ==========================================
// CHEF-ADMIN REVIEW RESPONSE API — the chef's public reply to a review.
//   PUT    { response: string }  → create or edit the reply
//   DELETE                       → remove the reply
// There is no RLS UPDATE policy on `reviews`, so the write goes through the
// service-role client, gated by the chef guard and a storefront ownership check.
// ==========================================

import type { NextRequest } from 'next/server';
import {
  createAdminClient,
  getReviewStorefrontId,
  setReviewChefResponse,
  type SupabaseClient,
} from '@ridendine/db';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

const MAX_REVIEW_RESPONSE_LENGTH = 1000;

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function authorize(reviewId: string) {
  const chefContext = await getChefActorContext();
  if (!chefContext) {
    return { error: errorResponse('UNAUTHORIZED', 'Not authenticated', 401) } as const;
  }
  const admin = createAdminClient() as unknown as SupabaseClient;
  const storefrontId = await getReviewStorefrontId(admin, reviewId);
  // Same 404 for "missing" and "not yours" so review ids cannot be probed.
  if (!storefrontId || storefrontId !== chefContext.storefrontId) {
    return { error: errorResponse('NOT_FOUND', 'Review not found', 404) } as const;
  }
  return { admin, storefrontId } as const;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => null)) as { response?: unknown } | null;
    const response = typeof body?.response === 'string' ? body.response.trim() : '';
    if (!response) {
      return errorResponse('VALIDATION_ERROR', 'Response text is required', 400);
    }
    if (response.length > MAX_REVIEW_RESPONSE_LENGTH) {
      return errorResponse(
        'VALIDATION_ERROR',
        `Response must be ${MAX_REVIEW_RESPONSE_LENGTH} characters or fewer`,
        400
      );
    }

    const auth = await authorize(id);
    if ('error' in auth) return auth.error;

    const saved = await setReviewChefResponse(auth.admin, id, auth.storefrontId, response);
    if (!saved) return errorResponse('NOT_FOUND', 'Review not found', 404);
    return successResponse(saved);
  } catch (err) {
    console.error('review response PUT', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to save response', 500);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const auth = await authorize(id);
    if ('error' in auth) return auth.error;

    const saved = await setReviewChefResponse(auth.admin, id, auth.storefrontId, null);
    if (!saved) return errorResponse('NOT_FOUND', 'Review not found', 404);
    return successResponse(saved);
  } catch (err) {
    console.error('review response DELETE', err);
    return errorResponse('INTERNAL_ERROR', 'Failed to remove response', 500);
  }
}
