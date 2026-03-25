import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getDeliveryDetails(deliveryId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: delivery, error } = await supabase
    .from('deliveries')
    .select(`
      *,
      orders (
        id,
        order_number,
        status,
        total,
        customers (
          first_name,
          last_name,
          phone
        ),
        chef_storefronts (
          name
        )
      ),
      drivers (
        id,
        first_name,
        last_name,
        phone
      )
    `)
    .eq('id', deliveryId)
    .single();

  if (error || !delivery) {
    return null;
  }

  return delivery;
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-500',
  assigned: 'bg-blue-500',
  accepted: 'bg-indigo-500',
  en_route_to_pickup: 'bg-purple-500',
  arrived_at_pickup: 'bg-cyan-500',
  picked_up: 'bg-teal-500',
  en_route_to_dropoff: 'bg-orange-500',
  arrived_at_dropoff: 'bg-amber-500',
  delivered: 'bg-green-500',
  cancelled: 'bg-red-500',
  failed: 'bg-red-700',
};

export default async function DeliveryDetailPage({ params }: { params: { id: string } }) {
  const delivery = await getDeliveryDetails(params.id);

  if (!delivery) {
    notFound();
  }

  const order = delivery.orders as {
    id: string;
    order_number: string;
    status: string;
    total: number;
    customers: { first_name: string; last_name: string; phone: string } | null;
    chef_storefronts: { name: string } | null;
  } | null;

  const driver = delivery.drivers as { id: string; first_name: string; last_name: string; phone: string } | null;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/deliveries" className="text-sm text-gray-400 hover:text-white mb-2 inline-block">
              &larr; Back to Deliveries
            </Link>
            <h1 className="text-3xl font-bold text-white">
              Delivery #{delivery.id.slice(0, 8)}
            </h1>
            <p className="mt-1 text-gray-400">
              Created {new Date(delivery.created_at).toLocaleString()}
            </p>
          </div>
          <Badge className={`${statusColors[delivery.status] || 'bg-gray-500'} text-white px-4 py-2`}>
            {delivery.status?.replace(/_/g, ' ').toUpperCase()}
          </Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Order Info */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Order Information</h2>
            {order ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Number</span>
                  <span className="text-white">#{order.order_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Order Total</span>
                  <span className="text-emerald-400 font-bold">${order.total?.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Restaurant</span>
                  <span className="text-white">{order.chef_storefronts?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Customer</span>
                  <span className="text-white">
                    {order.customers
                      ? `${order.customers.first_name} ${order.customers.last_name}`
                      : 'N/A'}
                  </span>
                </div>
                <Link
                  href={`/dashboard/orders/${order.id}`}
                  className="text-[#E85D26] hover:underline inline-block mt-2"
                >
                  View Order Details &rarr;
                </Link>
              </div>
            ) : (
              <p className="text-gray-400">Order information not available</p>
            )}
          </Card>

          {/* Driver Info */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Driver</h2>
            {driver ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Name</span>
                  <span className="text-white">{driver.first_name} {driver.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Phone</span>
                  <span className="text-white">{driver.phone || 'N/A'}</span>
                </div>
                <Link
                  href={`/dashboard/drivers/${driver.id}`}
                  className="text-[#E85D26] hover:underline inline-block mt-2"
                >
                  View Driver Profile &rarr;
                </Link>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-3">No driver assigned</p>
                <button className="px-4 py-2 bg-[#E85D26] text-white rounded-lg hover:bg-[#d54d1a] transition-colors">
                  Assign Driver
                </button>
              </div>
            )}
          </Card>
        </div>

        {/* Route Info */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Route Information</h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="p-4 bg-[#1a1a2e] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-orange-400 text-lg">📍</span>
                <span className="font-medium text-white">Pickup</span>
              </div>
              <p className="text-gray-300">{delivery.pickup_address || 'Address not set'}</p>
              {delivery.pickup_lat && delivery.pickup_lng && (
                <p className="text-sm text-gray-500 mt-1">
                  {delivery.pickup_lat}, {delivery.pickup_lng}
                </p>
              )}
            </div>
            <div className="p-4 bg-[#1a1a2e] rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-blue-400 text-lg">🏠</span>
                <span className="font-medium text-white">Dropoff</span>
              </div>
              <p className="text-gray-300">{delivery.dropoff_address || 'Address not set'}</p>
              {delivery.dropoff_lat && delivery.dropoff_lng && (
                <p className="text-sm text-gray-500 mt-1">
                  {delivery.dropoff_lat}, {delivery.dropoff_lng}
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <p className="text-sm text-gray-400">Distance</p>
              <p className="text-white">{delivery.distance_km ? `${delivery.distance_km} km` : 'N/A'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Delivery Fee</p>
              <p className="text-white">${delivery.delivery_fee?.toFixed(2) || '0.00'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-400">Driver Payout</p>
              <p className="text-emerald-400">${delivery.driver_payout?.toFixed(2) || '0.00'}</p>
            </div>
          </div>
          <Link href="/dashboard/map" className="text-[#E85D26] hover:underline inline-block mt-4">
            View on Live Map &rarr;
          </Link>
        </Card>

        {/* Timeline */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Delivery Timeline</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div>
                <p className="text-white">Order Created</p>
                <p className="text-sm text-gray-400">{new Date(delivery.created_at).toLocaleString()}</p>
              </div>
            </div>
            {delivery.assigned_at && (
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <div>
                  <p className="text-white">Driver Assigned</p>
                  <p className="text-sm text-gray-400">{new Date(delivery.assigned_at).toLocaleString()}</p>
                </div>
              </div>
            )}
            {delivery.picked_up_at && (
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <div>
                  <p className="text-white">Order Picked Up</p>
                  <p className="text-sm text-gray-400">{new Date(delivery.picked_up_at).toLocaleString()}</p>
                </div>
              </div>
            )}
            {delivery.delivered_at && (
              <div className="flex items-center gap-4">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <div>
                  <p className="text-white">Delivered</p>
                  <p className="text-sm text-gray-400">{new Date(delivery.delivered_at).toLocaleString()}</p>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              Update Status
            </button>
            {!driver && (
              <button className="px-4 py-2 bg-[#E85D26] text-white rounded-lg hover:bg-[#d54d1a] transition-colors">
                Assign Driver
              </button>
            )}
            {driver && delivery.status !== 'delivered' && delivery.status !== 'cancelled' && (
              <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
                Reassign Driver
              </button>
            )}
            {delivery.status !== 'cancelled' && delivery.status !== 'delivered' && (
              <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                Cancel Delivery
              </button>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
