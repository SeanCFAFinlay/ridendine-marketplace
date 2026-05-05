import Link from 'next/link';
import { cookies } from 'next/headers';
import { createServerClient } from '@ridendine/db';
import { KpiTile, PageHeader, StatusBadge } from '@ridendine/ui';
import { DashboardLayout } from '@/components/DashboardLayout';
import { getEngine } from '@/lib/engine';
import { LiveBoard } from './_components/live-board';
import { LiveBoardBoundary } from './_components/live-board-boundary';

export const dynamic = 'force-dynamic';

async function getDashboardStats() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);

  try {
    const [
      todayOrdersResult,
      yesterdayOrdersResult,
      todayRevenueResult,
      yesterdayRevenueResult,
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString()),
      supabase.from('orders').select('total').gte('created_at', today.toISOString()).eq('payment_status', 'completed'),
      supabase.from('orders').select('total')
        .gte('created_at', yesterday.toISOString())
        .lt('created_at', today.toISOString())
        .eq('payment_status', 'completed'),
    ]);

    let activeDeliveries = 0;
    let totalDrivers = 0;
    let onlineDrivers = 0;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const deliveriesResult = await (supabase as any).from('deliveries').select('*', { count: 'exact', head: true }).in('status', [
        'assigned', 'accepted', 'en_route_to_pickup', 'picked_up', 'en_route_to_dropoff',
      ]);
      activeDeliveries = deliveriesResult.count ?? 0;
    } catch { /* table may not exist */ }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const driversResult = await (supabase as any).from('drivers').select('*', { count: 'exact', head: true }).eq('status', 'approved');
      totalDrivers = driversResult.count ?? 0;
    } catch { /* non-critical */ }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onlineResult = await (supabase as any).from('driver_presence').select('*', { count: 'exact', head: true }).eq('status', 'online');
      onlineDrivers = onlineResult.count ?? 0;
    } catch { /* non-critical */ }

    // Compute avg delivery time from actual_dropoff_at (not hardcoded)
    try {
      const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const completedResult = await (supabase as any)
        .from('deliveries')
        .select('created_at, actual_dropoff_at')
        .not('actual_dropoff_at', 'is', null)
        .gte('created_at', monthAgo.toISOString())
        .limit(500);
      const rows = (completedResult.data ?? []) as Array<{ created_at: string; actual_dropoff_at: string | null }>;
      const durations = rows
        .map((row) => {
          if (!row.actual_dropoff_at) return null;
          const minutes = (new Date(row.actual_dropoff_at).getTime() - new Date(row.created_at).getTime()) / 60000;
          return Number.isFinite(minutes) && minutes > 0 ? minutes : null;
        })
        .filter((v): v is number => v !== null);
      // avgDeliveryTime available for future KpiTile use
      void (durations.length > 0 ? durations.reduce((s, v) => s + v, 0) / durations.length : null);
    } catch { /* non-critical */ }

    const todayRevenue = (todayRevenueResult.data as Array<{ total: number }> || []).reduce((sum, o) => sum + (o.total || 0), 0);
    const yesterdayRevenue = (yesterdayRevenueResult.data as Array<{ total: number }> || []).reduce((sum, o) => sum + (o.total || 0), 0);

    const revenueGrowth = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0;

    const orderGrowth = (yesterdayOrdersResult.count || 0) > 0
      ? (((todayOrdersResult.count || 0) - (yesterdayOrdersResult.count || 0)) / (yesterdayOrdersResult.count || 1)) * 100
      : 0;

    return {
      todayOrders: todayOrdersResult.count ?? 0,
      activeDeliveries,
      todayRevenue,
      revenueGrowth,
      orderGrowth,
      totalDrivers,
      onlineDrivers,
    };
  } catch {
    return {
      todayOrders: 0, activeDeliveries: 0, todayRevenue: 0,
      revenueGrowth: 0, orderGrowth: 0, totalDrivers: 0, onlineDrivers: 0,
    };
  }
}

async function getEngineStatus() {
  try {
    return await getEngine().ops.getDashboard();
  } catch {
    return null;
  }
}

type PressureTone = 'danger' | 'warning' | 'success' | 'idle';

function getPressureTone(value: number, warnAt: number, critAt: number): PressureTone {
  if (value >= critAt) return 'danger';
  if (value >= warnAt) return 'warning';
  if (value === 0) return 'success';
  return 'idle';
}

export default async function DashboardPage() {
  const [stats, engineData] = await Promise.all([
    getDashboardStats(),
    getEngineStatus(),
  ]);

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const pressureItems = engineData ? [
    {
      label: 'SLA Breaches',
      value: engineData.slaBreaches,
      tone: getPressureTone(engineData.slaBreaches, 1, 5),
    },
    {
      label: 'Pending Dispatch',
      value: engineData.pendingDispatch,
      tone: getPressureTone(engineData.pendingDispatch, 3, 10),
    },
    {
      label: 'Refund Queue',
      value: engineData.pendingRefunds,
      tone: getPressureTone(engineData.pendingRefunds, 1, 5),
    },
    {
      label: 'Escalations',
      value: engineData.deliveryEscalations,
      tone: getPressureTone(engineData.deliveryEscalations, 1, 3),
    },
    {
      label: 'Exceptions',
      value: engineData.openExceptions,
      tone: getPressureTone(engineData.openExceptions, 2, 8),
    },
  ] : [];

  const statusVariantMap: Record<PressureTone, 'danger' | 'warning' | 'success' | 'idle'> = {
    danger: 'danger',
    warning: 'warning',
    success: 'success',
    idle: 'idle',
  };

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <PageHeader
          title="Live Board"
          subtitle={`${todayDate} · ${stats.todayOrders} orders so far today`}
          actions={
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs font-medium text-green-400">Live</span>
            </div>
          }
        />

        {/* KPI row */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <KpiTile
            label="Today's Revenue"
            value={`$${stats.todayRevenue.toFixed(2)}`}
            change={Math.round(stats.revenueGrowth * 10) / 10}
            className="border-gray-800 bg-opsPanel"
          />
          <KpiTile
            label="Today's Orders"
            value={stats.todayOrders}
            change={Math.round(stats.orderGrowth * 10) / 10}
            className="border-gray-800 bg-opsPanel"
          />
          <KpiTile
            label="Active Deliveries"
            value={stats.activeDeliveries}
            className="border-gray-800 bg-opsPanel"
          />
          <KpiTile
            label="Drivers Online"
            value={`${stats.onlineDrivers}/${stats.totalDrivers}`}
            className="border-gray-800 bg-opsPanel"
          />
        </div>

        {/* Engine pressure strip */}
        {engineData && pressureItems.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border border-gray-800 bg-opsPanel px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 mr-1">
              Engine Pressure
            </span>
            {pressureItems.map((p) => (
              <button
                key={p.label}
                title={`${p.label}: ${p.value}`}
                className="flex items-center gap-1.5"
              >
                <StatusBadge
                  status={statusVariantMap[p.tone]}
                  label={`${p.label} ${p.value}`}
                />
              </button>
            ))}
          </div>
        )}

        {/* Live Board 3-column */}
        <LiveBoardBoundary>
          <LiveBoard />
        </LiveBoardBoundary>

        {/* Run the Business CTA strip */}
        <div className="rounded-lg border border-gray-800 bg-opsPanel p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Run the Business</p>
              <p className="text-xs text-gray-500">Primary operator controls</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link href="/dashboard/chefs" className="inline-flex h-8 items-center rounded-lg bg-[#E85D26] px-3 text-sm font-medium text-white transition-colors hover:bg-[#d54d1a]">Add Chef</Link>
              <Link href="/dashboard/drivers" className="inline-flex h-8 items-center rounded-lg bg-[#E85D26] px-3 text-sm font-medium text-white transition-colors hover:bg-[#d54d1a]">Add Driver</Link>
              <Link href="/dashboard/finance" className="inline-flex h-8 items-center rounded-lg border border-gray-700 px-3 text-sm font-medium text-gray-300 transition-colors hover:border-[#E85D26] hover:text-white">Finance</Link>
              <Link href="/dashboard/dispatch" className="inline-flex h-8 items-center rounded-lg border border-gray-700 px-3 text-sm font-medium text-gray-300 transition-colors hover:border-[#E85D26] hover:text-white">Dispatch</Link>
              <Link href="/dashboard/announcements" className="inline-flex h-8 items-center rounded-lg border border-gray-700 px-3 text-sm font-medium text-gray-300 transition-colors hover:border-[#E85D26] hover:text-white">Announcement</Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
