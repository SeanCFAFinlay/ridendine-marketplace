'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Header } from '@/components/layout/header';
import { Button, Card, Input } from '@ridendine/ui';
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

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

interface OrderBreakdown {
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tax: number;
  tip: number;
  discount: number;
}

const TIP_OPTIONS = [
  { label: 'No tip', value: 0 },
  { label: '10%', percent: 10 },
  { label: '15%', percent: 15 },
  { label: '20%', percent: 20 },
];

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storefrontId = searchParams.get('storefrontId');

  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [tip, setTip] = useState(0);
  const [customTip, setCustomTip] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<OrderBreakdown | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment'>('details');
  const [creatingPayment, setCreatingPayment] = useState(false);

  useEffect(() => {
    async function loadData() {
      if (!storefrontId) return;

      try {
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

  const calculateTip = () => {
    if (customTip) {
      return Math.round(parseFloat(customTip) * 100) || 0;
    }
    return tip;
  };

  const handleProceedToPayment = async () => {
    if (!selectedAddress) {
      setError('Please select a delivery address');
      return;
    }

    setCreatingPayment(true);
    setError('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storefrontId,
          deliveryAddressId: selectedAddress,
          specialInstructions: deliveryInstructions,
          tip: calculateTip(),
          promoCode: promoCode || null,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setClientSecret(result.data.clientSecret);
        setOrderId(result.data.orderId);
        setBreakdown(result.data.breakdown);
        setCheckoutStep('payment');
      } else {
        setError(result.error || 'Failed to create checkout');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to create checkout. Please try again.');
    } finally {
      setCreatingPayment(false);
    }
  };

  const handlePaymentSuccess = () => {
    if (orderId) {
      router.push(`/order-confirmation/${orderId}`);
    }
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
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

  const displayBreakdown = breakdown || {
    subtotal,
    deliveryFee: 399,
    serviceFee: Math.round(subtotal * 0.08),
    tax: Math.round((subtotal + Math.round(subtotal * 0.08)) * 0.13),
    tip: calculateTip(),
    discount: 0,
  };

  const total = displayBreakdown.subtotal + displayBreakdown.deliveryFee +
    displayBreakdown.serviceFee + displayBreakdown.tax + displayBreakdown.tip - displayBreakdown.discount;

  return (
    <main className="container py-8">
      <h1 className="text-2xl font-bold text-gray-900">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {checkoutStep === 'details' ? (
            <>
              {/* Delivery Address */}
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

              {/* Tip */}
              <Card>
                <h2 className="font-semibold text-gray-900">Add a Tip for Your Driver</h2>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {TIP_OPTIONS.map((option) => {
                    const tipValue = option.percent
                      ? Math.round(subtotal * (option.percent / 100))
                      : (option.value ?? 0);
                    const isSelected = !customTip && tip === tipValue;

                    return (
                      <button
                        key={option.label}
                        onClick={() => {
                          setTip(tipValue);
                          setCustomTip('');
                        }}
                        className={`rounded-lg border-2 py-3 text-center transition-colors ${
                          isSelected
                            ? 'border-[#E85D26] bg-orange-50 font-medium'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <span className="block text-sm">{option.label}</span>
                        {option.percent && (
                          <span className="block text-xs text-gray-500">
                            ${(tipValue / 100).toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3">
                  <Input
                    type="number"
                    value={customTip}
                    onChange={(e) => {
                      setCustomTip(e.target.value);
                      setTip(0);
                    }}
                    placeholder="Custom tip amount"
                    min="0"
                    step="0.01"
                  />
                </div>
              </Card>

              {/* Promo Code */}
              <Card>
                <h2 className="font-semibold text-gray-900">Promo Code</h2>
                <div className="mt-4 flex gap-2">
                  <Input
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    className="flex-1"
                  />
                  <Button variant="secondary">Apply</Button>
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
            </>
          ) : (
            /* Payment Step */
            <Card>
              <h2 className="font-semibold text-gray-900 mb-6">Payment Details</h2>
              {clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#E85D26',
                      },
                    },
                  }}
                >
                  <StripePaymentForm
                    orderId={orderId!}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </Elements>
              )}
              <button
                onClick={() => setCheckoutStep('details')}
                className="mt-4 text-sm text-[#E85D26] hover:underline"
              >
                ← Back to order details
              </button>
            </Card>
          )}
        </div>

        {/* Order Total Sidebar */}
        <div>
          <Card className="sticky top-24">
            <h2 className="font-semibold text-gray-900">Payment Summary</h2>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="text-gray-900">${(displayBreakdown.subtotal / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery fee</span>
                <span className="text-gray-900">${(displayBreakdown.deliveryFee / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Service fee (8%)</span>
                <span className="text-gray-900">${(displayBreakdown.serviceFee / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">HST (13%)</span>
                <span className="text-gray-900">${(displayBreakdown.tax / 100).toFixed(2)}</span>
              </div>
              {displayBreakdown.tip > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tip</span>
                  <span className="text-gray-900">${(displayBreakdown.tip / 100).toFixed(2)}</span>
                </div>
              )}
              {displayBreakdown.discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-${(displayBreakdown.discount / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span className="text-[#E85D26]">${(total / 100).toFixed(2)}</span>
                </div>
              </div>
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600">{error}</p>
            )}

            {checkoutStep === 'details' && (
              <Button
                onClick={handleProceedToPayment}
                disabled={creatingPayment || !selectedAddress}
                className="mt-4 w-full"
                size="lg"
              >
                {creatingPayment ? 'Processing...' : 'Continue to Payment'}
              </Button>
            )}

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
