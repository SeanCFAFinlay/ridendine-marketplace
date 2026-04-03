// ==========================================
// WEB ORDERS LIST API
// Powered by Central Engine
// ==========================================

import { createAdminClient } from '@ridendine/db';
import {
  getCustomerActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders
 * Get all orders for the current customer
 */
export async function GET() {
  try {
    const customerContext = await getCustomerActorContext();
    if (!customerContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient();

    // Get orders for this customer with related data
    const { data: orders, error } = await adminClient
      .from('orders')
      .select(`
        id,
        order_number,
        status,
        engine_status,
        total,
        subtotal,
        tip,
        delivery_fee,
        service_fee,
        tax,
        special_instructions,
        estimated_ready_at,
        created_at,
        updated_at,
        storefront:chef_storefronts (
          id,
          name,
          slug,
          logo_url
        ),
        delivery:deliveries (
          id,
          status,
          estimated_dropoff_at,
          actual_dropoff_at
        )
      `)
      .eq('customer_id', customerContext.customerId)
      .order('created_at', { ascending: false });

    if (error) {
      return errorResponse('FETCH_ERROR', error.message);
    }

    return successResponse({ orders: orders || [] });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
