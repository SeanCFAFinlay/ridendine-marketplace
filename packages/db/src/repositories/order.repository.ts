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
  options: { status?: string; page?: number; limit?: number } = {}
): Promise<Order[]> {
  // Always bound the result set — PostgREST silently truncates unbounded
  // queries at 1000 rows, so an explicit limit + range keeps paging honest.
  const page = options.page ?? 1;
  const limit = options.limit ?? 500;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = client
    .from('orders')
    .select('*')
    .eq('storefront_id', storefrontId)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options.status) {
    query = query.eq('status', options.status);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function listOpsOrders(
  client: SupabaseClient,
  options: { status?: string; startDate?: string; endDate?: string; page?: number; limit?: number } = {}
): Promise<{ items: OpsOrderListItem[]; total: number }> {
  const page = options.page ?? 1;
  const limit = options.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let countQuery = client
    .from('orders')
    .select('*', { count: 'exact', head: true });

  let dataQuery = client
    .from('orders')
    .select('*, customers(first_name, last_name, email), chef_storefronts(name)')
    .order('created_at', { ascending: false })
    .range(from, to);

  if (options.status) {
    countQuery = countQuery.eq('status', options.status);
    dataQuery = dataQuery.eq('status', options.status);
  }

  if (options.startDate) {
    countQuery = countQuery.gte('created_at', options.startDate);
    dataQuery = dataQuery.gte('created_at', options.startDate);
  }

  if (options.endDate) {
    countQuery = countQuery.lte('created_at', options.endDate);
    dataQuery = dataQuery.lte('created_at', options.endDate);
  }

  const [{ count, error: countError }, { data, error }] = await Promise.all([countQuery, dataQuery]);

  if (countError) throw countError;
  if (error) throw error;
  return { items: data ?? [], total: count ?? 0 };
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
        id, label, address_line1, address_line2, city, state, postal_code, country, lat, lng, delivery_instructions, is_default
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

  const order = data as unknown as OpsOrderDetail;

  // 00048 converged every environment on address_line1/address_line2 (the
  // old street_address fallback for drifted replicas is no longer needed).
  if (order.delivery_address) {
    order.delivery_address = {
      ...order.delivery_address,
      address_line1: order.delivery_address.address_line1 ?? '',
      address_line2: order.delivery_address.address_line2 ?? null,
    };
  }

  return order;
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

export class InvalidOrderTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`Invalid order status transition: '${from}' -> '${to}'`);
    this.name = 'InvalidOrderTransitionError';
  }
}

/**
 * Thrown when the order's status changed between the transition validation
 * read and the conditional UPDATE (lost the optimistic-concurrency race).
 * Callers can catch this specifically and retry or surface a conflict.
 */
export class OrderTransitionConflictError extends Error {
  constructor(orderId: string, expectedStatus: string, attemptedStatus: string) {
    super(
      `Order ${orderId} status changed concurrently: expected '${expectedStatus}' while transitioning to '${attemptedStatus}'`
    );
    this.name = 'OrderTransitionConflictError';
  }
}

const VALID_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending:          ['accepted', 'rejected', 'cancelled'],
  scheduled:        ['accepted', 'cancelled'],
  accepted:         ['preparing', 'cancelled'],
  rejected:         [],
  preparing:        ['ready_for_pickup', 'cancelled'],
  ready_for_pickup: ['picked_up', 'cancelled'],
  picked_up:        ['in_transit'],
  in_transit:       ['delivered'],
  delivered:        ['completed', 'refunded'],
  completed:        ['refunded'],
  cancelled:        [],
  refunded:         [],
};

async function fetchCurrentStatus(client: SupabaseClient, id: string): Promise<string> {
  const { data, error } = await client
    .from('orders')
    .select('status')
    .eq('id', id)
    .single();
  if (error) throw error;
  return (data as { status: string }).status;
}

export async function updateOrderStatus(
  client: SupabaseClient,
  id: string,
  status: string
): Promise<Order> {
  const currentStatus = await fetchCurrentStatus(client, id);
  const allowed = VALID_ORDER_TRANSITIONS[currentStatus] ?? [];

  if (!allowed.includes(status)) {
    throw new InvalidOrderTransitionError(currentStatus, status);
  }

  const updates: Partial<Order> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === 'ready_for_pickup') {
    updates.actual_ready_at = new Date().toISOString();
  }

  // Optimistic concurrency: only update if the status is still the one we
  // validated against (closes the read-validate-update TOCTOU race).
  const { data, error } = await client
    .from('orders')
    .update(updates)
    .eq('id', id)
    .eq('status', currentStatus)
    .select();

  if (error) throw error;

  const updated = (data as Order[] | null)?.[0];
  if (!updated) {
    // 0 affected rows — someone else transitioned the order first.
    throw new OrderTransitionConflictError(id, currentStatus, status);
  }

  return updated;
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

// ==========================================
// OPS-ADMIN READ MODELS
// ==========================================

type OpsAnyRow = Record<string, any>;

/**
 * Orders stuck in attention-needing engine states (pending / dispatch_pending /
 * exception), oldest first, with customer + storefront names.
 */
export async function listOrdersNeedingAttention(
  client: SupabaseClient,
  engineStatuses: string[],
  limit = 10
): Promise<OpsAnyRow[]> {
  const { data, error } = await client
    .from('orders')
    .select(`
      id, order_number, total, engine_status, created_at,
      customer:customers (first_name, last_name),
      storefront:chef_storefronts (name)
    `)
    .in('engine_status', engineStatuses as never[])
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as OpsAnyRow[];
}

/**
 * Full ops order detail with customer, storefront/chef, delivery address,
 * items and delivery/driver embeds (engine order actions API). Returns null
 * when the order does not exist.
 */
export async function getEngineOrderDetail(
  client: SupabaseClient,
  orderId: string
): Promise<OpsAnyRow | null> {
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

  return data as unknown as OpsAnyRow;
}

export interface OrderSearchRow {
  id: string;
  order_number: string;
  status: string;
  total: number | string;
}

/** Orders whose order number matches `q` (global search). */
export async function searchOrdersByNumber(
  client: SupabaseClient,
  q: string,
  limit = 5
): Promise<OrderSearchRow[]> {
  const { data, error } = await client
    .from('orders')
    .select('id, order_number, status, total')
    .ilike('order_number', `%${q}%`)
    .limit(limit);

  if (error) throw error;
  return (data || []) as unknown as OrderSearchRow[];
}

/**
 * Exact count of ready-for-pickup orders with no driver assigned that were
 * created before `beforeIso` (dispatch alerting).
 */
export async function countUnassignedReadyOrders(
  client: SupabaseClient,
  beforeIso: string
): Promise<number> {
  const { count, error } = await client
    .from('orders')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'ready_for_pickup' as never)
    .is('driver_id' as never, null)
    .lt('created_at', beforeIso);

  if (error) throw error;
  return count ?? 0;
}

export interface OrderExportRow {
  order_number: string;
  status: string;
  subtotal: number | null;
  delivery_fee: number | null;
  service_fee: number | null;
  tax: number | null;
  tip: number | null;
  total: number | null;
  payment_status: string | null;
  created_at: string;
}

// ==========================================
// CUSTOMER-FACING (apps/web) READ MODELS
// ==========================================

/**
 * Full customer order detail (items, storefront, address, delivery + driver
 * embeds) scoped to the owning customer. Returns null when not found.
 */
export async function getCustomerOrderDetail(
  client: SupabaseClient,
  orderId: string,
  customerId: string
): Promise<OpsAnyRow | null> {
  const { data, error } = await client
    .from('orders')
    .select(`
      *,
      items:order_items (
        id,
        quantity,
        unit_price,
        total_price,
        special_instructions,
        menu_item:menu_items (
          id,
          name,
          description,
          image_url
        )
      ),
      storefront:chef_storefronts (
        id,
        name,
        slug,
        logo_url,
        phone
      ),
      delivery_address:customer_addresses (
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        delivery_instructions
      ),
      delivery:deliveries (
        id,
        status,
        driver_id,
        pickup_address,
        dropoff_address,
        estimated_pickup_at,
        actual_pickup_at,
        estimated_dropoff_at,
        actual_dropoff_at,
        eta_pickup_at,
        eta_dropoff_at,
        route_progress_pct,
        route_to_dropoff_seconds,
        route_to_dropoff_polyline,
        driver:drivers (
          first_name,
          last_name,
          phone,
          driver_vehicles (
            make,
            model,
            color,
            license_plate,
            is_active
          )
        )
      )
    `)
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as OpsAnyRow;
}

/** Order status history rows, oldest first. */
export async function listOrderStatusHistory(
  client: SupabaseClient,
  orderId: string
): Promise<OpsAnyRow[]> {
  const { data, error } = await client
    .from('order_status_history')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data || []) as unknown as OpsAnyRow[];
}

/**
 * Order list for the customer "my orders" screen with storefront + delivery
 * embeds, newest first.
 */
export async function listCustomerOrderSummaries(
  client: SupabaseClient,
  customerId: string
): Promise<OpsAnyRow[]> {
  const { data, error } = await client
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
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as OpsAnyRow[];
}

export interface CustomerOrderPaymentSnapshot {
  id: string;
  order_number: string;
  payment_status: string | null;
  payment_intent_id: string | null;
  total: number | null;
  engine_status: string | null;
  status: string;
}

/** Safe payment fields for an order, scoped to the owning customer. */
export async function getCustomerOrderPaymentSnapshot(
  client: SupabaseClient,
  orderId: string,
  customerId: string
): Promise<CustomerOrderPaymentSnapshot | null> {
  const { data, error } = await client
    .from('orders')
    .select('id, order_number, payment_status, payment_intent_id, total, engine_status, status')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return (data as unknown as CustomerOrderPaymentSnapshot | null) ?? null;
}

/**
 * `id, customer_id, engine_status` for an order scoped to the owning customer
 * (self-serve cancellation guard). Returns null when not found.
 */
export async function getCustomerOrderEngineStatusRef(
  client: SupabaseClient,
  orderId: string,
  customerId: string
): Promise<{ id: string; customer_id: string; engine_status: string | null } | null> {
  const { data, error } = await client
    .from('orders')
    .select('id, customer_id, engine_status')
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as { id: string; customer_id: string; engine_status: string | null };
}

export interface CustomerOrderItemsSnapshot {
  id: string;
  storefront_id: string;
  customer_id: string;
  items: Array<{
    menu_item_id: string;
    quantity: number;
    special_instructions: string | null;
  }>;
}

/**
 * Order item refs for re-ordering, scoped to the owning customer. Returns
 * null when not found.
 */
export async function getCustomerOrderItemsSnapshot(
  client: SupabaseClient,
  orderId: string,
  customerId: string
): Promise<CustomerOrderItemsSnapshot | null> {
  const { data, error } = await client
    .from('orders')
    .select(`
        id,
        storefront_id,
        customer_id,
        items:order_items (
          menu_item_id,
          quantity,
          special_instructions
        )
      `)
    .eq('id', orderId)
    .eq('customer_id', customerId)
    .maybeSingle();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return (data as unknown as CustomerOrderItemsSnapshot | null) ?? null;
}

export interface OrderPaymentSnapshot {
  id: string;
  customer_id: string;
  subtotal: number;
  total: number;
  payment_status: string;
  engine_status: string;
}

/**
 * Payment snapshot for the Stripe webhook amount check.
 *
 * DELIBERATE: returns null on ANY error (not just PGRST116) — the webhook
 * treats an unreadable order exactly like a missing one and fails the event
 * for retry. Preserved from the original hardened call site.
 */
export async function getOrderPaymentSnapshot(
  client: SupabaseClient,
  orderId: string
): Promise<OrderPaymentSnapshot | null> {
  const { data, error } = await client
    .from('orders')
    .select('id, customer_id, subtotal, total, payment_status, engine_status')
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as OrderPaymentSnapshot;
}

/**
 * Mark an order's payment completed after Stripe confirms the charge.
 *
 * DELIBERATE: write errors are intentionally not thrown — the webhook
 * continues with kitchen submission/cleanup regardless, exactly as the
 * original hardened call site did (engine state is authoritative).
 */
export async function markOrderPaymentCompleted(
  client: SupabaseClient,
  orderId: string,
  paymentIntentId: string
): Promise<void> {
  await client
    .from('orders')
    .update({
      payment_status: 'completed',
      payment_intent_id: paymentIntentId,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', orderId);
}

/**
 * Persist the canonical checkout quote snapshot (totals / schedule fields) on
 * an order record. Throws on error so checkout can cancel the orphan order.
 */
export async function updateOrderQuoteSnapshot(
  client: SupabaseClient,
  orderId: string,
  updates: Record<string, unknown>
): Promise<void> {
  const { error } = await client
    .from('orders')
    .update(updates as never)
    .eq('id', orderId);

  if (error) throw error;
}

/**
 * Order with storefront + deliveries embeds for the confirmation/tracking
 * page. Pass the RLS-scoped server client — row visibility is enforced by
 * policy, not by an explicit customer filter.
 */
export async function getOrderConfirmationDetail(
  client: SupabaseClient,
  orderId: string
): Promise<OpsAnyRow | null> {
  const { data, error } = await client
    .from('orders')
    .select(`
      *,
      chef_storefronts (
        name,
        logo_url
      ),
      deliveries (
        id,
        status,
        pickup_address,
        dropoff_address,
        estimated_dropoff_at,
        eta_pickup_at,
        eta_dropoff_at,
        route_progress_pct,
        route_to_dropoff_seconds,
        route_to_dropoff_polyline,
        drivers ( first_name )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return data as unknown as OpsAnyRow;
}

/** Order rows created in [start, end] for CSV export, newest first. */
export async function listOrderExportRows(
  client: SupabaseClient,
  startIso: string,
  endIso: string
): Promise<OrderExportRow[]> {
  const { data, error } = await client
    .from('orders')
    .select('order_number, status, subtotal, delivery_fee, service_fee, tax, tip, total, payment_status, created_at')
    .gte('created_at', startIso)
    .lte('created_at', endIso)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []) as unknown as OrderExportRow[];
}

export interface OrderMoneyRow {
  id: string;
  created_at: string;
  subtotal: number | null;
  tax: number | null;
  service_fee: number | null;
  delivery_fee: number | null;
  tip: number | null;
}

/**
 * Money columns (DOLLAR floats) of a storefront's fulfilled orders created
 * after `sinceIso` (or all time when null). Feeds the chef payout breakdown.
 */
export async function listFulfilledOrderMoneyForStorefront(
  client: SupabaseClient,
  storefrontId: string,
  sinceIso: string | null
): Promise<OrderMoneyRow[]> {
  let query = client
    .from('orders')
    .select('id, created_at, subtotal, tax, service_fee, delivery_fee, tip')
    .eq('storefront_id', storefrontId)
    .in('status', ['delivered', 'completed'] as never[])
    .order('created_at', { ascending: true })
    .limit(2000);
  if (sinceIso) query = query.gt('created_at', sinceIso);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as OrderMoneyRow[];
}
