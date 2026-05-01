// ==========================================
// CHEF-ADMIN ORDERS LIST API
// Powered by Central Engine
// ==========================================

import { createAdminClient } from '@ridendine/db';
import {
  getEngine,
  getChefActorContext,
  errorResponse,
  successResponse,
} from '@/lib/engine';

export const dynamic = 'force-dynamic';

/**
 * GET /api/orders
 * Get all orders for the chef's storefront
 */
export async function GET() {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const adminClient = createAdminClient();

    // Get orders for this storefront with related data
    const { data: orders, error } = await adminClient
      .from('orders')
      .select(`
        id,
        order_number,
        status,
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
        customer_id,
        delivery_address_id
      `)
      .eq('storefront_id', chefContext.storefrontId)
      .order('created_at', { ascending: false });

    if (error) {
      return errorResponse('FETCH_ERROR', error.message);
    }

    // Enrich with customer data
    const customerIds = [...new Set(orders.map((o) => o.customer_id).filter(Boolean))];
    const { data: customers } = customerIds.length > 0
      ? await adminClient
          .from('customers')
          .select('id, first_name, last_name, phone, email')
          .in('id', customerIds)
      : { data: [] };

    // Enrich with delivery address data
    const addressIds = [...new Set(orders.map((o) => o.delivery_address_id).filter(Boolean))];
    const { data: addresses } = addressIds.length > 0
      ? await adminClient
          .from('customer_addresses')
          .select('id, street_address, city, state, postal_code, country')
          .in('id', addressIds)
      : { data: [] };

    // Get allowed actions for each order
    const engine = getEngine();
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        const allowedActions = await engine.orders.getAllowedActions(order.id, 'chef_user');
        return {
          ...order,
          customer: customers?.find((c) => c.id === order.customer_id) || null,
          address: addresses?.find((a) => a.id === order.delivery_address_id) || null,
          allowedActions,
        };
      })
    );

    return successResponse({ orders: ordersWithDetails });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
