import { cookies } from 'next/headers';
import { createServerClient, createAdminClient, getDriverByUserId } from '@ridendine/db';
import SettingsClient from './settings-client';

export const dynamic = 'force-dynamic';

export default async function DriverSettingsPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="text-gray-700">Please sign in</p>
      </div>
    );
  }

  const driver = await getDriverByUserId(supabase as never, user.id);
  if (!driver) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <p className="text-gray-700">Driver profile not found</p>
      </div>
    );
  }

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

  return <SettingsClient driver={driver} balanceCents={(acct?.balance_cents as number) ?? 0} />;
}
