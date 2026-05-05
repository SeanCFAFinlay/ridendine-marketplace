import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, getDriverByUserId, getActiveDeliveriesForDriver } from '@ridendine/db';
import { ErrorState } from '@ridendine/ui';
import { isApprovedDriver } from '@/lib/driver-eligibility';
import { getDriverAppPlatformRole } from '@/lib/platform-access';
import DriverDashboard from './components/DriverDashboard';

export const dynamic = 'force-dynamic';

export default async function DriverHomePage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const driver = await getDriverByUserId(supabase as any, user.id);

  if (!driver) {
    const platformRole = await getDriverAppPlatformRole(user.id);

    if (platformRole) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#080b10] p-6">
          <ErrorState
            title="Platform admin signed in"
            description="This account has platform access, but it is not a driver account. Driver actions still require an approved driver profile."
          />
        </div>
      );
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b10] p-6">
        <ErrorState title="Driver profile not found" description="Please contact support so we can reconnect your driver account." />
      </div>
    );
  }

  if (!isApprovedDriver(driver)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#080b10] p-6">
        <ErrorState title="Awaiting approval" description="You will get full access once your driver account is approved." />
      </div>
    );
  }

  const activeDeliveries = await getActiveDeliveriesForDriver(supabase as any, driver.id);

  return <DriverDashboard driver={driver} activeDeliveries={activeDeliveries} />;
}
