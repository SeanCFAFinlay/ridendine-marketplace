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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text">Please sign in</h2>
          <p className="mt-2 text-textMuted">You need to be signed in to view history</p>
        </div>
      </div>
    );
  }

  const driver = await getDriverByUserId(supabase as any, user.id);

  if (!driver) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-text">Driver profile not found</h2>
          <p className="mt-2 text-textMuted">Please contact support</p>
        </div>
      </div>
    );
  }

  const completedDeliveries = await getDeliveryHistory(supabase as any, driver.id, { limit: 50 });

  return <HistoryView deliveries={completedDeliveries} />;
}
