// ==========================================
// CUSTOMER REVIEWS API
// POST: Submit a review for a delivered order
// GET:  Fetch visible reviews for a storefront
// ==========================================

import type { NextRequest } from 'next/server';
import { createAdminClient, createServerClient } from '@ridendine/db';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIp, isUuid, rateLimitResponse } from '@ridendine/utils';

export const dynamic = 'force-dynamic';

// ── POST /api/reviews ──────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = checkRateLimit(ip, { maxRequests: 5, windowSeconds: 60 }, 'reviews');
  if (!limit.allowed) return rateLimitResponse(limit.retryAfter!);

  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { orderId, rating, comment } = body;

    if (!orderId || typeof orderId !== 'string' || !rating || rating < 1 || rating > 5) {
      return Response.json({ error: 'orderId and rating (1-5) are required' }, { status: 400 });
    }
    if (!isUuid(orderId)) {
      return Response.json({ error: 'Invalid orderId' }, { status: 400 });
    }

    const adminClient = createAdminClient() as any;
    const customer = await getCustomerByUserId(adminClient, user.id);
    if (!customer) return Response.json({ error: 'Customer not found' }, { status: 404 });

    const order = await getOrderById(adminClient, orderId);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    if (order.customer_id !== customer.id) {
      return Response.json({ error: 'Not your order' }, { status: 403 });
    }

    if (!['delivered', 'completed'].includes(order.status)) {
      return Response.json({ error: 'Can only review delivered orders' }, { status: 400 });
    }

    const existing = await getExistingReview(adminClient, orderId);
    if (existing) return Response.json({ error: 'Already reviewed' }, { status: 409 });

    const { data: review, error } = await adminClient
      .from('reviews')
      .insert({
        order_id: orderId,
        customer_id: customer.id,
        storefront_id: order.storefront_id,
        rating,
        comment: comment || null,
        is_visible: true,
      })
      .select()
      .single();

    if (error) return Response.json({ error: error.message }, { status: 500 });

    await updateStorefrontRating(adminClient, order.storefront_id);

    return Response.json({ success: true, data: review });
  } catch {
    return Response.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}

// ── GET /api/reviews ───────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const storefrontId = searchParams.get('storefrontId');

  if (!storefrontId) {
    return Response.json({ error: 'storefrontId required' }, { status: 400 });
  }
  if (!isUuid(storefrontId)) {
    return Response.json({ error: 'Invalid storefrontId' }, { status: 400 });
  }

  const adminClient = createAdminClient() as any;

  const { data: reviews, error } = await adminClient
    .from('reviews')
    .select(`
      id, rating, comment, created_at,
      customer:customers(first_name, last_name)
    `)
    .eq('storefront_id', storefrontId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true, data: reviews });
}

// ── Private helpers ────────────────────────────────────────────────

async function getCustomerByUserId(
  adminClient: any,
  userId: string
) {
  const { data } = await adminClient
    .from('customers')
    .select('id')
    .eq('user_id', userId)
    .single();
  return data;
}

async function getOrderById(
  adminClient: any,
  orderId: string
) {
  const { data } = await adminClient
    .from('orders')
    .select('id, customer_id, storefront_id, status')
    .eq('id', orderId)
    .single();
  return data;
}

async function getExistingReview(
  adminClient: any,
  orderId: string
) {
  const { data } = await adminClient
    .from('reviews')
    .select('id')
    .eq('order_id', orderId)
    .single();
  return data;
}

async function updateStorefrontRating(
  adminClient: any,
  storefrontId: string
) {
  const { data: allReviews } = await adminClient
    .from('reviews')
    .select('rating')
    .eq('storefront_id', storefrontId)
    .eq('is_visible', true);

  if (!allReviews || allReviews.length === 0) return;

  const avg = allReviews.reduce((sum: number, r: { rating: number }) => sum + r.rating, 0) / allReviews.length;
  await adminClient
    .from('chef_storefronts')
    .update({
      average_rating: Math.round(avg * 10) / 10,
      total_reviews: allReviews.length,
    })
    .eq('id', storefrontId);
}
