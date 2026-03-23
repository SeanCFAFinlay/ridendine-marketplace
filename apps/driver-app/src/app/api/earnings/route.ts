import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient, getDriverByUserId, getDeliveryHistory } from '@ridendine/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(cookieStore);

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const driver = await getDriverByUserId(supabase as any, user.id);

    if (!driver) {
      return NextResponse.json(
        { error: 'Driver profile not found' },
        { status: 404 }
      );
    }

    const allDeliveries = await getDeliveryHistory(supabase as any, driver.id, { limit: 1000 });

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const todayDeliveries = allDeliveries.filter(d =>
      d.actual_dropoff_at && new Date(d.actual_dropoff_at) >= todayStart
    );

    const weekDeliveries = allDeliveries.filter(d =>
      d.actual_dropoff_at && new Date(d.actual_dropoff_at) >= weekStart
    );

    const monthDeliveries = allDeliveries.filter(d =>
      d.actual_dropoff_at && new Date(d.actual_dropoff_at) >= monthStart
    );

    const dayBreakdown: Record<string, { count: number; earnings: number }> = {};

    weekDeliveries.forEach(delivery => {
      if (!delivery.actual_dropoff_at) return;

      const date = new Date(delivery.actual_dropoff_at);
      const dateKey = date.toISOString().split('T')[0];

      if (!dateKey) return;

      if (!dayBreakdown[dateKey]) {
        dayBreakdown[dateKey] = { count: 0, earnings: 0 };
      }

      const dayData = dayBreakdown[dateKey];
      if (dayData) {
        dayData.count++;
        dayData.earnings += delivery.driver_payout;
      }
    });

    const today = {
      count: todayDeliveries.length,
      earnings: todayDeliveries.reduce((sum, d) => sum + d.driver_payout, 0),
    };

    const week = {
      count: weekDeliveries.length,
      earnings: weekDeliveries.reduce((sum, d) => sum + d.driver_payout, 0),
      breakdown: Object.entries(dayBreakdown).map(([date, data]) => ({
        date,
        ...data,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    };

    const month = {
      count: monthDeliveries.length,
      earnings: monthDeliveries.reduce((sum, d) => sum + d.driver_payout, 0),
    };

    return NextResponse.json({
      today,
      week,
      month,
    });
  } catch (error) {
    console.error('Error fetching earnings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
