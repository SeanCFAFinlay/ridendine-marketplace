import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

async function getCustomerDetails(customerId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: customer, error } = await supabase
    .from('customers')
    .select('*')
    .eq('id', customerId)
    .single();

  if (error || !customer) {
    return null;
  }

  // Get order stats
  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, created_at')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: false })
    .limit(10);

  // Get addresses
  const { data: addresses } = await supabase
    .from('customer_addresses')
    .select('*')
    .eq('customer_id', customerId);

  // Calculate stats
  const orderStats = {
    totalOrders: orders?.length || 0,
    totalSpent: orders?.reduce((sum: number, o: { total: number | null }) => sum + (o.total || 0), 0) || 0,
    completedOrders: orders?.filter((o: { status: string }) => o.status === 'delivered').length || 0,
  };

  return { customer, orders: orders || [], addresses: addresses || [], orderStats };
}

export default async function CustomerDetailPage({ params }: { params: { id: string } }) {
  const data = await getCustomerDetails(params.id);

  if (!data) {
    notFound();
  }

  const { customer, orders, addresses, orderStats } = data;

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Link href="/dashboard/customers" className="text-sm text-gray-400 hover:text-white mb-2 inline-block">
              &larr; Back to Customers
            </Link>
            <h1 className="text-3xl font-bold text-white">
              {customer.first_name} {customer.last_name}
            </h1>
            <p className="mt-1 text-gray-400">
              Customer since {new Date(customer.created_at).toLocaleDateString()}
            </p>
          </div>
          <Badge className="bg-green-500 text-white px-4 py-2">Active</Badge>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Profile Info */}
          <Card className="border-gray-800 bg-[#16213e] p-6 lg:col-span-2">
            <h2 className="text-lg font-semibold text-white mb-4">Profile Information</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-sm text-gray-400">Email</p>
                <p className="text-white">{customer.email || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Phone</p>
                <p className="text-white">{customer.phone || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">User ID</p>
                <p className="text-white font-mono text-sm">{customer.user_id}</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Customer ID</p>
                <p className="text-white font-mono text-sm">{customer.id}</p>
              </div>
            </div>
          </Card>

          {/* Stats */}
          <Card className="border-gray-800 bg-[#16213e] p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Order Statistics</h2>
            <div className="space-y-4">
              <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                <p className="text-2xl font-bold text-emerald-400">${orderStats.totalSpent.toFixed(2)}</p>
                <p className="text-sm text-gray-400">Total Spent</p>
              </div>
              <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{orderStats.totalOrders}</p>
                <p className="text-sm text-gray-400">Total Orders</p>
              </div>
              <div className="text-center p-4 bg-[#1a1a2e] rounded-lg">
                <p className="text-2xl font-bold text-purple-400">{orderStats.completedOrders}</p>
                <p className="text-sm text-gray-400">Completed</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Saved Addresses */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Saved Addresses</h2>
          {addresses.length > 0 ? (
            <div className="space-y-3">
              {addresses.map((address: any) => (
                <div key={address.id} className="p-4 bg-[#1a1a2e] rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{address.label || 'Address'}</p>
                      <p className="text-sm text-gray-400">{address.street_address}</p>
                      <p className="text-sm text-gray-400">
                        {address.city}, {address.state} {address.zip_code}
                      </p>
                    </div>
                    {address.is_default && (
                      <Badge className="bg-blue-500 text-white">Default</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400">No saved addresses</p>
          )}
        </Card>

        {/* Recent Orders */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Recent Orders</h2>
          {orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-400 border-b border-gray-700">
                    <th className="pb-3">Order #</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3">Date</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order: any) => (
                    <tr key={order.id} className="border-b border-gray-800">
                      <td className="py-3 text-white">#{order.order_number}</td>
                      <td className="py-3">
                        <Badge className={`${
                          order.status === 'delivered' ? 'bg-green-500' :
                          order.status === 'cancelled' ? 'bg-red-500' :
                          'bg-blue-500'
                        } text-white`}>
                          {order.status}
                        </Badge>
                      </td>
                      <td className="py-3 text-white">${order.total?.toFixed(2)}</td>
                      <td className="py-3 text-gray-400">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
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
            </div>
          ) : (
            <p className="text-gray-400">No orders yet</p>
          )}
        </Card>

        {/* Actions */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              View All Orders
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              Send Message
            </button>
            <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors">
              Issue Credit
            </button>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  );
}
