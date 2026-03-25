import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

function getStatusVariant(
  status: string
): 'success' | 'warning' | 'error' | 'info' | 'default' {
  switch (status) {
    case 'delivered':
    case 'completed':
      return 'success';
    case 'preparing':
    case 'accepted':
      return 'info';
    case 'pending':
      return 'warning';
    case 'cancelled':
    case 'failed':
      return 'error';
    default:
      return 'default';
  }
}

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function OrdersPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  // Fetch orders with storefront info
  const { data: ordersData } = await supabase
    .from('orders')
    .select('*, chef_storefronts(name)')
    .order('created_at', { ascending: false })
    .limit(50);

  const orders = (ordersData || []) as any[];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Order Overview</h1>
            <p className="mt-2 text-gray-400">Monitor all platform orders</p>
          </div>
          <Badge className="bg-[#E85D26] text-white">{orders.length} Orders</Badge>
        </div>

        <Card className="border-gray-800 bg-[#16213e]">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800 text-left text-sm text-gray-400">
                  <th className="pb-4 pl-6 font-medium">Order Number</th>
                  <th className="pb-4 font-medium">Chef Storefront</th>
                  <th className="pb-4 font-medium">Status</th>
                  <th className="pb-4 font-medium">Total</th>
                  <th className="pb-4 font-medium">Created</th>
                  <th className="pb-4 pr-6 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {orders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-800/50">
                    <td className="py-4 pl-6 font-mono font-medium text-white">
                      {order.order_number}
                    </td>
                    <td className="py-4 text-gray-300">
                      {order.chef_storefronts?.name ?? 'N/A'}
                    </td>
                    <td className="py-4">
                      <Badge variant={getStatusVariant(order.status)}>
                        {formatStatus(order.status)}
                      </Badge>
                    </td>
                    <td className="py-4 font-medium text-white">
                      ${(order.total / 100).toFixed(2)}
                    </td>
                    <td className="py-4 text-gray-400">
                      {new Date(order.created_at).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-4 pr-6">
                      <Link
                        href={`/dashboard/orders/${order.id}`}
                        className="text-[#E85D26] hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="py-12 text-center text-gray-400">No orders found</div>
            )}
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
