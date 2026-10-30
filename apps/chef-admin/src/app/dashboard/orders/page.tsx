import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { OrdersLedger } from '@/components/orders/orders-ledger';
import { getChefStorefrontContext } from '@/lib/chef-context';

export const dynamic = 'force-dynamic';

async function getOrdersWithCustomers(storefrontId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers (
        id, first_name, last_name, phone, email
      ),
      address:customer_addresses (
        id, address_line1, address_line2, city, state, postal_code, country, lat, lng, delivery_instructions
      ),
      items:order_items (
        id, quantity, unit_price, total_price, special_instructions,
        menu_item:menu_items (id, name, description)
      ),
      delivery:deliveries (
        id, status, driver_id,
        driver:drivers (first_name, last_name, phone)
      )
    `)
    .eq('storefront_id', storefrontId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export default async function OrdersPage() {
  const { storefront } = await getChefStorefrontContext();

  if (!storefront) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-textMuted">No storefront found. Please complete your setup.</p>
      </div>
    );
  }

  const orders = await getOrdersWithCustomers(storefront.id);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            Order Ledger
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text">Orders</h1>
          <p className="mt-1 text-textMuted">
            Order history, customer &amp; payment context, delivery trace and exceptions. Run live
            service from{' '}
            <a href="/dashboard/kitchen" className="font-medium text-primary hover:underline">
              Kitchen Command
            </a>
            .
          </p>
        </div>
      </div>

      <OrdersLedger initialOrders={orders} storefrontId={storefront.id} />
    </div>
  );
}
