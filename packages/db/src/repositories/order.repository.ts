import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type Order = Tables<'orders'>;
export type OrderItem = Tables<'order_items'>;
export interface OpsOrderListItem extends Order {
  customers: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  chef_storefronts: {
    name: string;
  } | null;
}

export interface OpsOrderDetail extends Order {
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
  } | null;
  storefront: {
    id: string;
    name: string;
    slug: string;
    chef: {
      id: string;
      display_name: string | null;
      phone: string | null;
    } | null;
  } | null;
  delivery_address: {
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    menu_item: {
      name: string;
      description: string | null;
    } | null;
  }>;
  delivery: {
    id: string;
    status: string;
    driver_id: string | null;
    driver: {
      first_name: string;
      last_name: string;
      phone: string | null;
    } | null;
  } | null;
}

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

export async function listOpsOrders(
  client: SupabaseClient,
  options: { status?: string; startDate?: string; endDate?: string } = {}
): Promise<OpsOrderListItem[]> {
  let query = client
    .from('orders')
    .select('*, customers(first_name, last_name, email), chef_storefronts(name)')
    .order('created_at', { ascending: false });

  if (options.status) {
    query = query.eq('status', options.status);
  }

  if (options.startDate) {
    query = query.gte('created_at', options.startDate);
  }

  if (options.endDate) {
    query = query.lte('created_at', options.endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data ?? []) as unknown as OpsOrderListItem[];
}

export async function getOpsOrderDetail(
  client: SupabaseClient,
  orderId: string
): Promise<OpsOrderDetail | null> {
  const { data, error } = await client
    .from('orders')
    .select(`
      *,
      customer:customers (
        id, first_name, last_name, email, phone
      ),
      storefront:chef_storefronts (
        id, name, slug,
        chef:chef_profiles (id, display_name, phone)
      ),
      delivery_address:customer_addresses (
        address_line1, address_line2, city, state, postal_code
      ),
      items:order_items (
        id, quantity, unit_price, total_price,
        menu_item:menu_items (name, description)
      ),
      delivery:deliveries (
        id, status, driver_id,
        driver:drivers (first_name, last_name, phone)
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as OpsOrderDetail;
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
