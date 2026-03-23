import { cookies } from 'next/headers';
import Link from 'next/link';
import { createServerClient } from '@ridendine/db';
import { Button, Card } from '@ridendine/ui';
import { Header } from '@/components/layout/header';

interface Props {
  params: Promise<{ id: string }>;
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
      )
    `)
    .eq('id', id)
    .single();

  if (error || !order) {
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container py-8">
        <div className="mx-auto max-w-2xl">
          <Card className="p-8 text-center">
            {/* Success Icon */}
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h1 className="mt-6 text-2xl font-bold text-gray-900">Order Confirmed!</h1>
            <p className="mt-2 text-gray-600">
              Thank you for your order. Your food is being prepared.
            </p>

            {/* Order Details */}
            <div className="mt-8 rounded-lg bg-gray-50 p-6 text-left">
              <div className="flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <p className="text-sm text-gray-500">Order Number</p>
                  <p className="font-semibold text-gray-900">{order.order_number}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Status</p>
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </div>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Restaurant</span>
                  <span className="font-medium">{(order as any).chef_storefronts?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total</span>
                  <span className="font-semibold text-[#E85D26]">
                    ${(order.total / 100).toFixed(2)}
                  </span>
                </div>
                {order.estimated_ready_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Ready</span>
                    <span className="font-medium">
                      {new Date(order.estimated_ready_at).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link href={`/orders/${order.id}`}>
                <Button>Track Order</Button>
              </Link>
              <Link href="/chefs">
                <Button variant="secondary">Continue Shopping</Button>
              </Link>
            </div>

            <p className="mt-6 text-sm text-gray-500">
              A confirmation email has been sent to your email address.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
}
