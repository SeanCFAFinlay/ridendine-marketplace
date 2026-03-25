import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getOrderDetails(orderId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      chef_storefronts (
        id,
        name,
        slug
      ),
      customers (
        id,
        first_name,
        last_name,
        email,
        phone
      ),
      order_items (
        id,
        quantity,
        unit_price,
        total_price,
        menu_items (
          id,
          name
        )
      )
    `)
    .eq('id', orderId)
    .single();

  if (error || !order) {
    return null;
  }

  // Try to get delivery info
  let delivery = null;
  try {
    const { data } = await supabase
      .from('deliveries')
      .select('*, drivers(first_name, last_name, phone)')
      .eq('order_id', orderId)
      .single();
    delivery = data;
  } catch {
    // Delivery may not exist
  }

  return { order, delivery };
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  accepted: 'bg-blue-500',
  preparing: 'bg-purple-500',
  ready_for_pickup: 'bg-indigo-500',
  picked_up: 'bg-cyan-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  refunded: 'bg-gray-500',
};

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const data = await getOrderDetails(params.id);

  if (!data) {
    notFound();
  }

  const { order, delivery } = data;
  const storefront = order.chef_storefronts as { name: string; slug: string } | null;
  const customer = order.customers as { first_name: string; last_name: string; email: string; phone: string } | null;
  const items = order.order_items as Array<{ id: string; quantity: number; unit_price: number; total_price: number; menu_items: { name: string } | null }>;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/orders" className="text-sm text-gray-400 hover:text-white mb-2 inline-block">
              &larr; Back to Orders
            </Link>
            <h1 className="text-3xl font-bold text-white">Order #{order.order_number}</h1>
            <p className="mt-1 text-gray-400">
              Created {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
          <Badge className={`${statusColors[order.status] || 'bg-gray-500'} text-white px-4 py-2`}>
            {order.status?.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Order Info */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Order Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Order ID</span>
                <span className="text-white font-mono">{order.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Status</span>
                <span className="text-white">{order.status?.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Payment Status</span>
                <span className="text-white">{order.payment_status || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Chef/Storefront</span>
                <span className="text-white">{storefront?.name || 'N/A'}</span>
              </div>
            </div>
          </Card>

          {/* Customer Info */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Customer</h2>
            {customer ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name</span>
                  <span className="text-white">{customer.first_name} {customer.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Email</span>
                  <span className="text-white">{customer.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone</span>
                  <span className="text-white">{customer.phone || 'N/A'}</span>
                </div>
                <Link
                  href={`/dashboard/customers/${order.customer_id}`}
                  className="text-[#E85D26] hover:underline inline-block mt-2"
                >
                  View Customer Profile &rarr;
                </Link>
              </div>
            ) : (
              <p className="text-gray-400">Customer information not available</p>
            )}
          </Card>
        </div>

        {/* Order Items */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Order Items</h2>
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                <th className="pb-3">Item</th>
                <th className="pb-3 text-center">Qty</th>
                <th className="pb-3 text-right">Unit Price</th>
                <th className="pb-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items?.length > 0 ? items.map((item) => (
                <tr key={item.id} className="border-b border-gray-800">
                  <td className="py-3 text-white">{item.menu_items?.name || 'Unknown Item'}</td>
                  <td className="py-3 text-center text-white">{item.quantity}</td>
                  <td className="py-3 text-right text-white">${item.unit_price?.toFixed(2)}</td>
                  <td className="py-3 text-right text-white">${item.total_price?.toFixed(2)}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-400 text-center">No items found</td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Subtotal</span>
              <span className="text-white">${order.subtotal?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Delivery Fee</span>
              <span className="text-white">${order.delivery_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Service Fee</span>
              <span className="text-white">${order.service_fee?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tax</span>
              <span className="text-white">${order.tax?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Tip</span>
              <span className="text-white">${order.tip?.toFixed(2) || '0.00'}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t border-gray-700">
              <span className="text-white">Total</span>
              <span className="text-emerald-400">${order.total?.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        </Card>

        {/* Delivery Info */}
        {delivery && (
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Delivery Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-400">Status</p>
                <p className="text-white">{delivery.status?.replace(/_/g, ' ')}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Driver</p>
                <p className="text-white">
                  {delivery.drivers ? `${delivery.drivers.first_name} ${delivery.drivers.last_name}` : 'Not assigned'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Pickup Address</p>
                <p className="text-white">{delivery.pickup_address || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Dropoff Address</p>
                <p className="text-white">{delivery.dropoff_address || 'N/A'}</p>
              </div>
            </div>
            {delivery.id && (
              <Link
                href={`/dashboard/deliveries/${delivery.id}`}
                className="text-[#E85D26] hover:underline inline-block mt-4"
              >
                View Delivery Details &rarr;
              </Link>
            )}
          </Card>
        )}

        {/* Actions */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Update Status
            </button>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
              Issue Refund
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
              Cancel Order
            </button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
