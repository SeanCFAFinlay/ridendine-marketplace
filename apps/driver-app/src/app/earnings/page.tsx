import { cookies } from 'next/headers';
import {
  createServerClient,
  createAdminClient,
  getDriverByUserId,
  getDeliveryHistory,
} from '@ridendine/db';
import EarningsView from './components/EarningsView';

export const dynamic = 'force-dynamic';

export default async function EarningsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please sign in</h2>
          <p className="mt-2 text-gray-600">You need to be signed in to view earnings</p>
        </div>
      </div>
    );
  }

  const driver = await getDriverByUserId(supabase as any, user.id);

  if (!driver) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Driver profile not found</h2>
          <p className="mt-2 text-gray-600">Please contact support</p>
        </div>
      </div>
    );
  }

  const completedDeliveries = await getDeliveryHistory(supabase as any, driver.id, { limit: 20 });

  const admin = createAdminClient() as unknown as {
    from: (rel: string) => {
      select: (cols: string) => {
        eq: (c: string, v: string) => {
          eq: (c2: string, v2: string) => { maybeSingle: () => Promise<{ data: { balance_cents: number } | null }> };
        };
      };
    };
  };
  const { data: acct } = await admin
    .from('platform_accounts')
    .select('balance_cents')
    .eq('account_type', 'driver_payable')
    .eq('owner_id', driver.id)
    .maybeSingle();

  const instantEnabled = Boolean(
    (driver as { instant_payouts_enabled?: boolean }).instant_payouts_enabled
  );

  return (
    <EarningsView
      deliveries={completedDeliveries}
      availableBalanceCents={(acct?.balance_cents as number) ?? 0}
      instantPayoutsEnabled={instantEnabled}
    />
  );
}
