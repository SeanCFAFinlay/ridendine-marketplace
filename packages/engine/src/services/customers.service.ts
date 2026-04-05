// ==========================================
// CUSTOMER SERVICE - Customer Logic
// ==========================================

import type { SupabaseClient } from '@ridendine/db';

// Types
export interface Customer {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  profileImageUrl: string | null;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  lat: number | null;
  lng: number | null;
  deliveryInstructions: string | null;
  isDefault: boolean;
}

// Get customer by user ID
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

  if (!data) return null;

  return {
    id: data.id,
    userId: data.user_id,
    firstName: data.first_name,
    lastName: data.last_name,
    email: data.email,
    phone: data.phone,
    profileImageUrl: data.profile_image_url,
  };
}

// Get customer addresses
export async function getCustomerAddresses(
  client: SupabaseClient,
  customerId: string
): Promise<CustomerAddress[]> {
  const { data, error } = await client
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) throw error;

  return (data ?? []).map((addr: any) => ({
    id: addr.id,
    customerId: addr.customer_id,
    label: addr.label,
    streetAddress: addr.address_line1,
    city: addr.city,
    state: addr.state,
    postalCode: addr.postal_code,
    country: addr.country,
    lat: addr.lat,
    lng: addr.lng,
    deliveryInstructions: addr.delivery_instructions,
    isDefault: addr.is_default,
  }));
}

// Create or update customer profile
export async function upsertCustomer(
  client: SupabaseClient,
  userId: string,
  data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    profileImageUrl?: string;
  }
): Promise<Customer> {
  const { data: customer, error } = await client
    .from('customers')
    .upsert(
      {
        user_id: userId,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone || null,
        profile_image_url: data.profileImageUrl || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select()
    .single();

  if (error) throw error;

  return {
    id: customer.id,
    userId: customer.user_id,
    firstName: customer.first_name,
    lastName: customer.last_name,
    email: customer.email,
    phone: customer.phone,
    profileImageUrl: customer.profile_image_url,
  };
}

// Add customer address
export async function addCustomerAddress(
  client: SupabaseClient,
  customerId: string,
  address: Omit<CustomerAddress, 'id' | 'customerId'>
): Promise<CustomerAddress> {
  // If this is the default address, unset other defaults
  if (address.isDefault) {
    await client
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);
  }

  const { data, error } = await client
    .from('customer_addresses')
    .insert({
      customer_id: customerId,
      label: address.label,
      address_line1: address.streetAddress,
      city: address.city,
      state: address.state,
      postal_code: address.postalCode,
      country: address.country || 'US',
      lat: address.lat,
      lng: address.lng,
      delivery_instructions: address.deliveryInstructions,
      is_default: address.isDefault,
    })
    .select()
    .single();

  if (error) throw error;

  return {
    id: data.id,
    customerId: data.customer_id,
    label: data.label,
    streetAddress: data.address_line1,
    city: data.city,
    state: data.state,
    postalCode: data.postal_code,
    country: data.country,
    lat: data.lat,
    lng: data.lng,
    deliveryInstructions: data.delivery_instructions,
    isDefault: data.is_default,
  };
}

// Get customer order history
export async function getCustomerOrderHistory(
  client: SupabaseClient,
  customerId: string,
  options: { limit?: number; offset?: number } = {}
) {
  let query = client
    .from('orders')
    .select(
      `
      *,
      chef_storefronts (name, logo_url),
      order_items (
        quantity,
        unit_price,
        menu_items (name)
      )
    `
    )
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (options.limit) {
    query = query.limit(options.limit);
  }

  if (options.offset) {
    query = query.range(
      options.offset,
      options.offset + (options.limit ?? 10) - 1
    );
  }

  const { data, error } = await query;

  if (error) throw error;
  return data ?? [];
}

// Get customer statistics for admin
export async function getCustomerStats(client: SupabaseClient) {
  const { count, error } = await client
    .from('customers')
    .select('*', { count: 'exact', head: true });

  if (error) throw error;

  return {
    totalCustomers: count ?? 0,
  };
}
