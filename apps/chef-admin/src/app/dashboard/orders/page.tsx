import { cookies } from 'next/headers';
import { createServerClient, getStorefrontByChefId, getOrdersByStorefront } from '@ridendine/db';
import { OrdersList } from '@/components/orders/orders-list';

export const dynamic = 'force-dynamic';

async function getChefStorefront() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const result: any = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (result.error || !result.data) return null;

  return await getStorefrontByChefId(supabase as any, result.data.id);
}

async function getOrdersWithCustomers(storefrontId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const orders = await getOrdersByStorefront(supabase as any, storefrontId);

  if (orders.length === 0) return [];

  const customerIds = [...new Set(orders.map((o: any) => o.customer_id).filter(Boolean))];
  const { data: customers }: any = customerIds.length > 0
    ? await supabase
        .from('customers')
        .select('id, first_name, last_name, phone')
        .in('id', customerIds)
    : { data: [] };

  // Fixed: use customer_addresses table with correct column names
  const addressIds = [...new Set(orders.map((o: any) => o.delivery_address_id).filter(Boolean))];
  const { data: addresses }: any = addressIds.length > 0
    ? await supabase
        .from('customer_addresses')
        .select('id, address_line1, address_line2, city, state, postal_code')
        .in('id', addressIds)
    : { data: [] };

  return orders.map((order: any) => ({
    ...order,
    customer: customers?.find((c: any) => c.id === order.customer_id) || null,
    address: addresses?.find((a: any) => a.id === order.delivery_address_id) || null,
  }));
}

export default async function OrdersPage() {
  const storefront = await getChefStorefront();

  if (!storefront) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">No storefront found. Please complete your setup.</p>
      </div>
    );
  }

  const orders = await getOrdersWithCustomers(storefront.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="mt-1 text-gray-500">Manage incoming and active orders</p>
        </div>
      </div>

      <OrdersList initialOrders={orders} />
    </div>
  );
}
