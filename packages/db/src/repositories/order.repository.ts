import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;

export async function getOrderById(
  client: SupabaseClient,
  id: string
): Promise<Order | null> {
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getOrderByNumber(
  client: SupabaseClient,
  orderNumber: string
): Promise<Order | null> {
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getOrdersByCustomer(
  client: SupabaseClient,
  customerId: string,
  options: { limit?: number; offset?: number } = {}
): Promise<Order[]> {
  let query = client
    .from('orders')
    .select('*')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

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

export async function getOrdersByStorefront(
  client: SupabaseClient,
  storefrontId: string,
  options: { status?: string; limit?: number } = {}
): Promise<Order[]> {
  let query = client
    .from('orders')
    .select('*')
    .eq('storefront_id', storefrontId)
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function createOrder(
  client: SupabaseClient,
  order: Omit<Order, 'id' | 'created_at' | 'updated_at'>
): Promise<Order> {
  const { data, error } = await client
    .from('orders')
    .insert(order)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(
  client: SupabaseClient,
  id: string,
  status: string
): Promise<Order> {
  const updates: Partial<Order> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'ready_for_pickup') {
    updates.actual_ready_at = new Date().toISOString();
  }

  const { data, error } = await client
    .from('orders')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveOrdersForChef(
  client: SupabaseClient,
  storefrontId: string
): Promise<Order[]> {
  const { data, error } = await client
    .from('orders')
    .select('*')
    .eq('storefront_id', storefrontId)
    .in('status', ['pending', 'accepted', 'preparing', 'ready_for_pickup'])
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data;
}

export async function createOrderItem(
  client: SupabaseClient,
  item: Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>
): Promise<OrderItem> {
  const { data, error } = await client
    .from('order_items')
    .insert(item)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function createOrderItems(
  client: SupabaseClient,
  items: Omit<OrderItem, 'id' | 'created_at' | 'updated_at'>[]
): Promise<OrderItem[]> {
  const { data, error } = await client
    .from('order_items')
    .insert(items)
    .select();

  if (error) throw error;
  return data;
}
