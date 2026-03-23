import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient, getPendingChefApprovals } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const [ordersResult, deliveriesResult, chefApprovalsResult] = await Promise.all([
    supabase.from('orders').select('*', { count: 'exact', head: true }),
    supabase.from('deliveries').select('*', { count: 'exact', head: true }).in('status', [
      'assigned',
      'accepted',
      'en_route_to_pickup',
      'picked_up',
      'en_route_to_dropoff',
    ]),
    getPendingChefApprovals(supabase as any),
  ]);

  return {
    totalOrders: ordersResult.count ?? 0,
    activeDeliveries: deliveriesResult.count ?? 0,
    pendingApprovals: chefApprovalsResult.length,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const statCards = [
    {
      label: 'Total Orders',
      value: stats.totalOrders.toString(),
      change: 'All time',
      color: 'text-blue-400',
    },
    {
      label: 'Active Deliveries',
      value: stats.activeDeliveries.toString(),
      change: 'In progress',
      color: 'text-green-400',
    },
    {
      label: 'Pending Chef Approvals',
      value: stats.pendingApprovals.toString(),
      change: 'Awaiting review',
      color: 'text-[#E85D26]',
    },
    {
      label: 'Platform Health',
      value: '100%',
      change: 'All systems operational',
      color: 'text-emerald-400',
    },
  ];

  const quickActions = [
    { href: '/dashboard/chefs/approvals', label: 'Chef Approvals', count: stats.pendingApprovals },
    { href: '/dashboard/orders', label: 'Order Overview', count: stats.totalOrders },
    { href: '/dashboard/deliveries', label: 'Delivery Status', count: stats.activeDeliveries },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Operations Dashboard</h1>
          <p className="mt-2 text-gray-400">Real-time platform overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.label} className="border-gray-800 bg-[#16213e] p-6">
              <p className="text-sm text-gray-400">{stat.label}</p>
              <p className={`mt-2 text-4xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="mt-1 text-xs text-gray-500">{stat.change}</p>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="cursor-pointer border-gray-800 bg-[#16213e] p-6 transition-all hover:border-[#E85D26] hover:shadow-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{action.label}</span>
                  <Badge className="bg-[#E85D26] text-white">{action.count}</Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
