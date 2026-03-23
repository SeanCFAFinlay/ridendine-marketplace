import { cookies } from 'next/headers';
import Link from 'next/link';
import { Card, Badge } from '@ridendine/ui';
import { createServerClient, getStorefrontByChefId, getOrdersByStorefront } from '@ridendine/db';

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

async function getDashboardData(storefrontId: string) {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const allOrders = await getOrdersByStorefront(supabase as any, storefrontId);
  const recentOrders = allOrders.slice(0, 5);

  const activeOrders = allOrders.filter(o =>
    ['pending', 'accepted', 'preparing', 'ready_for_pickup'].includes(o.status)
  );

  const todayOrders = allOrders.filter(o =>
    new Date(o.created_at) >= today
  );

  const monthOrders = allOrders.filter(o =>
    new Date(o.created_at) >= monthStart
  );

  const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total, 0);

  const { data: customers }: any = await supabase
    .from('customers')
    .select('id, first_name, last_name')
    .in('id', recentOrders.map(o => o.customer_id));

  const ordersWithCustomers = recentOrders.map((order: any) => ({
    ...order,
    customer: customers?.find((c: any) => c.id === order.customer_id),
  }));

  return {
    stats: {
      activeOrders: activeOrders.length,
      todayRevenue,
      monthOrders: monthOrders.length,
    },
    recentOrders: ordersWithCustomers,
  };
}

export default async function DashboardPage() {
  const storefront = await getChefStorefront();

  if (!storefront) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-gray-500">No storefront found. Please complete your setup.</p>
      </div>
    );
  }

  const { stats, recentOrders } = await getDashboardData(storefront.id);

  const statsData = [
    { label: 'Active Orders', value: stats.activeOrders.toString(), change: 'Orders in progress' },
    { label: "Today's Revenue", value: `$${stats.todayRevenue.toFixed(2)}`, change: 'Revenue today' },
    { label: 'Total Orders (Month)', value: stats.monthOrders.toString(), change: 'This month' },
    { label: 'Average Rating', value: storefront.average_rating?.toFixed(1) || 'N/A', change: `${storefront.total_reviews} reviews` },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      <p className="mt-1 text-gray-500">Welcome back! Here&apos;s what&apos;s happening today.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <Card key={stat.label}>
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-400">{stat.change}</p>
          </Card>
        ))}
      </div>

      <Card className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <Link href="/dashboard/orders" className="text-sm text-[#E85D26] hover:text-[#d14d1a]">
            View all →
          </Link>
        </div>
        <div className="mt-4 overflow-x-auto">
          {recentOrders.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-500">No orders yet</p>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 text-left text-sm text-gray-500">
                  <th className="pb-3 font-medium">Order</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50">
                    <td className="py-3 font-medium text-gray-900">{order.order_number}</td>
                    <td className="py-3 text-gray-600">
                      {order.customer ? `${order.customer.first_name} ${order.customer.last_name}` : 'Unknown'}
                    </td>
                    <td className="py-3">
                      <Badge
                        variant={
                          order.status === 'preparing' ? 'info' :
                          order.status === 'pending' ? 'warning' :
                          order.status === 'ready_for_pickup' ? 'success' : 'default'
                        }
                      >
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="py-3 text-gray-900">${order.total.toFixed(2)}</td>
                    <td className="py-3 text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
