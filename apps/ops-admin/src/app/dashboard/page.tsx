import { Card, Badge } from '@ridendine/ui';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine } from '@/lib/engine';
import { LiveBoard } from './_components/live-board';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [
      ordersResult,
      todayOrdersResult,
      yesterdayOrdersResult,
      todayRevenueResult,
      yesterdayRevenueResult,
      monthRevenueResult,
      chefsResult,
      customersResult,
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
      supabase.from('chef_storefronts').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('customers').select('*', { count: 'exact', head: true }),
    ]);

    let activeDeliveries = 0;
    let pendingApprovals = 0;
    let totalDrivers = 0;
    let onlineDrivers = 0;
    let avgDeliveryTime: number | null = null;

    try {
      const deliveriesResult = await (supabase as any).from('deliveries').select('*', { count: 'exact', head: true }).in('status', [
        'assigned', 'accepted', 'en_route_to_pickup', 'picked_up', 'en_route_to_dropoff',
      ]);
      activeDeliveries = deliveriesResult.count ?? 0;
    } catch { /* table may not exist */ }

    try {
      const approvalsResult = await (supabase as any).from('chef_profiles').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      pendingApprovals = approvalsResult.count ?? 0;
    } catch { /* non-critical */ }

    try {
      const driversResult = await (supabase as any).from('drivers').select('*', { count: 'exact', head: true }).eq('status', 'approved');
      totalDrivers = driversResult.count ?? 0;
    } catch { /* non-critical */ }

    try {
      const onlineResult = await (supabase as any).from('driver_presence').select('*', { count: 'exact', head: true }).eq('status', 'online');
      onlineDrivers = onlineResult.count ?? 0;
    } catch { /* non-critical */ }

    try {
      const completedDeliveriesResult = await (supabase as any)
        .from('deliveries')
        .select('created_at, actual_dropoff_at')
        .not('actual_dropoff_at', 'is', null)
        .gte('created_at', monthAgo.toISOString())
        .limit(500);
      const rows = (completedDeliveriesResult.data ??
        []) as Array<{ created_at: string; actual_dropoff_at: string | null }>;
      const durations = rows
        .map((row) => {
          if (!row.actual_dropoff_at) return null;
          const minutes =
            (new Date(row.actual_dropoff_at).getTime() - new Date(row.created_at).getTime()) /
            60000;
          return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
        })
        .filter((v): v is number => v !== null);
      if (durations.length > 0) {
        avgDeliveryTime = durations.reduce((sum, v) => sum + v, 0) / durations.length;
      }
    } catch {
      avgDeliveryTime = null;
    }

    const todayRevenue = (todayRevenueResult.data as Array<{ total: number }> || []).reduce((sum, o) => sum + (o.total || 0), 0);
    const yesterdayRevenue = (yesterdayRevenueResult.data as Array<{ total: number }> || []).reduce((sum, o) => sum + (o.total || 0), 0);
    const monthRevenue = (monthRevenueResult.data as Array<{ total: number }> || []).reduce((sum, o) => sum + (o.total || 0), 0);

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
      pendingApprovals,
      todayRevenue,
      monthRevenue,
      revenueGrowth,
      orderGrowth,
      totalDrivers,
      onlineDrivers,
      activeChefs: chefsResult.count ?? 0,
      totalCustomers: customersResult.count ?? 0,
      avgDeliveryTime,
      platformFee: monthRevenue * 0.15,
    };
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return {
      totalOrders: 0, todayOrders: 0, activeDeliveries: 0, pendingApprovals: 0,
      todayRevenue: 0, monthRevenue: 0, revenueGrowth: 0, orderGrowth: 0,
      totalDrivers: 0, onlineDrivers: 0, activeChefs: 0, totalCustomers: 0,
      avgDeliveryTime: null, platformFee: 0,
    };
  }
}

async function getEngineStatus() {
  try {
    const dashboard = await getEngine().ops.getDashboard();
    return dashboard;
  } catch (error) {
    console.error('Engine dashboard error:', error);
    return null;
  }
}

export default async function DashboardPage() {
  const [stats, engineData] = await Promise.all([
    getDashboardStats(),
    getEngineStatus(),
  ]);

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

  const quickActions = [
    { href: '/dashboard/chefs/approvals', label: 'Chef Approvals', count: stats.pendingApprovals, urgent: stats.pendingApprovals > 0 },
    { href: '/dashboard/map', label: 'Live Map', count: stats.activeDeliveries },
    { href: '/dashboard/orders', label: 'All Orders', count: stats.totalOrders },
    { href: '/dashboard/drivers', label: 'Manage Drivers', count: stats.totalDrivers },
    { href: '/dashboard/finance', label: 'Finance', count: engineData?.pendingRefunds ?? 0 },
    { href: '/dashboard/support', label: 'Support', count: engineData?.supportBacklog ?? 0 },
  ];

  const opsQueues = [
    {
      href: '/dashboard/deliveries?queue=pending',
      label: 'Pending Dispatch',
      value: engineData?.pendingDispatch ?? 0,
      description: 'Orders waiting for driver assignment',
      tone: (engineData?.pendingDispatch ?? 0) > 5 ? 'critical' : (engineData?.pendingDispatch ?? 0) > 0 ? 'warning' : 'default',
    },
    {
      href: '/dashboard/deliveries?queue=escalated',
      label: 'Escalations',
      value: engineData?.deliveryEscalations ?? 0,
      description: 'Deliveries requiring manual intervention',
      tone: (engineData?.deliveryEscalations ?? 0) > 0 ? 'critical' : 'default',
    },
    {
      href: '/dashboard/finance',
      label: 'Pending Refunds',
      value: engineData?.pendingRefunds ?? 0,
      description: 'Refund cases awaiting review',
      tone: (engineData?.pendingRefunds ?? 0) > 0 ? 'warning' : 'default',
    },
    {
      href: '/dashboard/support',
      label: 'Support Backlog',
      value: engineData?.supportBacklog ?? 0,
      description: 'Open support tickets',
      tone: (engineData?.supportBacklog ?? 0) > 10 ? 'warning' : 'default',
    },
  ];

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Operations Command Center</h1>
            <p className="mt-1 text-gray-400">Live board · KPIs · engine pressure</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm text-green-400">Live</span>
          </div>
        </div>

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

        {engineData && (
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Open Exceptions</p>
              <p className="mt-1 text-lg font-semibold text-white">{engineData.openExceptions}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">SLA Breaches Today</p>
              <p className={`mt-1 text-lg font-semibold ${engineData.slaBreaches > 0 ? 'text-red-400' : 'text-white'}`}>
                {engineData.slaBreaches}
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Storefront Risks</p>
              <p className="mt-1 text-lg font-semibold text-white">{engineData.storefrontRisks}</p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Drivers Online</p>
              <p className="mt-1 text-lg font-semibold text-white">
                {engineData.driversOnline} / {engineData.driversBusy} busy
              </p>
            </div>
            <div className="rounded-lg border border-gray-800 bg-[#16213e] px-4 py-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Active Orders</p>
              <p className="mt-1 text-lg font-semibold text-white">{engineData.activeOrders}</p>
            </div>
          </div>
        )}

        <LiveBoard />

        {engineData && (
          <>
            <h2 className="text-lg font-semibold text-white pt-2">Operational Queues</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {opsQueues.map((queue) => (
                <Link key={queue.href} href={queue.href}>
                  <Card className="h-full border-gray-800 bg-[#16213e] p-6 transition-colors hover:border-[#E85D26]">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-gray-400">{queue.label}</p>
                        <p className="mt-2 text-3xl font-bold text-white">{queue.value}</p>
                        <p className="mt-1 text-xs text-gray-500">{queue.description}</p>
                      </div>
                      <Badge
                        className={
                          queue.tone === 'critical'
                            ? 'bg-red-500/20 text-red-200'
                            : queue.tone === 'warning'
                              ? 'bg-yellow-500/20 text-yellow-200'
                              : 'bg-gray-700 text-gray-200'
                        }
                      >
                        {queue.tone}
                      </Badge>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className={`cursor-pointer border-gray-800 bg-[#16213e] p-5 transition-all hover:border-[#E85D26] hover:shadow-lg ${
                action.urgent ? 'border-orange-500/70' : ''
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-medium text-white text-sm">{action.label}</span>
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
