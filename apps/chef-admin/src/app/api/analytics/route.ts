import type { NextRequest } from 'next/server';
import { createAdminClient } from '@ridendine/db';
import { getChefActorContext, errorResponse, successResponse } from '@/lib/engine';
import {
  getPeriodDateRange,
  calculateComparison,
  findPeakHour,
  calculateRepeatCustomerRate,
  formatHourRange,
  type Period,
} from './utils';

export const dynamic = 'force-dynamic';

interface OrderRow {
  id: string;
  total: number;
  status: string;
  created_at: string;
  customer_id: string;
}

interface OrderItemRow {
  quantity: number;
  unit_price: number;
  menu_items: { name: string } | null;
}

interface ReviewRow {
  rating: number;
}

const ACTIVE_STATUSES = ['delivered', 'completed', 'ready_for_pickup', 'preparing', 'accepted'];

async function fetchOrders(
  adminClient: ReturnType<typeof createAdminClient>,
  storefrontId: string,
  start: Date,
  end: Date
): Promise<OrderRow[]> {
  const { data } = await adminClient
    .from('orders')
    .select('id, total, status, created_at, customer_id')
    .eq('storefront_id', storefrontId)
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString());
  return (data ?? []) as OrderRow[];
}

async function fetchOrderItems(
  adminClient: ReturnType<typeof createAdminClient>,
  orderIds: string[]
): Promise<OrderItemRow[]> {
  if (orderIds.length === 0) return [];
  const { data } = await adminClient
    .from('order_items')
    .select('quantity, unit_price, menu_items (name)')
    .in('order_id', orderIds);
  return (data ?? []) as OrderItemRow[];
}

async function fetchReviews(
  adminClient: ReturnType<typeof createAdminClient>,
  storefrontId: string
): Promise<ReviewRow[]> {
  const { data } = await adminClient
    .from('reviews')
    .select('rating')
    .eq('storefront_id', storefrontId);
  return (data ?? []) as ReviewRow[];
}

function buildHourlyOrders(orders: OrderRow[]): Array<{ hour: number; count: number }> {
  const counts: Record<number, number> = {};
  for (let i = 0; i < 24; i++) counts[i] = 0;
  for (const o of orders) {
    const hour = new Date(o.created_at).getHours();
    counts[hour] = (counts[hour] ?? 0) + 1;
  }
  return Object.entries(counts).map(([h, count]) => ({ hour: parseInt(h), count }));
}

function buildDailyRevenue(
  orders: OrderRow[],
  start: Date,
  days: number
): Array<{ date: string; revenue: number }> {
  const daily: Record<string, number> = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
    daily[d.toISOString().split('T')[0]!] = 0;
  }
  for (const o of orders) {
    const date = o.created_at.split('T')[0]!;
    if (date in daily) daily[date]! += Number(o.total || 0);
  }
  return Object.entries(daily).map(([date, revenue]) => ({ date, revenue: Number(revenue) }));
}

function buildTopItems(items: OrderItemRow[]): Array<{ name: string; count: number; revenue: number }> {
  const acc: Record<string, { count: number; revenue: number }> = {};
  for (const item of items) {
    const name = item.menu_items?.name ?? 'Unknown';
    if (!acc[name]) acc[name] = { count: 0, revenue: 0 };
    acc[name]!.count += Number(item.quantity || 0);
    acc[name]!.revenue += Number(item.unit_price || 0) * Number(item.quantity || 0);
  }
  return Object.entries(acc)
    .map(([name, stats]) => ({ name, ...stats }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function calcAvgRating(reviews: ReviewRow[]): number | null {
  if (reviews.length === 0) return null;
  return reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length;
}

export async function GET(request: NextRequest) {
  try {
    const chefContext = await getChefActorContext();
    if (!chefContext) {
      return errorResponse('UNAUTHORIZED', 'Not authenticated', 401);
    }

    const { searchParams } = new URL(request.url);
    const rawPeriod = searchParams.get('period') ?? 'month';
    const period: Period = ['week', 'month', 'year'].includes(rawPeriod)
      ? (rawPeriod as Period)
      : 'month';

    const { start, end, prevStart, prevEnd, days } = getPeriodDateRange(period);
    const adminClient = createAdminClient();
    const { storefrontId } = chefContext;

    // Fetch current + previous period orders in parallel with reviews
    const [allOrders, prevOrders, reviews] = await Promise.all([
      fetchOrders(adminClient, storefrontId, start, end),
      fetchOrders(adminClient, storefrontId, prevStart, prevEnd),
      fetchReviews(adminClient, storefrontId),
    ]);

    const activeOrders = allOrders.filter((o) => ACTIVE_STATUSES.includes(o.status));
    const cancelledOrders = allOrders.filter((o) => o.status === 'cancelled');
    const prevActiveOrders = prevOrders.filter((o) => ACTIVE_STATUSES.includes(o.status));

    // Revenue and order counts
    const revenue = activeOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const prevRevenue = prevActiveOrders.reduce((s, o) => s + Number(o.total || 0), 0);
    const orderCount = activeOrders.length;
    const prevOrderCount = prevActiveOrders.length;
    const avgOrderValue = orderCount > 0 ? revenue / orderCount : 0;
    const prevAvgOrderValue = prevOrderCount > 0 ? prevRevenue / prevOrderCount : 0;

    // Customers
    const customerIds = activeOrders.map((o) => o.customer_id).filter(Boolean);
    const uniqueCustomers = new Set(customerIds).size;
    const prevCustomerIds = prevActiveOrders.map((o) => o.customer_id).filter(Boolean);
    const prevUniqueCustomers = new Set(prevCustomerIds).size;
    const repeatCustomerRate = calculateRepeatCustomerRate(customerIds);

    // Cancellation rate
    const totalOrdersAll = allOrders.length;
    const cancellationRate = totalOrdersAll > 0
      ? (cancelledOrders.length / totalOrdersAll) * 100
      : 0;

    // Hourly and daily data
    const hourlyOrders = buildHourlyOrders(activeOrders);
    const dailyRevenue = buildDailyRevenue(activeOrders, start, days);
    const peakHour = findPeakHour(hourlyOrders);
    const peakHourLabel = formatHourRange(peakHour);

    // Top items
    const orderItems = await fetchOrderItems(adminClient, activeOrders.map((o) => o.id));
    const topItems = buildTopItems(orderItems);

    // Average rating
    const avgRating = calcAvgRating(reviews);

    // Comparison percentages
    const revenueChange = calculateComparison(revenue, prevRevenue);
    const orderChange = calculateComparison(orderCount, prevOrderCount);
    const avgOrderValueChange = calculateComparison(avgOrderValue, prevAvgOrderValue);
    const customersChange = calculateComparison(uniqueCustomers, prevUniqueCustomers);

    return successResponse({
      period,
      revenue,
      orderCount,
      avgOrderValue,
      uniqueCustomers,
      repeatCustomerRate,
      cancellationRate,
      avgRating,
      peakHour,
      peakHourLabel,
      comparison: {
        revenueChange,
        orderChange,
        avgOrderValueChange,
        customersChange,
        prevRevenue,
        prevOrderCount,
      },
      hourlyOrders,
      dailyRevenue,
      topItems,
    });
  } catch (err) {
    console.error('Error fetching analytics:', err);
    return errorResponse('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
