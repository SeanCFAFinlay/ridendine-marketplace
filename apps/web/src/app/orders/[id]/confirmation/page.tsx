import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerClient } from '@ridendine/db';
import { Button, Card } from '@ridendine/ui';
import { Header } from '@/components/layout/header';
import { LiveOrderTracker } from '@/components/tracking/live-order-tracker';
import { ReviewForm } from '@/components/reviews/review-form';

interface Props {
  params: Promise<{ id: string }>;
}

interface DeliveryRow {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_dropoff_at: string | null;
}

interface OrderWithDetails {
  id: string;
  order_number: string;
  status: string;
  total: number;
  estimated_ready_at: string | null;
  chef_storefronts: {
    name: string;
    logo_url: string | null;
  } | null;
  deliveries: DeliveryRow[] | null;
}

function calcEstimatedMinutes(estimatedAt: string | null): number | null {
  if (!estimatedAt) return null;
  const diffMs = new Date(estimatedAt).getTime() - Date.now();
  const mins = Math.round(diffMs / 60000);
  return mins > 0 ? mins : null;
}

export default async function OrderConfirmationPage({ params }: Props) {
  const { id } = await params;
  const cookieStore = await cookies();
  const supabase = createServerClient(cookieStore);

  const { data: order, error } = await supabase
    .from('orders')
    .select(`
      *,
      chef_storefronts (
        name,
        logo_url
      ),
      deliveries (
        id,
        status,
        pickup_address,
        dropoff_address,
        estimated_dropoff_at
      )
    `)
    .eq('id', id)
    .single();

  const typedOrder = order as OrderWithDetails | null;

  if (error || !typedOrder) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container py-8">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900">Order not found</h2>
            <Link href="/chefs">
              <Button className="mt-4">Browse Chefs</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  // Use first delivery if present
  const delivery = typedOrder.deliveries?.[0] ?? null;
  const storefrontName = typedOrder.chef_storefronts?.name ?? 'Unknown Chef';
  const estimatedDeliveryMinutes = delivery
    ? calcEstimatedMinutes(delivery.estimated_dropoff_at)
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* Confirmation banner */}
          <div className="flex items-center gap-4 rounded-xl bg-white p-6 shadow-sm">
            <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-green-100">
              <svg className="h-7 w-7 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Order Confirmed!</h1>
              <p className="text-sm text-gray-600">
                Thank you for your order. Total:{' '}
                <span className="font-semibold text-[#E85D26]">
                  ${(typedOrder.total / 100).toFixed(2)}
                </span>
              </p>
              <p className="mt-1 text-xs text-gray-400">
                A confirmation email has been sent to your address.
              </p>
            </div>
          </div>

          {/* Live tracker */}
          <LiveOrderTracker
            orderId={typedOrder.id}
            orderNumber={typedOrder.order_number}
            initialStatus={typedOrder.status}
            deliveryId={delivery?.id ?? null}
            pickupAddress={delivery?.pickup_address ?? storefrontName}
            dropoffAddress={delivery?.dropoff_address ?? ''}
            estimatedDeliveryMinutes={estimatedDeliveryMinutes}
            storefrontName={storefrontName}
          />

          {/* Review form for delivered/completed orders */}
          {(typedOrder.status === 'delivered' || typedOrder.status === 'completed') && (
            <div className="mt-6">
              <ReviewForm orderId={typedOrder.id} />
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href="/chefs">
              <Button variant="secondary">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
