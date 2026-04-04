import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { cookies } from 'next/headers';
import {
  createServerClient,
  createAdminClient,
  getPendingChefApprovals,
  listOpsDeliveries,
  listOpsDrivers,
  listOpsOrders,
  listOpsSupportTickets,
  type SupabaseClient,
} from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { RealTimeStats } from '@/components/dashboard/real-time-stats';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { OrdersHeatmap } from '@/components/dashboard/orders-heatmap';
import { AlertsPanel } from '@/components/dashboard/alerts-panel';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const adminClient = createAdminClient() as unknown as SupabaseClient;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    // Core queries that should always work
    const [
      ordersResult,
      todayOrdersResult,
      yesterdayOrdersResult,
      todayRevenueResult,
      yesterdayRevenueResult,
      monthRevenueResult,
      chefsResult,
      customersResult,
      activeStorefrontsResult,
      orders,
      deliveries,
      drivers,
      supportTickets,
      approvals,
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString()),
      supabase.from('orders').select('total').gte('created_at', today.toISOString()).eq('payment_status', 'completed'),
      supabase.from('orders').select('total')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())
        .eq('payment_status', 'completed'),
      supabase.from('orders').select('total').gte('created_at', monthAgo.toISOString()).eq('payment_status', 'completed'),
      supabase.from('chef_profiles').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
      supabase.from('chef_storefronts').select('*', { count: 'exact', head: true }).eq('is_active', true),
      listOpsOrders(adminClient),
      listOpsDeliveries(adminClient),
      listOpsDrivers(adminClient),
      listOpsSupportTickets(adminClient),
      getPendingChefApprovals(adminClient),
    ]);

    const todayRevenue = (todayRevenueResult.data as Array<{ total: number }> || []).reduce((sum, o) => sum + (o.total || 0), 0);
    const yesterdayRevenue = (yesterdayRevenueResult.data as Array<{ total: number }> || []).reduce((sum, o) => sum + (o.total || 0), 0);
    const monthRevenue = (monthRevenueResult.data as Array<{ total: number }> || []).reduce((sum, o) => sum + (o.total || 0), 0);
    const activeDeliveries = deliveries.filter((delivery) =>
      ['assigned', 'accepted', 'en_route_to_pickup', 'picked_up', 'en_route_to_dropoff'].includes(delivery.status)
    ).length;
    const totalDrivers = drivers.filter((driver) => driver.status === 'approved').length;
    const onlineDrivers = drivers.filter((driver) => driver.driver_presence?.status === 'online').length;
    const openSupport = supportTickets.filter((ticket) => !['resolved', 'closed'].includes(ticket.status)).length;

    const revenueGrowth = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;

    const orderGrowth = (yesterdayOrdersResult.count || 0) > 0
      ? (((todayOrdersResult.count || 0) - (yesterdayOrdersResult.count || 0)) / (yesterdayOrdersResult.count || 1)) * 100
      : 0;

    return {
      totalOrders: ordersResult.count ?? 0,
      todayOrders: todayOrdersResult.count ?? 0,
      activeDeliveries,
      pendingApprovals: approvals.length,
      todayRevenue,
      monthRevenue,
      revenueGrowth,
      orderGrowth,
      totalDrivers,
      onlineDrivers,
      activeChefs: chefsResult.count ?? 0,
      totalCustomers: customersResult.count ?? 0,
      activeStorefronts: activeStorefrontsResult.count ?? 0,
      ordersNeedingAction: orders.filter((order) => ['pending', 'accepted', 'preparing'].includes(order.status)).length,
      supportOpen: openSupport,
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    // Return default values if everything fails
    return {
      totalOrders: 0,
      todayOrders: 0,
      activeDeliveries: 0,
      pendingApprovals: 0,
      todayRevenue: 0,
      monthRevenue: 0,
      revenueGrowth: 0,
      orderGrowth: 0,
      totalDrivers: 0,
      onlineDrivers: 0,
      activeChefs: 0,
      totalCustomers: 0,
      activeStorefronts: 0,
      ordersNeedingAction: 0,
      supportOpen: 0,
    };
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  const primaryStats = [
    {
      label: "Today's Revenue",
      value: `$${stats.todayRevenue.toFixed(2)}`,
      change: `${stats.revenueGrowth >= 0 ? '+' : ''}${stats.revenueGrowth.toFixed(1)}%`,
      changeType: stats.revenueGrowth >= 0 ? 'positive' : 'negative',
      color: 'text-emerald-400',
    },
    {
      label: "Today's Orders",
      value: stats.todayOrders.toString(),
      change: `${stats.orderGrowth >= 0 ? '+' : ''}${stats.orderGrowth.toFixed(1)}%`,
      changeType: stats.orderGrowth >= 0 ? 'positive' : 'negative',
      color: 'text-blue-400',
    },
    {
      label: 'Active Deliveries',
      value: stats.activeDeliveries.toString(),
      change: 'In progress now',
      changeType: 'neutral',
      color: 'text-purple-400',
    },
    {
      label: 'Drivers Online',
      value: `${stats.onlineDrivers}/${stats.totalDrivers}`,
      change: `${Math.round((stats.onlineDrivers / Math.max(stats.totalDrivers, 1)) * 100)}% available`,
      changeType: 'neutral',
      color: 'text-green-400',
    },
  ];

  const secondaryStats = [
    { label: 'Monthly Revenue', value: `$${stats.monthRevenue.toFixed(2)}` },
    { label: 'Orders Needing Action', value: stats.ordersNeedingAction.toString() },
    { label: 'Active Chefs', value: stats.activeChefs.toString() },
    { label: 'Live Storefronts', value: stats.activeStorefronts.toString() },
    { label: 'Total Customers', value: stats.totalCustomers.toLocaleString() },
    { label: 'Open Support', value: stats.supportOpen.toString() },
  ];

  const quickActions = [
    { href: '/dashboard/chefs/approvals', label: 'Chef Approvals', count: stats.pendingApprovals, urgent: stats.pendingApprovals > 0 },
    { href: '/dashboard/map', label: 'Live Map', count: stats.activeDeliveries },
    { href: '/dashboard/orders', label: 'All Orders', count: stats.totalOrders },
    { href: '/dashboard/drivers', label: 'Manage Drivers', count: stats.totalDrivers },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Operations Command Center</h1>
            <p className="mt-1 text-gray-400">Real-time platform monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-green-400">Live</span>
          </div>
        </div>

        {/* Primary Stats */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {primaryStats.map((stat) => (
            <Card key={stat.label} className="border-gray-800 bg-[#16213e] p-6">
              <p className="text-sm text-gray-400">{stat.label}</p>
              <p className={`mt-2 text-3xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className={`mt-1 text-sm ${
                stat.changeType === 'positive' ? 'text-green-400' :
                stat.changeType === 'negative' ? 'text-red-400' : 'text-gray-500'
              }`}>
                {stat.change}
              </p>
            </Card>
          ))}
        </div>

        {/* Real-time updates and alerts */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <RealTimeStats />
          </div>
          <div>
            <AlertsPanel pendingApprovals={stats.pendingApprovals} />
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <RevenueChart />
          <OrdersHeatmap />
        </div>

        {/* Secondary Stats */}
        <Card className="border-gray-800 bg-[#16213e] p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Platform Overview</h3>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
            {secondaryStats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-xs text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className={`cursor-pointer border-gray-800 bg-[#16213e] p-6 transition-all hover:border-[#E85D26] hover:shadow-lg ${
                action.urgent ? 'border-orange-500 animate-pulse' : ''
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white">{action.label}</span>
                  <Badge className={action.urgent ? 'bg-orange-500 text-white' : 'bg-gray-700 text-gray-300'}>
                    {action.count}
                  </Badge>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
