'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Header } from '@/components/layout/header';
import { Button, Card, Input } from '@ridendine/ui';
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';
import { orderConfirmationPath } from '@/lib/customer-ordering';

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

interface CartApiItem {
  id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  menu_items?: {
    name?: string | null;
    image_url?: string | null;
  } | null;
}

interface Address {
  id: string;
  label: string;
  address_line1: string;
  address_line2?: string | null;
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

function mapCheckoutError(code?: string, fallback?: string): string {
  switch (code) {
    case 'VALIDATION_ERROR':
      return fallback || 'Your cart or checkout details are invalid. Please review and try again.';
    case 'RISK_BLOCKED':
      return fallback || 'This order was blocked by risk checks. Please contact support if needed.';
    case 'PAYMENT_CONFIG_ERROR':
      return 'Payment is temporarily unavailable. Please try again shortly.';
    case 'PAYMENT_FAILED':
      return fallback || 'Payment failed. Please try a different card.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'Duplicate checkout detected. Please wait and refresh your order status.';
    case 'INTERNAL_ERROR':
      return 'Something went wrong while creating checkout. Please try again.';
    default:
      return fallback || 'Failed to create checkout';
  }
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
        if (cartRes.status === 401) {
          router.push('/auth/login');
          return;
        }

        if (cartData.success && cartData.data) {
          const items = (cartData.data.cart_items || []).map((item: CartApiItem) => ({
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
        if (addressRes.status === 401) {
          router.push('/auth/login');
          return;
        }

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

  /** Cart line total in dollars (matches cart API `unit_price` × qty). */
  const cartSubtotal =
    cart?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0;

  /** Driver tip in dollars for `POST /api/checkout` (engine expects currency units, not cents). */
  const tipDollars = (): number => {
    const raw = customTip.trim();
    if (raw) {
      const n = parseFloat(raw);
      if (!Number.isFinite(n) || n < 0) return 0;
      return Math.round(n * 100) / 100;
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
          tip: tipDollars(),
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
        setError(mapCheckoutError(result.code, result.error));
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
      router.push(orderConfirmationPath(orderId));
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

  /** Authoritative fees/tax/total only after `POST /api/checkout` (engine + Stripe). */
  const hasApiBreakdown = breakdown !== null;
  const paymentTotal = breakdown
    ? breakdown.subtotal +
      breakdown.deliveryFee +
      breakdown.serviceFee +
      breakdown.tax +
      breakdown.tip -
      breakdown.discount
    : null;

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
                          {address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}, {address.city}, {address.state} {address.postal_code}
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
                      ? Math.round(cartSubtotal * (option.percent / 100) * 100) / 100
                      : (option.value ?? 0);
                    const isSelected =
                      !customTip && Math.abs(tip - tipValue) < 0.0001;

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
                            ${Number(tipValue).toFixed(2)}
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
                  <Button variant="secondary" type="button" disabled>
                    Applied at payment step
                  </Button>
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
                      <p className="font-medium">${Number(item.price * item.quantity).toFixed(2)}</p>
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
              {checkoutStep === 'details' && !hasApiBreakdown ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal (cart)</span>
                    <span className="text-gray-900">
                      ${Number(cartSubtotal).toFixed(2)}
                    </span>
                  </div>
                  {tipDollars() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tip (your selection)</span>
                      <span className="text-gray-900">
                        ${Number(tipDollars()).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <p className="pt-2 text-xs leading-relaxed text-gray-500">
                    Delivery, service fees, tax, and your order total are set by
                    the server when you continue to payment — not shown here as
                    estimates.
                  </p>
                </>
              ) : breakdown ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="text-gray-900">
                      ${Number(breakdown.subtotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Delivery fee</span>
                    <span className="text-gray-900">
                      ${Number(breakdown.deliveryFee).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Service fee</span>
                    <span className="text-gray-900">
                      ${Number(breakdown.serviceFee).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="text-gray-900">
                      ${Number(breakdown.tax).toFixed(2)}
                    </span>
                  </div>
                  {breakdown.tip > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tip</span>
                      <span className="text-gray-900">
                        ${Number(breakdown.tip).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {breakdown.discount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>Discount</span>
                      <span>-${Number(breakdown.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-[#E85D26]">
                        ${Number(paymentTotal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-500">Preparing payment summary…</p>
              )}
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
