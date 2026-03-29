// ==========================================
// DISPATCH SERVICE - Driver Assignment Logic
// ==========================================

import type { SupabaseClient } from '@ridendine/db';
import { DRIVER_PAYOUT_PERCENT } from '../constants';

export interface DispatchResult {
  success: boolean;
  deliveryId?: string;
  driverId?: string;
  error?: string;
}

/**
 * Dispatch an order to the nearest available driver.
 * Called when an order status changes to 'ready_for_pickup'.
 */
export async function dispatchOrder(
  client: SupabaseClient,
  orderId: string
): Promise<DispatchResult> {
  try {
    // 1. Get order with storefront and kitchen location
    const { data: order, error: orderError } = await client
      .from('orders')
      .select(`
        *,
        chef_storefronts (
          id,
          name,
          chef_kitchens (
            id,
            address_line1,
            city,
            state,
            postal_code,
            lat,
            lng
          )
        ),
        customer_addresses (
          id,
          address_line1,
          city,
          state,
          postal_code,
          lat,
          lng
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return { success: false, error: 'Order not found' };
    }

    // Check if delivery already exists
    const { data: existingDelivery } = await client
      .from('deliveries')
      .select('id')
      .eq('order_id', orderId)
      .single();

    if (existingDelivery) {
      return { success: false, error: 'Delivery already exists for this order' };
    }

    const storefront = order.chef_storefronts as any;
    const kitchen = storefront?.chef_kitchens?.[0];
    const deliveryAddress = order.customer_addresses as any;

    if (!kitchen) {
      return { success: false, error: 'No kitchen location found for order' };
    }

    // 2. Find available driver
    // Try to find nearest online driver using simple distance if PostGIS not available
    let driver: { driver_id: string } | null = null;

    // First try: Find any online driver
    const { data: onlineDrivers } = await client
      .from('driver_presence')
      .select('driver_id, current_lat, current_lng')
      .eq('status', 'online')
      .limit(10);

    if (onlineDrivers && onlineDrivers.length > 0) {
      // If we have kitchen coordinates, sort by distance
      if (kitchen.lat && kitchen.lng) {
        type DriverWithLocation = { driver_id: string; current_lat: number | null; current_lng: number | null };
        const driversWithDistance = onlineDrivers
          .filter((d: DriverWithLocation) => d.current_lat && d.current_lng)
          .map((d: DriverWithLocation) => ({
            ...d,
            distance: calculateDistance(
              kitchen.lat,
              kitchen.lng,
              d.current_lat!,
              d.current_lng!
            ),
          }))
          .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);

        driver = driversWithDistance[0] || onlineDrivers[0];
      } else {
        driver = onlineDrivers[0];
      }
    }

    if (!driver) {
      console.log('No available drivers for order', orderId);
      return { success: false, error: 'No available drivers' };
    }

    // 3. Build addresses
    const pickupAddress = kitchen.address_line1
      ? `${kitchen.address_line1}, ${kitchen.city}, ${kitchen.state} ${kitchen.postal_code}`
      : storefront?.name || 'Pickup location';

    const dropoffAddress = deliveryAddress?.address_line1
      ? `${deliveryAddress.address_line1}, ${deliveryAddress.city}, ${deliveryAddress.state} ${deliveryAddress.postal_code}`
      : 'Delivery location';

    // 4. Create delivery record
    const driverPayout = Math.round(order.delivery_fee * (DRIVER_PAYOUT_PERCENT / 100));

    const { data: delivery, error: deliveryError } = await client
      .from('deliveries')
      .insert({
        order_id: orderId,
        driver_id: driver.driver_id,
        status: 'assigned',
        pickup_address: pickupAddress,
        pickup_lat: kitchen.lat || null,
        pickup_lng: kitchen.lng || null,
        dropoff_address: dropoffAddress,
        dropoff_lat: deliveryAddress?.lat || null,
        dropoff_lng: deliveryAddress?.lng || null,
        delivery_fee: order.delivery_fee,
        driver_payout: driverPayout,
        estimated_pickup_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min
        estimated_dropoff_at: new Date(Date.now() + 45 * 60 * 1000).toISOString(), // 45 min
      })
      .select()
      .single();

    if (deliveryError || !delivery) {
      return { success: false, error: deliveryError?.message || 'Failed to create delivery' };
    }

    // 5. Update order status
    await client
      .from('orders')
      .update({
        status: 'driver_assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    // 6. Create notification for driver
    try {
      const { data: driverUser } = await client
        .from('drivers')
        .select('user_id')
        .eq('id', driver.driver_id)
        .single();

      if (driverUser?.user_id) {
        await client.from('notifications').insert({
          user_id: driverUser.user_id,
          type: 'delivery_offer',
          title: 'New Delivery Available!',
          body: `New delivery from ${storefront?.name || 'a chef'}. Accept now!`,
          data: { delivery_id: delivery.id, order_id: orderId },
          read: false,
        });
      }
    } catch (e) {
      // Non-fatal - continue even if notification fails
      console.log('Failed to send driver notification');
    }

    // 7. Set driver as busy
    await client
      .from('driver_presence')
      .update({ status: 'busy' })
      .eq('driver_id', driver.driver_id);

    return {
      success: true,
      deliveryId: delivery.id,
      driverId: driver.driver_id,
    };
  } catch (error) {
    console.error('Dispatch error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown dispatch error',
    };
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula.
 * Returns distance in kilometers.
 */
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Release a driver back to online status after delivery completion.
 */
export async function releaseDriver(
  client: SupabaseClient,
  driverId: string
): Promise<void> {
  await client
    .from('driver_presence')
    .update({ status: 'online' })
    .eq('driver_id', driverId);
}

/**
 * Get all pending deliveries waiting for drivers.
 */
export async function getPendingDeliveries(
  client: SupabaseClient
): Promise<any[]> {
  const { data, error } = await client
    .from('orders')
    .select(`
      id,
      order_number,
      status,
      delivery_fee,
      chef_storefronts (name)
    `)
    .eq('status', 'ready_for_pickup')
    .is('driver_id', null);

  if (error) throw error;
  return data || [];
}
