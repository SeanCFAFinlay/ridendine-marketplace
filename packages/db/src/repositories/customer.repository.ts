import type { SupabaseClient } from '../client/types';
import type { Tables } from '../generated/database.types';

export type Customer = Tables<'customers'>;
export interface OpsCustomerListItem extends Customer {
  orders: { count: number }[] | null;
}

export interface OpsCustomerDetail extends Customer {
  addresses: Array<{
    id: string;
    label: string;
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string;
    postal_code: string;
    is_default: boolean;
  }>;
  recent_orders: Array<{
    id: string;
    order_number: string;
    status: string;
    total: number;
    created_at: string;
  }>;
  stats: {
    totalOrders: number;
    completedOrders: number;
    cancelledOrders: number;
    totalSpent: number;
    lastOrderAt: string | null;
  };
}

type CustomerStatsRow = {
  status: string;
  total: number | null;
  created_at: string;
};

export async function getCustomerByUserId(
  client: SupabaseClient,
  userId: string
): Promise<Customer | null> {
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function getCustomerById(
  client: SupabaseClient,
  id: string
): Promise<Customer | null> {
  const { data, error } = await client
    .from('customers')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data;
}

export async function createCustomer(
  client: SupabaseClient,
  customer: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
): Promise<Customer> {
  const { data, error } = await client
    .from('customers')
    .insert(customer)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCustomer(
  client: SupabaseClient,
  id: string,
  updates: Partial<Customer>
): Promise<Customer> {
  const { data, error } = await client
    .from('customers')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function listOpsCustomers(
  client: SupabaseClient
): Promise<OpsCustomerListItem[]> {
  const { data, error } = await client
    .from('customers')
    .select('*, orders(count)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as unknown as OpsCustomerListItem[];
}

export async function getOpsCustomerDetail(
  client: SupabaseClient,
  customerId: string
): Promise<OpsCustomerDetail | null> {
  const { data: customer, error } = await client
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  const [addressesResult, recentOrdersResult, allOrdersResult] = await Promise.all([
    client
      .from('customer_addresses')
      .select('id, label, address_line1, address_line2, city, state, postal_code, is_default')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false }),
    client
      .from('orders')
      .select('id, order_number, status, total, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(10),
    client
      .from('orders')
      .select('status, total, created_at')
      .eq('customer_id', customerId),
  ]);

  if (addressesResult.error) throw addressesResult.error;
  if (recentOrdersResult.error) throw recentOrdersResult.error;
  if (allOrdersResult.error) throw allOrdersResult.error;

  const allOrders = (allOrdersResult.data ?? []) as CustomerStatsRow[];

  return {
    ...(customer as Customer),
    addresses: (addressesResult.data ?? []) as OpsCustomerDetail['addresses'],
    recent_orders: (recentOrdersResult.data ?? []) as OpsCustomerDetail['recent_orders'],
    stats: {
      totalOrders: allOrders.length,
      completedOrders: allOrders.filter(
        (order: CustomerStatsRow) => order.status === 'delivered'
      ).length,
      cancelledOrders: allOrders.filter(
        (order: CustomerStatsRow) => order.status === 'cancelled'
      ).length,
      totalSpent: allOrders.reduce(
        (sum: number, order: CustomerStatsRow) => sum + (order.total ?? 0),
        0
      ),
      lastOrderAt: allOrders[0]?.created_at ?? null,
    },
  };
}

export async function getOrCreateCustomer(
  client: SupabaseClient,
  userId: string,
  defaults: { firstName: string; lastName: string; email: string }
): Promise<Customer> {
  const existing = await getCustomerByUserId(client, userId);
  if (existing) return existing;

  return createCustomer(client, {
    user_id: userId,
    first_name: defaults.firstName,
    last_name: defaults.lastName,
    email: defaults.email,
    phone: null,
    profile_image_url: null,
  });
}
