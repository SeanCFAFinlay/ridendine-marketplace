'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button, Card, Input } from '@ridendine/ui';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url?: string;
}

interface Cart {
  id: string;
  storefront_id: string;
  items: CartItem[];
}

interface Address {
  id: string;
  label: string;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storefrontId = searchParams.get('storefrontId');

  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [deliveryType, setDeliveryType] = useState<'delivery' | 'pickup'>('delivery');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [tip, setTip] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!storefrontId) return;

      try {
        // Fetch cart
        const cartRes = await fetch(`/api/cart?storefrontId=${storefrontId}`);
        const cartData = await cartRes.json();

        if (cartData.success && cartData.data) {
          const items = (cartData.data.cart_items || []).map((item: any) => ({
            id: item.id,
            name: item.menu_items?.name || 'Unknown Item',
            price: item.unit_price,
            quantity: item.quantity,
            image_url: item.menu_items?.image_url,
          }));
          setCart({
            id: cartData.data.id,
            storefront_id: cartData.data.storefront_id,
            items,
          });
        }

        // Fetch addresses
        const addressRes = await fetch('/api/addresses');
        const addressData = await addressRes.json();

        if (addressData.success && addressData.data) {
          setAddresses(addressData.data);
          const defaultAddr = addressData.data.find((a: Address) => a.label === 'Home');
          if (defaultAddr) {
            setSelectedAddress(defaultAddr.id);
          } else if (addressData.data.length > 0) {
            setSelectedAddress(addressData.data[0].id);
          }
        }
      } catch (err) {
        console.error('Error loading checkout data:', err);
        setError('Failed to load checkout data');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [storefrontId]);

  const subtotal = cart?.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) ?? 0;
  const deliveryFee = deliveryType === 'delivery' ? 399 : 0;
  const serviceFee = Math.round(subtotal * 0.1);
  const total = subtotal + deliveryFee + serviceFee + tip;

  const handleSubmitOrder = async () => {
    if (deliveryType === 'delivery' && !selectedAddress) {
      setError('Please select a delivery address');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storefrontId,
          deliveryAddressId: deliveryType === 'delivery' ? selectedAddress : null,
          deliveryType,
          specialInstructions: deliveryInstructions,
          tip,
        }),
      });

      const result = await response.json();

      if (result.success) {
        router.push(`/orders/${result.data.order.id}/confirmation`);
      } else {
        setError(result.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Order error:', err);
      setError('Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="container py-8">
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E85D26] border-t-transparent" />
        </div>
      </main>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="container py-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-gray-900">Your cart is empty</h2>
          <p className="mt-2 text-gray-500">Add items to your cart before checking out.</p>
          <Link href="/chefs">
            <Button className="mt-4">Browse Chefs</Button>
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        {/* Checkout Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Delivery Type */}
          <Card>
            <h2 className="font-semibold text-gray-900">Delivery Method</h2>
            <div className="mt-4 flex gap-4">
              <button
                onClick={() => setDeliveryType('delivery')}
                className={`flex-1 rounded-lg border-2 p-4 text-center transition-colors ${
                  deliveryType === 'delivery'
                    ? 'border-[#E85D26] bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="mx-auto h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
                </svg>
                <p className="mt-2 font-medium">Delivery</p>
                <p className="text-sm text-gray-500">$3.99 fee</p>
              </button>
              <button
                onClick={() => setDeliveryType('pickup')}
                className={`flex-1 rounded-lg border-2 p-4 text-center transition-colors ${
                  deliveryType === 'pickup'
                    ? 'border-[#E85D26] bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <svg className="mx-auto h-8 w-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p className="mt-2 font-medium">Pickup</p>
                <p className="text-sm text-gray-500">Free</p>
              </button>
            </div>
          </Card>

          {/* Delivery Address */}
          {deliveryType === 'delivery' && (
            <Card>
              <h2 className="font-semibold text-gray-900">Delivery Address</h2>
              <div className="mt-4 space-y-3">
                {addresses.map((address) => (
                  <label
                    key={address.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                      selectedAddress === address.id
                        ? 'border-[#E85D26] bg-orange-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="address"
                      value={address.id}
                      checked={selectedAddress === address.id}
                      onChange={(e) => setSelectedAddress(e.target.value)}
                      className="mt-1 h-4 w-4 accent-[#E85D26]"
                    />
                    <div>
                      <p className="font-medium text-gray-900">{address.label}</p>
                      <p className="text-sm text-gray-500">
                        {address.street_address}, {address.city}, {address.state} {address.postal_code}
                      </p>
                    </div>
                  </label>
                ))}
                {addresses.length === 0 && (
                  <p className="text-gray-500">No saved addresses. Please add an address in your account settings.</p>
                )}
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700">
                  Delivery Instructions (optional)
                </label>
                <Input
                  value={deliveryInstructions}
                  onChange={(e) => setDeliveryInstructions(e.target.value)}
                  placeholder="Apartment number, gate code, etc."
                  className="mt-1"
                />
              </div>
            </Card>
          )}

          {/* Tip */}
          <Card>
            <h2 className="font-semibold text-gray-900">Add a Tip</h2>
            <div className="mt-4 flex gap-3">
              {[0, 200, 300, 500].map((amount) => (
                <button
                  key={amount}
                  onClick={() => setTip(amount)}
                  className={`flex-1 rounded-lg border-2 py-2 text-center transition-colors ${
                    tip === amount
                      ? 'border-[#E85D26] bg-orange-50 font-medium'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {amount === 0 ? 'No tip' : `$${(amount / 100).toFixed(2)}`}
                </button>
              ))}
            </div>
          </Card>

          {/* Order Items */}
          <Card>
            <h2 className="font-semibold text-gray-900">Order Summary</h2>
            <div className="mt-4 divide-y">
              {cart.items.map((item) => (
                <div key={item.id} className="flex items-center gap-4 py-3">
                  <div className="h-12 w-12 rounded-lg bg-gray-100 flex-shrink-0">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-full w-full rounded-lg object-cover"
                      />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <p className="font-medium">${((item.price * item.quantity) / 100).toFixed(2)}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Order Total */}
        <div>
          <Card className="sticky top-24">
            <h2 className="font-semibold text-gray-900">Payment Summary</h2>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">${(subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery fee</span>
                <span className="text-gray-900">${(deliveryFee / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service fee</span>
                <span className="text-gray-900">${(serviceFee / 100).toFixed(2)}</span>
              </div>
              {tip > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tip</span>
                  <span className="text-gray-900">${(tip / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}

            <Button
              onClick={handleSubmitOrder}
              disabled={submitting || (deliveryType === 'delivery' && !selectedAddress)}
              className="mt-4 w-full"
            >
              {submitting ? 'Placing Order...' : 'Place Order'}
            </Button>

            <p className="mt-4 text-center text-xs text-gray-500">
              By placing this order, you agree to our Terms of Service
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}

function LoadingFallback() {
  return (
    <main className="container py-8">
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E85D26] border-t-transparent" />
      </div>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <Suspense fallback={<LoadingFallback />}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}
