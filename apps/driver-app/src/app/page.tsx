import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, getDriverByUserId, getActiveDeliveriesForDriver } from '@ridendine/db';
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
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Driver profile not found</h2>
          <p className="mt-2 text-gray-600">Please contact support</p>
        </div>
      </div>
    );
  }

  const activeDeliveries = await getActiveDeliveriesForDriver(supabase as any, driver.id);

  return <DriverDashboard driver={driver} activeDeliveries={activeDeliveries} />;
}
