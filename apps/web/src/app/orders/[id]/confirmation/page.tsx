import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@ridendine/db';
import { Button, Card } from '@ridendine/ui';
import { Header } from '@/components/layout/header';
import { LiveOrderTracker } from '@/components/tracking/live-order-tracker';
import { ReviewForm } from '@/components/reviews/review-form';
import { OrderActionPanel } from '@/components/orders/order-action-panel';
import { OrderConfirmationHero } from '@/components/orders/order-confirmation-hero';
import { OrderTaxReceiptModal } from '@/components/orders/order-tax-receipt-modal';
import { EmergencyDispatchBanner } from '@/components/orders/emergency-dispatch-banner';

interface Props {
  params: Promise<{ id: string }>;
}

interface DeliveryRow {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_dropoff_at: string | null;
  eta_pickup_at: string | null;
  eta_dropoff_at: string | null;
  route_progress_pct: number | null;
  route_to_dropoff_seconds: number | null;
  route_to_dropoff_polyline: string | null;
  drivers: { first_name: string } | null;
}

interface OrderWithDetails {
  id: string;
  order_number: string;
  status: string;
  public_stage?: string;
  total: number;
  subtotal?: number;
  delivery_fee?: number;
  tip?: number;
  tax?: number;
  created_at: string;
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/auth/login');
  }

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
        estimated_dropoff_at,
        eta_pickup_at,
        eta_dropoff_at,
        route_progress_pct,
        route_to_dropoff_seconds,
        route_to_dropoff_polyline,
        drivers ( first_name )
      )
    `)
    .eq('id', id)
    .single();

  const typedOrder = order as OrderWithDetails | null;

  if (error || !typedOrder) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <Card className="p-8 text-center" elevated>
            <h2 className="text-xl font-semibold text-text">Order not found</h2>
            <Link href="/chefs">
              <Button variant="primary" className="mt-4">Browse Chefs</Button>
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
  const driverFirstName = delivery?.drivers?.first_name ?? null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="mx-auto max-w-2xl space-y-6">
          <OrderConfirmationHero
            orderNumber={typedOrder.order_number}
            total={Number(typedOrder.total)}
            storefrontName={storefrontName}
            estimatedDeliveryMinutes={estimatedDeliveryMinutes}
            driverFirstName={driverFirstName}
          />

          <OrderActionPanel
            orderNumber={typedOrder.order_number}
            storefrontName={storefrontName}
            status={typedOrder.status}
            publicStage={typedOrder.public_stage ?? null}
          />

          {/* Live tracker */}
          <LiveOrderTracker
            orderId={typedOrder.id}
            orderNumber={typedOrder.order_number}
            initialStatus={typedOrder.status}
            initialPublicStage={typedOrder.public_stage ?? 'placed'}
            deliveryId={delivery?.id ?? null}
            pickupAddress={delivery?.pickup_address ?? storefrontName}
            dropoffAddress={delivery?.dropoff_address ?? ''}
            estimatedDeliveryMinutes={estimatedDeliveryMinutes}
            storefrontName={storefrontName}
            initialEtaPickupAt={delivery?.eta_pickup_at ?? null}
            initialEtaDropoffAt={delivery?.eta_dropoff_at ?? null}
            initialProgressPct={
              delivery?.route_progress_pct != null ? Number(delivery.route_progress_pct) : null
            }
            initialRemainingSeconds={
              typeof delivery?.route_to_dropoff_seconds === 'number'
                ? delivery.route_to_dropoff_seconds
                : null
            }
            initialRoutePolyline={delivery?.route_to_dropoff_polyline ?? null}
            driverFirstName={driverFirstName}
          />

          {/* Review form for delivered/completed orders */}
          {(typedOrder.public_stage === 'delivered' ||
            typedOrder.status === 'delivered' ||
            typedOrder.status === 'completed') && (
            <div id="review" className="mt-6 scroll-mt-24">
              <ReviewForm orderId={typedOrder.id} />
            </div>
          )}

          {/* Emergency Hotline for in-flight orders */}
          <EmergencyDispatchBanner
            orderNumber={typedOrder.order_number}
            isOrderActive={!['delivered', 'completed', 'cancelled'].includes(typedOrder.status)}
          />

          {/* Actions */}
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center items-center">
            <OrderTaxReceiptModal
              orderNumber={typedOrder.order_number}
              createdAt={typedOrder.created_at || new Date().toISOString()}
              storefrontName={storefrontName}
              customerName={user.email ?? undefined}
              deliveryAddress={delivery?.dropoff_address}
              subtotal={Number(typedOrder.subtotal ?? typedOrder.total * 0.8)}
              deliveryFee={Number(typedOrder.delivery_fee ?? 3.99)}
              tip={Number(typedOrder.tip ?? 0)}
              tax={Number(typedOrder.tax ?? (typedOrder.total * 0.13) / 1.13)}
              total={Number(typedOrder.total)}
            />
            <Link href="/chefs">
              <Button variant="secondary">Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
