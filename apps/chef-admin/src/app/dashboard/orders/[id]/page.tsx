import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { Badge, Card } from '@ridendine/ui';
import { createServerClient } from '@ridendine/db';

export const dynamic = 'force-dynamic';

type OrderDetail = {
  id: string;
  order_number: string;
  status: string;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  tax: number;
  tip: number;
  total: number;
  payment_status: string | null;
  special_instructions: string | null;
  estimated_ready_at: string | null;
  actual_ready_at: string | null;
  created_at: string;
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
  } | null;
  delivery_address: {
    address_line1: string;
    address_line2: string | null;
    city: string;
    state: string | null;
    postal_code: string | null;
    country: string | null;
    delivery_instructions: string | null;
  } | null;
  items: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    special_instructions: string | null;
    menu_item: {
      id: string;
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
};

function money(value: number | null | undefined) {
  return `$${Number(value ?? 0).toFixed(2)}`;
}

function formatStatus(value: string | null | undefined) {
  return value ? value.replace(/_/g, ' ') : 'not recorded';
}

function formatTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : 'Not recorded';
}

async function getChefOrder(orderId: string): Promise<OrderDetail | null> {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: chefProfile } = await supabase
    .from('chef_profiles')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!chefProfile) return null;

  const { data: storefront } = await supabase
    .from('chef_storefronts')
    .select('id')
    .eq('chef_id', chefProfile.id)
    .single();

  if (!storefront) return null;

  const { data, error } = await supabase
    .from('orders')
    .select(`
      *,
      customer:customers (
        id, first_name, last_name, email, phone
      ),
      delivery_address:customer_addresses (
        address_line1, address_line2, city, state, postal_code, country, delivery_instructions
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
    .eq('id', orderId)
    .eq('storefront_id', storefront.id)
    .single();

  if (error || !data) return null;
  return data as unknown as OrderDetail;
}

export default async function ChefOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getChefOrder(id);

  if (!order) notFound();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/dashboard/orders" className="text-sm font-medium text-primary hover:underline">
            Back to orders
          </Link>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">
            Complete kitchen order
          </p>
          <h1 className="mt-1 text-3xl font-bold text-text">Order {order.order_number}</h1>
          <p className="mt-1 text-sm text-textMuted">Created {formatTime(order.created_at)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="warning">{formatStatus(order.status)}</Badge>
          <Badge variant="default">Payment: {formatStatus(order.payment_status)}</Badge>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-text">Kitchen ticket</h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1fr_72px_110px_110px] bg-surfaceMuted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-textMuted">
              <span>Item</span>
              <span className="text-center">Qty</span>
              <span className="text-right">Unit</span>
              <span className="text-right">Line</span>
            </div>
            {order.items.length > 0 ? (
              order.items.map((item) => (
                <div key={item.id} className="grid grid-cols-[1fr_72px_110px_110px] border-t border-border px-4 py-3 text-sm">
                  <div>
                    <p className="font-semibold text-text">{item.menu_item?.name || 'Unknown item'}</p>
                    {item.menu_item?.description ? (
                      <p className="mt-0.5 text-xs text-textMuted">{item.menu_item.description}</p>
                    ) : null}
                    {item.special_instructions ? (
                      <p className="mt-1 rounded-md bg-primarySoft px-2 py-1 text-xs font-medium text-primary">
                        Item note: {item.special_instructions}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-center font-bold text-text">{item.quantity}</span>
                  <span className="text-right text-text">{money(item.unit_price)}</span>
                  <span className="text-right font-semibold text-text">{money(item.total_price)}</span>
                </div>
              ))
            ) : (
              <div className="border-t border-border px-4 py-6 text-center text-sm text-textMuted">
                No items are linked to this order.
              </div>
            )}
          </div>
          {order.special_instructions ? (
            <div className="mt-4 rounded-lg border border-primary/20 bg-primarySoft p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Order note</p>
              <p className="mt-1 text-sm text-primary">{order.special_instructions}</p>
            </div>
          ) : null}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text">Financials</h2>
          <div className="mt-4 space-y-2 text-sm">
            {[
              ['Subtotal', order.subtotal],
              ['Delivery fee', order.delivery_fee],
              ['Service fee', order.service_fee],
              ['Tax', order.tax],
              ['Tip', order.tip],
            ].map(([label, value]) => (
              <div key={label as string} className="flex justify-between gap-4">
                <span className="text-textMuted">{label}</span>
                <span className="font-medium text-text">{money(value as number)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
              <span>Total</span>
              <span className="text-primary">{money(order.total)}</span>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <h2 className="text-lg font-semibold text-text">Customer</h2>
          {order.customer ? (
            <div className="mt-4 space-y-2 text-sm text-text">
              <p className="font-semibold text-text">{order.customer.first_name} {order.customer.last_name}</p>
              <p>{order.customer.phone || 'No phone recorded'}</p>
              <p>{order.customer.email || 'No email recorded'}</p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-textMuted">Customer is not linked.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text">Delivery address</h2>
          {order.delivery_address ? (
            <div className="mt-4 space-y-2 text-sm text-text">
              <p className="font-semibold text-text">{order.delivery_address.address_line1}</p>
              {order.delivery_address.address_line2 ? (
                <p className="text-text">{order.delivery_address.address_line2}</p>
              ) : null}
              <p>{order.delivery_address.city}, {order.delivery_address.state} {order.delivery_address.postal_code}</p>
              <p>{order.delivery_address.country || 'Canada'}</p>
              {order.delivery_address.delivery_instructions ? (
                <p className="rounded-md bg-surfaceMuted p-2 italic">{order.delivery_address.delivery_instructions}</p>
              ) : null}
            </div>
          ) : (
            <p className="mt-4 text-sm text-textMuted">No delivery address recorded.</p>
          )}
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-text">Ops timestamps</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div>
              <p className="text-textMuted">Estimated ready</p>
              <p className="font-medium text-text">{formatTime(order.estimated_ready_at)}</p>
            </div>
            <div>
              <p className="text-textMuted">Actual ready</p>
              <p className="font-medium text-text">{formatTime(order.actual_ready_at)}</p>
            </div>
            <div>
              <p className="text-textMuted">Delivery status</p>
              <p className="font-medium text-text">{formatStatus(order.delivery?.status)}</p>
            </div>
            <div>
              <p className="text-textMuted">Driver</p>
              <p className="font-medium text-text">
                {order.delivery?.driver
                  ? `${order.delivery.driver.first_name} ${order.delivery.driver.last_name}`
                  : 'Not assigned'}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
