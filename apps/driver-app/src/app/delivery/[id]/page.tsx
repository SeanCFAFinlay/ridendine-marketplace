import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import {
  createAdminClient,
  createServerClient,
  getDeliveryById,
  getDriverByUserId,
  type SupabaseClient,
} from '@ridendine/db';
import { isApprovedDriver } from '@/lib/driver-eligibility';
import DeliveryDetail from './components/DeliveryDetail';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

interface DeliveryOrderRow {
  order_number: string;
  customer_phone?: string | null;
  special_instructions?: string | null;
  [key: string]: unknown;
}

export default async function ActiveDeliveryPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore) as unknown as SupabaseClient;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login');
  }

  const driver = await getDriverByUserId(supabase, user.id);

  if (!isApprovedDriver(driver)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Driver access unavailable</h2>
          <p className="mt-2 text-gray-600">
            Your account must be approved before you can open deliveries.
          </p>
        </div>
      </div>
    );
  }

  const admin = createAdminClient();
  const delivery = await getDeliveryById(admin as unknown as SupabaseClient, id);

  if (!delivery) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Delivery not found</h2>
          <p className="mt-2 text-gray-600">This delivery doesn&apos;t exist or has been removed</p>
        </div>
      </div>
    );
  }

  const assignedToMe = delivery.driver_id === driver.id;
  let hasPendingOffer = false;
  if (!assignedToMe) {
    const { data: attempt } = await admin
      .from('assignment_attempts')
      .select('id')
      .eq('delivery_id', id)
      .eq('driver_id', driver.id)
      .eq('response', 'pending')
      .maybeSingle();
    hasPendingOffer = !!attempt;
  }

  if (!assignedToMe && !hasPendingOffer) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Delivery not found</h2>
          <p className="mt-2 text-gray-600">This delivery is not assigned to you</p>
        </div>
      </div>
    );
  }

  const { data: order } = await admin
    .from('orders')
    .select('*, customer_addresses(*)')
    .eq('id', delivery.order_id)
    .single();

  return <DeliveryDetail delivery={delivery} order={(order as DeliveryOrderRow | null) ?? null} />;
}
