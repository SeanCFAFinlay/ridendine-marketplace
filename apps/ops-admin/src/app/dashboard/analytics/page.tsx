import { createAdminClient, type SupabaseClient } from '@ridendine/db';
import { DashboardLayout } from '@/components/DashboardLayout';
import { KpiTile, PageHeader } from '@ridendine/ui';
import { EventMetrics } from './components/event-metrics';
import { TrendCharts } from './components/trend-charts';

export const dynamic = 'force-dynamic';

async function getAnalyticsData() {
  const supabase = createAdminClient() as unknown as SupabaseClient;

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  try {
    const [
      totalOrdersResult,
      completedOrdersResult,
      revenueResult,
      approvedDriversResult,
      onlineDriversResult,
    ] = await Promise.all([
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('status', 'delivered'),
      supabase
        .from('orders')
        .select('total, service_fee')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .eq('payment_status', 'completed'),
      supabase
        .from('drivers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved'),
      supabase
        .from('driver_presence')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'online'),
    ]);

    const revenueData =
      (revenueResult.data as Array<{ total: number | null; service_fee: number | null }>) ?? [];
    const totalRevenue = revenueData.reduce((sum, order) => sum + (order.total ?? 0), 0);

    const totalOrders = totalOrdersResult.count ?? 0;
    const completedOrders = completedOrdersResult.count ?? 0;
    const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

    return {
      totalOrders,
      completedOrders,
      totalRevenue,
      completionRate,
      approvedDrivers: approvedDriversResult.count ?? 0,
      onlineDrivers: onlineDriversResult.count ?? 0,
    };
  } catch {
    return {
      totalOrders: 0, completedOrders: 0, totalRevenue: 0,
      completionRate: 0, approvedDrivers: 0, onlineDrivers: 0,
    };
  }
}

export default async function AnalyticsPage() {
  const data = await getAnalyticsData();

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Analytics"
          subtitle="Historical trends, revenue analysis, and operational reporting."
        />

        {/* Top KPIs */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            label="Total Revenue (30d)"
            value={`$${data.totalRevenue.toFixed(2)}`}
            className="border-gray-800 bg-opsPanel"
          />
          <KpiTile
            label="Order Volume (30d)"
            value={data.totalOrders.toLocaleString()}
            className="border-gray-800 bg-opsPanel"
          />
          <KpiTile
            label="Completion Rate"
            value={`${data.completionRate.toFixed(1)}%`}
            className="border-gray-800 bg-opsPanel"
          />
          <KpiTile
            label="Drivers Online"
            value={`${data.onlineDrivers}/${data.approvedDrivers}`}
            className="border-gray-800 bg-opsPanel"
          />
        </div>

        {/* Trend charts — uses existing client component with custom bar charts */}
        <TrendCharts />

        {/* Event metrics */}
        <EventMetrics />

        {/* Scope note */}
        <div className="rounded-lg border border-gray-800 bg-opsPanel p-4">
          <p className="text-xs text-gray-500">
            This analytics surface reports live operational counts, recent financial totals, and
            historical trend charts. Cohort analysis and deep forecasting are not yet implemented.
          </p>
        </div>
      </div>
    </DashboardLayout>
  );
}
