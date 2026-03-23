'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { createBrowserClient } from '@ridendine/db';
import { Header } from '@/components/layout/header';
import { Card, Button } from '@ridendine/ui';

// Dynamic import for Leaflet map (SSR disabled)
const OrderTrackingMap = dynamic(
  () => import('@/components/tracking/order-tracking-map'),
  { ssr: false, loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" /> }
);

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  estimated_ready_at: string | null;
  chef_storefronts: {
    name: string;
    address: string;
  };
  customer_addresses: {
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
  };
}

interface Delivery {
  id: string;
  status: string;
  driver_id: string | null;
  pickup_address: string;
  dropoff_address: string;
  estimated_dropoff_at: string | null;
  driver_profiles?: {
    first_name: string;
    last_name: string;
    phone: string;
  };
}

interface DriverLocation {
  lat: number;
  lng: number;
}

const ORDER_STATUSES = [
  { key: 'pending', label: 'Order Placed', icon: '📋' },
  { key: 'payment_confirmed', label: 'Payment Confirmed', icon: '💳' },
  { key: 'accepted', label: 'Chef Accepted', icon: '👨‍🍳' },
  { key: 'preparing', label: 'Being Prepared', icon: '🍳' },
  { key: 'ready', label: 'Ready for Pickup', icon: '✅' },
  { key: 'picked_up', label: 'Driver Picked Up', icon: '🚗' },
  { key: 'en_route', label: 'Out for Delivery', icon: '🛵' },
  { key: 'delivered', label: 'Delivered', icon: '🎉' },
];

function getStatusIndex(status: string, paymentStatus: string): number {
  if (paymentStatus === 'completed' && status === 'pending') return 1;
  const statusMap: Record<string, number> = {
    pending: 0,
    accepted: 2,
    preparing: 3,
    ready: 4,
    picked_up: 5,
    en_route_to_dropoff: 6,
    delivered: 7,
    cancelled: -1,
    rejected: -1,
  };
  return statusMap[status] ?? 0;
}

export default function OrderConfirmationPage() {
  const params = useParams();
  const orderId = params.orderId as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const supabase = createBrowserClient();

  const fetchOrder = useCallback(async () => {
    try {
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          chef_storefronts (name, address),
          customer_addresses (street_address, city, state, postal_code)
        `)
        .eq('id', orderId)
        .single();

      if (orderError) throw orderError;
      setOrder(orderData);

      // Fetch delivery info
      const { data: deliveryData } = await (supabase as any)
        .from('deliveries')
        .select(`
          *,
          driver_profiles (first_name, last_name, phone)
        `)
        .eq('order_id', orderId)
        .single();

      if (deliveryData) {
        setDelivery(deliveryData as Delivery);

        // If driver assigned, fetch their location
        if ((deliveryData as Delivery).driver_id) {
          const { data: presenceData } = await (supabase as any)
            .from('driver_presence')
            .select('current_lat, current_lng')
            .eq('driver_id', (deliveryData as Delivery).driver_id)
            .single();

          if (presenceData?.current_lat && presenceData?.current_lng) {
            setDriverLocation({
              lat: presenceData.current_lat,
              lng: presenceData.current_lng,
            });
          }
        }
      }
    } catch (err) {
      console.error('Error fetching order:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId, supabase]);

  useEffect(() => {
    fetchOrder();

    // Set up real-time subscription for order updates
    const orderChannel = supabase
      .channel(`order-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`,
        },
        (payload) => {
          setOrder((prev) => (prev ? { ...prev, ...payload.new } : null));
        }
      )
      .subscribe();

    // Poll for driver location every 15 seconds
    const locationInterval = setInterval(() => {
      if (delivery?.driver_id) {
        (supabase as any)
          .from('driver_presence')
          .select('current_lat, current_lng')
          .eq('driver_id', delivery.driver_id)
          .single()
          .then(({ data }: { data: { current_lat: number; current_lng: number } | null }) => {
            if (data?.current_lat && data?.current_lng) {
              setDriverLocation({ lat: data.current_lat, lng: data.current_lng });
            }
          });
      }
    }, 15000);

    return () => {
      supabase.removeChannel(orderChannel);
      clearInterval(locationInterval);
    };
  }, [orderId, supabase, fetchOrder, delivery?.driver_id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container py-8">
          <div className="flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E85D26] border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container py-8">
          <Card className="p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900">Order not found</h2>
            <p className="mt-2 text-gray-500">{error || 'Unable to find this order'}</p>
            <Link href="/chefs">
              <Button className="mt-4">Browse Chefs</Button>
            </Link>
          </Card>
        </main>
      </div>
    );
  }

  const currentStatusIndex = getStatusIndex(order.status, order.payment_status);
  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled' || order.status === 'rejected';

  const estimatedTime = delivery?.estimated_dropoff_at
    ? new Date(delivery.estimated_dropoff_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : order.estimated_ready_at
    ? new Date(order.estimated_ready_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Calculating...';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="container py-8">
        <div className="mx-auto max-w-3xl">
          {/* Success Header */}
          <Card className="p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
              <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-6 text-2xl font-bold text-gray-900">
              {isDelivered ? 'Order Delivered!' : 'Order Confirmed!'}
            </h1>
            <p className="mt-2 text-gray-600">
              Order #{order.order_number}
            </p>
            {!isDelivered && !isCancelled && (
              <p className="mt-2 text-lg font-semibold text-[#E85D26]">
                Estimated Arrival: {estimatedTime}
              </p>
            )}
          </Card>

          {/* Status Timeline */}
          <Card className="mt-6 p-6">
            <h2 className="font-semibold text-gray-900 mb-6">Order Status</h2>
            <div className="space-y-4">
              {ORDER_STATUSES.map((status, index) => {
                const isCompleted = index <= currentStatusIndex;
                const isCurrent = index === currentStatusIndex;

                return (
                  <div key={status.key} className="flex items-center gap-4">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-full text-lg ${
                        isCompleted
                          ? 'bg-green-100 text-green-600'
                          : 'bg-gray-100 text-gray-400'
                      } ${isCurrent ? 'ring-2 ring-[#E85D26] ring-offset-2' : ''}`}
                    >
                      {status.icon}
                    </div>
                    <div className="flex-1">
                      <p
                        className={`font-medium ${
                          isCompleted ? 'text-gray-900' : 'text-gray-400'
                        }`}
                      >
                        {status.label}
                      </p>
                      {isCurrent && !isDelivered && (
                        <p className="text-sm text-[#E85D26]">In progress...</p>
                      )}
                    </div>
                    {isCompleted && (
                      <svg
                        className="h-5 w-5 text-green-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Map */}
          {delivery && (currentStatusIndex >= 5 || driverLocation) && (
            <Card className="mt-6 p-6">
              <h2 className="font-semibold text-gray-900 mb-4">Delivery Tracking</h2>
              <div className="h-64 rounded-lg overflow-hidden">
                <OrderTrackingMap
                  driverLocation={driverLocation}
                  dropoffAddress={delivery.dropoff_address}
                />
              </div>
              {delivery.driver_profiles && (
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <div>
                    <p className="font-medium text-gray-900">
                      {delivery.driver_profiles.first_name} {delivery.driver_profiles.last_name}
                    </p>
                    <p className="text-sm text-gray-500">Your Driver</p>
                  </div>
                  <a
                    href={`tel:${delivery.driver_profiles.phone}`}
                    className="flex items-center gap-2 rounded-full bg-[#E85D26] px-4 py-2 text-white hover:bg-[#D04D16]"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Call
                  </a>
                </div>
              )}
            </Card>
          )}

          {/* Order Details */}
          <Card className="mt-6 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Order Details</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Restaurant</span>
                <span className="font-medium">{order.chef_storefronts?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Address</span>
                <span className="font-medium text-right">
                  {order.customer_addresses?.street_address}<br />
                  {order.customer_addresses?.city}, {order.customer_addresses?.state}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Order Total</span>
                <span className="font-semibold text-[#E85D26]">
                  ${(order.total / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link href={`/account/orders`}>
              <Button variant="secondary">View All Orders</Button>
            </Link>
            <Link href="/chefs">
              <Button>Order Again</Button>
            </Link>
          </div>

          {/* Support Link */}
          <p className="mt-8 text-center text-sm text-gray-500">
            Need help?{' '}
            <Link href="/contact" className="text-[#E85D26] hover:underline">
              Contact Support
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
