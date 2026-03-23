import { Card, Badge } from '@ridendine/ui';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

function getDeliveryStatusVariant(
  status: string
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'picked_up':
    case 'en_route_to_dropoff':
      return 'info';
    case 'assigned':
    case 'accepted':
    case 'en_route_to_pickup':
      return 'warning';
    default:
      return 'default';
  }
}

function formatDeliveryStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function DeliveriesPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  // Fetch deliveries with order info
  const { data: deliveriesData } = await supabase
    .from('deliveries')
    .select('*, orders!inner(order_number, total)')
    .in('status', [
      'assigned',
      'accepted',
      'en_route_to_pickup',
      'picked_up',
      'en_route_to_dropoff',
    ])
    .order('created_at', { ascending: false })
    .limit(20);

  const deliveries = (deliveriesData || []) as any[];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Delivery Overview</h1>
          <p className="mt-2 text-gray-400">Monitor active deliveries and driver status</p>
        </div>

        <div className="grid gap-6">
          {/* Active Deliveries */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Active Deliveries</h2>
              <Badge className="bg-[#E85D26] text-white">
                {deliveries.length} Active
              </Badge>
            </div>
            <div className="space-y-3">
              {deliveries.map((delivery) => (
                <div
                  key={delivery.id}
                  className="rounded-lg border border-gray-800 bg-[#1a1a2e] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-white">
                      {delivery.orders?.order_number}
                    </span>
                    <Badge variant={getDeliveryStatusVariant(delivery.status)}>
                      {formatDeliveryStatus(delivery.status)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-gray-500">
                    {delivery.pickup_address} → {delivery.dropoff_address}
                  </p>
                  <p className="mt-2 font-medium text-white">
                    ${((delivery.orders?.total ?? 0) / 100).toFixed(2)}
                  </p>
                </div>
              ))}
              {deliveries.length === 0 && (
                <div className="py-8 text-center text-gray-400">No active deliveries</div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
