import { cookies } from 'next/headers';
import { createServerClient, getDeliveryById, type SupabaseClient } from '@ridendine/db';
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

  const delivery = await getDeliveryById(supabase, id);

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

  const { data: order } = await supabase
    .from('orders')
    .select('*, customer_addresses(*)')
    .eq('id', delivery.order_id)
    .single();

  return <DeliveryDetail delivery={delivery} order={(order as DeliveryOrderRow | null) ?? null} />;
}
