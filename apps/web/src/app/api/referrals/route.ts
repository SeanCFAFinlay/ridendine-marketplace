// ==========================================
// REFERRAL API ROUTES
// GET  /api/referrals - My referral code + stats
// POST /api/referrals - Generate referral code (first time)
// ==========================================

import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { createReferralService } from '@ridendine/engine';
import { getCustomerActorContext, errorResponse, successResponse } from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/referrals
 * Returns the current user's referral code and stats.
 * Returns null stats if the user has no referral code yet.
 */
export async function GET() {
  try {
    const context = await getCustomerActorContext();
    if (!context) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const svc = createReferralService(adminClient);

    const stats = await svc.getMyReferrals(context.actor.userId);

    return successResponse({ referral: stats });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch referral data';
    return errorResponse('REFERRAL_FETCH_ERROR', message, 500);
  }
}

/**
 * POST /api/referrals
 * Generates a referral code for the current user (idempotent — returns existing if present).
 */
export async function POST() {
  try {
    const context = await getCustomerActorContext();
    if (!context) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient() as unknown as SupabaseClient;
    const svc = createReferralService(adminClient);

    // Return existing code if user already has one
    const existing = await svc.getMyReferrals(context.actor.userId);
    if (existing) {
      return successResponse({ referral: existing });
    }

    await svc.generateCode(context.actor.userId, 'customer');
    const stats = await svc.getMyReferrals(context.actor.userId);

    return successResponse({ referral: stats }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate referral code';
    return errorResponse('REFERRAL_GENERATE_ERROR', message, 500);
  }
}
