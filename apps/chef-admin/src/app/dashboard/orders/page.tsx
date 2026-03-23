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

  const { data: customers }: any = await supabase
    .from('customers')
    .select('id, first_name, last_name, phone')
    .in('id', orders.map((o: any) => o.customer_id));

  const { data: addresses }: any = await supabase
    .from('delivery_addresses')
    .select('id, street_address, city')
    .in('id', orders.map((o: any) => o.delivery_address_id));

  return orders.map((order: any) => ({
    ...order,
    customer: customers?.find((c: any) => c.id === order.customer_id),
    address: addresses?.find((a: any) => a.id === order.delivery_address_id),
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
