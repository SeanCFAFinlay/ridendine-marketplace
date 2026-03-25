import { cookies } from 'next/headers';
import { createServerClient, getDriverByUserId, getDeliveryHistory } from '@ridendine/db';
import HistoryView from './components/HistoryView';

export const dynamic = 'force-dynamic';

export default async function HistoryPage() {
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Please sign in</h2>
          <p className="mt-2 text-gray-600">You need to be signed in to view history</p>
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

  const completedDeliveries = await getDeliveryHistory(supabase as any, driver.id, { limit: 50 });

  return <HistoryView deliveries={completedDeliveries} />;
}
