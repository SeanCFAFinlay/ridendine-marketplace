import { type NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getOpsActorContext } from '@/lib/engine';

export const dynamic = 'force-dynamic';

type DayBucket = { orders: number; revenue: number; completed: number; cancelled: number };

function buildDailyBuckets(orders: any[], startDate: Date, endDate: Date) {
  const dailyData = new Map<string, DayBucket>();

  for (const order of orders) {
    const date = new Date(order.created_at).toISOString().split('T')[0]!;
    const day = dailyData.get(date) ?? { orders: 0, revenue: 0, completed: 0, cancelled: 0 };
    day.orders += 1;
    if (order.payment_status === 'completed') day.revenue += Number(order.total) || 0;
    if (['completed', 'delivered'].includes(order.status)) day.completed += 1;
    if (order.status === 'cancelled') day.cancelled += 1;
    dailyData.set(date, day);
  }

  const trend: Array<{ date: string } & DayBucket> = [];
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    const dateStr = cursor.toISOString().split('T')[0]!;
    trend.push({ date: dateStr, ...(dailyData.get(dateStr) ?? { orders: 0, revenue: 0, completed: 0, cancelled: 0 }) });
    cursor.setDate(cursor.getDate() + 1);
  }

  return trend;
}

function buildPeakHours(orders: any[]) {
  const hourCounts = new Array(24).fill(0);
  for (const order of orders) {
    hourCounts[new Date(order.created_at).getHours()] += 1;
  }
  return hourCounts.map((count, hour) => ({ hour, orders: count }));
}

async function fetchTopChefs(client: any, startDate: Date, chefLimit = 10) {
  const { data: ledger } = await client
    .from('ledger_entries')
    .select('entity_id, amount_cents')
    .eq('entry_type', 'chef_payable')
    .gte('created_at', startDate.toISOString());

  const chefRevenue = new Map<string, number>();
  for (const entry of ledger ?? []) {
    if (!entry.entity_id) continue;
    chefRevenue.set(entry.entity_id, (chefRevenue.get(entry.entity_id) ?? 0) + entry.amount_cents);
  }

  const topChefIds = [...chefRevenue.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, chefLimit)
    .map(([id]) => id);

  if (topChefIds.length === 0) return [];

  const { data: chefNames } = await client
    .from('chef_profiles')
    .select('id, display_name')
    .in('id', topChefIds);

  const chefNameMap = new Map((chefNames ?? []).map((c: any) => [c.id, c.display_name]));
  return topChefIds.map(id => ({
    name: chefNameMap.get(id) ?? 'Unknown',
    revenue: (chefRevenue.get(id) ?? 0) / 100,
  }));
}

function buildSummary(orders: any[], trend: Array<{ revenue: number; orders: number }>) {
  const completed = orders.filter((o) => ['completed', 'delivered'].includes(o.status)).length;
  return {
    totalOrders: orders.length,
    totalRevenue: trend.reduce((s, d) => s + d.revenue, 0),
    avgDailyOrders: trend.length > 0 ? Math.round(trend.reduce((s, d) => s + d.orders, 0) / trend.length) : 0,
    completionRate: orders.length > 0 ? Math.round((completed / orders.length) * 100) : 0,
  };
}

export async function GET(request: NextRequest) {
  const actor = await getOpsActorContext();
  if (!actor) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') ?? '30');
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

  const client = createAdminClient() as any;

  const { data: orders } = await client
    .from('orders')
    .select('id, total, status, payment_status, created_at')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });

  const safeOrders = orders ?? [];
  const trend = buildDailyBuckets(safeOrders, startDate, endDate);
  const peakHours = buildPeakHours(safeOrders);
  const topChefs = await fetchTopChefs(client, startDate);
  const summary = buildSummary(safeOrders, trend);

  return NextResponse.json({ success: true, data: { trend, topChefs, peakHours, summary } });
}
