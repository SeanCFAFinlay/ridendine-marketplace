import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerClient, getStorefrontByChefId, getOrdersByStorefront } from '@ridendine/db';

export const dynamic = 'force-dynamic';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  accepted: 'bg-blue-50 text-blue-700 border border-blue-200',
  preparing: 'bg-purple-50 text-purple-700 border border-purple-200',
  ready_for_pickup: 'bg-green-50 text-green-700 border border-green-200',
  picked_up: 'bg-teal-50 text-teal-700 border border-teal-200',
  delivered: 'bg-gray-50 text-gray-600 border border-gray-200',
  cancelled: 'bg-red-50 text-red-700 border border-red-200',
};

async function getChefStorefront() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const result: any = await supabase
      .from('chef_profiles')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (result.error || !result.data) return null;
    return await getStorefrontByChefId(supabase as any, result.data.id);
  } catch {
    return null;
  }
}

async function getDashboardData(storefrontId: string) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let allOrders: any[] = [];
    try {
      allOrders = await getOrdersByStorefront(supabase as any, storefrontId);
    } catch {
      /* no orders yet */
    }

    const recentOrders = allOrders.slice(0, 8);
    const activeOrders = allOrders.filter((o) =>
      ['pending', 'accepted', 'preparing', 'ready_for_pickup'].includes(o.status)
    );
    const todayOrders = allOrders.filter((o) => new Date(o.created_at) >= today);
    const monthOrders = allOrders.filter((o) => new Date(o.created_at) >= monthStart);
    const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const monthRevenue = monthOrders.reduce((sum, o) => sum + (o.total || 0), 0);

    let customers: any[] = [];
    if (recentOrders.length > 0) {
      try {
        const { data }: any = await supabase
          .from('customers')
          .select('id, first_name, last_name')
          .in('id', recentOrders.map((o: any) => o.customer_id));
        customers = data || [];
      } catch {
        /* skip */
      }
    }

    const ordersWithCustomers = recentOrders.map((order: any) => ({
      ...order,
      customer: customers?.find((c: any) => c.id === order.customer_id),
    }));

    return {
      stats: {
        activeOrders: activeOrders.length,
        todayRevenue,
        monthOrders: monthOrders.length,
        monthRevenue,
      },
      recentOrders: ordersWithCustomers,
    };
  } catch {
    return {
      stats: { activeOrders: 0, todayRevenue: 0, monthOrders: 0, monthRevenue: 0 },
      recentOrders: [],
    };
  }
}

export default async function DashboardPage() {
  const storefront = await getChefStorefront();

  if (!storefront) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-4 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-orange-50">
          <svg className="h-8 w-8 text-[#E85D26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">No storefront found</h2>
          <p className="mt-1 text-gray-500">Complete your profile setup to get started.</p>
        </div>
        <Link
          href="/dashboard/storefront"
          className="rounded-xl bg-[#E85D26] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#d44e1e]"
        >
          Set Up Storefront
        </Link>
      </div>
    );
  }

  const { stats, recentOrders } = await getDashboardData(storefront.id);

  const statsData = [
    {
      label: 'Active Orders',
      value: stats.activeOrders.toString(),
      sub: 'Orders in progress',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: "Today's Revenue",
      value: `$${Number(stats.todayRevenue).toFixed(2)}`,
      sub: 'Revenue today',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: 'text-[#E85D26]',
      bg: 'bg-orange-50',
    },
    {
      label: 'Orders This Month',
      value: stats.monthOrders.toString(),
      sub: `$${Number(stats.monthRevenue).toFixed(2)} revenue`,
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Average Rating',
      value: storefront.average_rating?.toFixed(1) || 'New',
      sub: `${storefront.total_reviews || 0} reviews`,
      icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {storefront.chef_profiles?.display_name || 'Chef'} 👋
        </h1>
        <p className="mt-1 text-gray-500">
          Here&apos;s what&apos;s happening with <span className="font-medium text-gray-700">{storefront.name}</span> today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsData.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{stat.label}</p>
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg}`}>
                <svg className={`h-5 w-5 ${stat.color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} />
                </svg>
              </div>
            </div>
            <p className="mt-3 text-2xl font-bold text-gray-900">{stat.value}</p>
            <p className="mt-1 text-xs text-gray-400">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/dashboard/orders"
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-[#E85D26]/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
            <svg className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Manage Orders</p>
            <p className="text-xs text-gray-500">View and update order status</p>
          </div>
        </Link>
        <Link
          href="/dashboard/menu"
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-[#E85D26]/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
            <svg className="h-5 w-5 text-[#E85D26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Edit Menu</p>
            <p className="text-xs text-gray-500">Add or update menu items</p>
          </div>
        </Link>
        <Link
          href="/dashboard/storefront"
          className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md hover:border-[#E85D26]/30"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50">
            <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Storefront</p>
            <p className="text-xs text-gray-500">Update your profile &amp; hours</p>
          </div>
        </Link>
      </div>

      {/* Recent Orders */}
      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
          <h2 className="font-bold text-gray-900">Recent Orders</h2>
          <Link
            href="/dashboard/orders"
            className="text-sm font-medium text-[#E85D26] hover:text-[#d44e1e]"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          {recentOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
                <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">No orders yet</p>
              <p className="mt-1 text-xs text-gray-400">Orders will appear here once customers start ordering.</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                  <th className="px-6 py-3">Order #</th>
                  <th className="px-6 py-3">Customer</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Total</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-3.5 text-sm font-semibold text-gray-900">
                      {order.order_number}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-600">
                      {order.customer
                        ? `${order.customer.first_name} ${order.customer.last_name}`
                        : 'Guest'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          STATUS_STYLES[order.status] || 'bg-gray-50 text-gray-600 border border-gray-200'
                        }`}
                      >
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-sm font-medium text-gray-900">
                      ${Number(order.total || 0).toFixed(2)}
                    </td>
                    <td className="px-6 py-3.5 text-sm text-gray-400">
                      {new Date(order.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
