import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type Delivery = Tables<'deliveries'>;

export async function getDeliveryById(
  client: SupabaseClient,
  id: string
): Promise<Delivery | null> {
  const { data, error } = await client
    .from('deliveries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getDeliveryByOrderId(
  client: SupabaseClient,
  orderId: string
): Promise<Delivery | null> {
  const { data, error } = await client
    .from('deliveries')
    .select('*')
    .eq('order_id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createDelivery(
  client: SupabaseClient,
  delivery: Omit<Delivery, 'id' | 'created_at' | 'updated_at'>
): Promise<Delivery> {
  const { data, error } = await client
    .from('deliveries')
    .insert(delivery)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateDeliveryStatus(
  client: SupabaseClient,
  id: string,
  status: string,
  additionalUpdates: Partial<Delivery> = {}
): Promise<Delivery> {
  const updates: Partial<Delivery> = {
    status,
    ...additionalUpdates,
    updated_at: new Date().toISOString(),
  };

  if (status === 'picked_up') {
    updates.actual_pickup_at = new Date().toISOString();
  } else if (status === 'delivered') {
    updates.actual_dropoff_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('deliveries')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function assignDriver(
  client: SupabaseClient,
  deliveryId: string,
  driverId: string
): Promise<Delivery> {
  const { data, error } = await client
    .from('deliveries')
    .update({
      driver_id: driverId,
      status: 'assigned',
      updated_at: new Date().toISOString(),
    })
    .eq('id', deliveryId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveDeliveriesForDriver(
  client: SupabaseClient,
  driverId: string
): Promise<Delivery[]> {
  const { data, error } = await client
    .from('deliveries')
    .select('*')
    .eq('driver_id', driverId)
    .in('status', ['assigned', 'accepted', 'en_route_to_pickup', 'arrived_at_pickup', 'picked_up', 'en_route_to_dropoff', 'arrived_at_dropoff'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getPendingDeliveries(
  client: SupabaseClient
): Promise<Delivery[]> {
  const { data, error } = await client
    .from('deliveries')
    .select('*')
    .eq('status', 'pending')
    .is('driver_id', null)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function getDeliveryHistory(
  client: SupabaseClient,
  driverId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<Delivery[]> {
  let query = client
    .from('deliveries')
    .select('*')
    .eq('driver_id', driverId)
    .in('status', ['delivered', 'completed'])
    .order('actual_dropoff_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit ?? 20) - 1);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}
