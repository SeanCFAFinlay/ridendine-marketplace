'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { Header } from '@/components/layout/header';
import { Button, Card, Input } from '@ridendine/ui';
import { StripePaymentForm } from '@/components/checkout/stripe-payment-form';
import { CheckoutSkeleton } from '@/components/checkout/checkout-skeleton';
import { DeliveryTimePicker } from '@/components/checkout/delivery-time-picker';
import { SavedCardSelector } from '@/components/checkout/saved-card-selector';
import { orderConfirmationPath } from '@/lib/customer-ordering';
import { useEta } from '@/hooks/use-eta';

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
  deliveryDistanceKm?: number;
  surgeMultiplier?: number;
  surgeActive?: boolean;
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
  { label: '15%', percent: 15 },
  { label: '20%', percent: 20 },
  { label: '25%', percent: 25 },
  { label: 'Custom', isCustom: true },
];

const DEFAULT_TIP_PERCENT = 18;

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storefrontId = searchParams.get('storefrontId');

  const [cart, setCart] = useState<Cart | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [deliveryInstructions, setDeliveryInstructions] = useState('');
  const [tip, setTip] = useState(0);
  const [tipPercent, setTipPercent] = useState<number | null>(DEFAULT_TIP_PERCENT);
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [customTip, setCustomTip] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const promoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<OrderBreakdown | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment'>('details');
  const [creatingPayment, setCreatingPayment] = useState(false);

  // Saved payment method state
  const [savedPaymentMethodId, setSavedPaymentMethodId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const { eta: deliveryEta, loading: etaLoading } = useEta(storefrontId, selectedAddress || null);

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
          const loadedCart = {
            id: cartData.data.id,
            storefront_id: cartData.data.storefront_id,
            items,
          };
          setCart(loadedCart);
          // Set default 18% tip based on subtotal
          const sub = items.reduce((s: number, i: CartItem) => s + i.price * i.quantity, 0);
          setTip(Math.round(sub * (DEFAULT_TIP_PERCENT / 100) * 100) / 100);
          setTipPercent(DEFAULT_TIP_PERCENT);
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
  }, [storefrontId, router]);

  /** Cart line total in dollars (matches cart API `unit_price` × qty). */
  const cartSubtotal =
    cart?.items.reduce((sum, item) => sum + item.price * item.quantity, 0) ?? 0;

  /** Driver tip in dollars for `POST /api/checkout` (engine expects currency units, not cents). */
  const tipDollars = useCallback((): number => {
    if (showCustomTip && customTip.trim()) {
      const n = parseFloat(customTip.trim());
      if (!Number.isFinite(n) || n < 0) return 0;
      return Math.round(n * 100) / 100;
    }
    if (tipPercent !== null) {
      return Math.round(cartSubtotal * (tipPercent / 100) * 100) / 100;
    }
    return tip;
  }, [showCustomTip, customTip, tipPercent, tip, cartSubtotal]);

  const validatePromo = useCallback(async (code: string) => {
    if (!code.trim()) {
      setPromoStatus('idle');
      setPromoMessage('');
      setPromoDiscount(0);
      return;
    }
    try {
      const res = await fetch(
        `/api/promos/validate?code=${encodeURIComponent(code)}&subtotal=${cartSubtotal}`
      );
      const json = await res.json();
      if (json.success) {
        setPromoStatus('valid');
        setPromoMessage(`${json.data.discountType === 'percentage' ? `${json.data.discountValue}% off` : `$${json.data.discountAmount.toFixed(2)} off`} applied`);
        setPromoDiscount(json.data.discountAmount);
      } else {
        setPromoStatus('invalid');
        setPromoMessage(json.error || 'Invalid promo code');
        setPromoDiscount(0);
      }
    } catch {
      setPromoStatus('invalid');
      setPromoMessage('Could not validate promo code');
      setPromoDiscount(0);
    }
  }, [cartSubtotal]);

  const handlePromoChange = useCallback((value: string) => {
    setPromoCode(value.toUpperCase());
    setPromoStatus('idle');
    setPromoMessage('');
    if (promoDebounceRef.current) clearTimeout(promoDebounceRef.current);
    promoDebounceRef.current = setTimeout(() => {
      void validatePromo(value.toUpperCase());
    }, 300);
  }, [validatePromo]);

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
          promoCode: promoStatus === 'valid' ? promoCode : null,
          scheduledFor: scheduledFor ?? null,
          savedPaymentMethodId: savedPaymentMethodId ?? null,
          saveCard,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setOrderId(result.data.orderId);
        setBreakdown(result.data.breakdown);

        // Saved card confirmed server-side — no client-secret needed
        if (!result.data.clientSecret) {
          router.push(orderConfirmationPath(result.data.orderId));
          return;
        }

        setClientSecret(result.data.clientSecret);
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
    return <CheckoutSkeleton />;
  }

  if (!cart || cart.items.length === 0) {
    return (
      <main className="container py-8">
        <Card className="p-8 text-center" elevated>
          <h2 className="text-xl font-semibold text-text">Your cart is empty</h2>
          <p className="mt-2 text-textMuted">Add items to your cart before checking out.</p>
          <Link href="/chefs">
            <Button variant="primary" className="mt-4">Browse Chefs</Button>
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
    <>
    <main className="container py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {checkoutStep === 'details' ? (
            <>
              {/* Delivery Address */}
              <Card padding="lg">
                <h2 className="font-semibold text-text">Delivery Address</h2>
                <div className="mt-4 space-y-3">
                  {addresses.map((address) => (
                    <label
                      key={address.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border-2 p-4 transition-colors ${
                        selectedAddress === address.id
                          ? 'border-primary bg-primarySoft'
                          : 'border-border hover:border-borderStrong'
                      }`}
                    >
                      <input
                        type="radio"
                        name="address"
                        value={address.id}
                        checked={selectedAddress === address.id}
                        onChange={(e) => setSelectedAddress(e.target.value)}
                        className="mt-1 h-4 w-4 accent-primary"
                      />
                      <div>
                        <p className="font-medium text-text">{address.label}</p>
                        <p className="text-sm text-textMuted">
                          {address.address_line1}{address.address_line2 ? `, ${address.address_line2}` : ''}, {address.city}, {address.state} {address.postal_code}
                        </p>
                      </div>
                    </label>
                  ))}
                  {addresses.length === 0 && (
                    <p className="text-textMuted">No saved addresses. Please add an address in your account settings.</p>
                  )}
                </div>
                <div className="mt-4">
                  <Input
                    label="Delivery Instructions (optional)"
                    value={deliveryInstructions}
                    onChange={(e) => setDeliveryInstructions(e.target.value)}
                    placeholder="Apartment number, gate code, etc."
                  />
                </div>
              </Card>

              {/* Delivery Time */}
              <DeliveryTimePicker
                selected={scheduledFor}
                onSelect={setScheduledFor}
              />

              {/* Tip */}
              <Card padding="lg">
                <h2 className="font-semibold text-text">Add a Tip for Your Driver</h2>
                <p className="mt-1 text-xs text-textMuted">Default 18% — 100% goes to your driver</p>
                <div className="mt-4 grid grid-cols-4 gap-3">
                  {TIP_OPTIONS.map((option) => {
                    const isCustomOption = Boolean(option.isCustom);
                    const pct = 'percent' in option ? option.percent : null;
                    const tipValue = pct
                      ? Math.round(cartSubtotal * (pct / 100) * 100) / 100
                      : 0;
                    const isSelected = isCustomOption
                      ? showCustomTip
                      : !showCustomTip && tipPercent === pct;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() => {
                          if (isCustomOption) {
                            setShowCustomTip(true);
                            setTipPercent(null);
                          } else {
                            setShowCustomTip(false);
                            setTipPercent(pct ?? 0);
                            setTip(tipValue);
                            setCustomTip('');
                          }
                        }}
                        className={`rounded-md border-2 py-3 text-center transition-colors focus-visible:outline-none focus-visible:shadow-focus ${
                          isSelected
                            ? 'border-primary bg-primarySoft font-medium text-text'
                            : 'border-border text-textMuted hover:border-borderStrong'
                        }`}
                      >
                        <span className="block text-sm">{option.label}</span>
                        {pct && !isCustomOption && (
                          <span className="block text-xs text-textSubtle">
                            ${tipValue.toFixed(2)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {showCustomTip && (
                  <div className="mt-3">
                    <Input
                      type="number"
                      value={customTip}
                      onChange={(e) => setCustomTip(e.target.value)}
                      placeholder="Enter custom tip ($)"
                      min="0"
                      step="0.01"
                      autoFocus
                    />
                  </div>
                )}
                <p className="mt-2 text-sm text-textMuted">
                  Tip amount:{' '}
                  <span className="font-semibold text-primary">
                    ${tipDollars().toFixed(2)}
                  </span>
                  {!showCustomTip && tipPercent !== null && (
                    <span className="ml-1 text-xs text-textSubtle">({tipPercent}%)</span>
                  )}
                </p>
              </Card>

              {/* Payment Method */}
              <Card padding="lg">
                <h2 className="font-semibold text-text">Payment Method</h2>
                <div className="mt-4">
                  <SavedCardSelector
                    onSelect={(pmId, shouldSave) => {
                      setSavedPaymentMethodId(pmId);
                      setSaveCard(shouldSave);
                    }}
                  />
                </div>
              </Card>

              {/* Promo Code */}
              <Card padding="lg">
                <h2 className="font-semibold text-text">Promo Code</h2>
                <div className="mt-4">
                  <Input
                    value={promoCode}
                    onChange={(e) => handlePromoChange(e.target.value)}
                    placeholder="Enter promo code"
                    valid={promoStatus === 'valid'}
                    error={promoStatus === 'invalid' ? promoMessage : undefined}
                    hint={promoStatus === 'valid' ? `✓ ${promoMessage}` : undefined}
                  />
                </div>
              </Card>

              {/* Order Items */}
              <Card padding="lg">
                <h2 className="font-semibold text-text">Order Summary</h2>
                <div className="mt-4 divide-y divide-divider">
                  {cart.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-3">
                      <div className="h-12 w-12 flex-shrink-0 rounded-md bg-surfaceMuted">
                        {item.image_url && (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="h-full w-full rounded-md object-cover"
                          />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-text">{item.name}</p>
                        <p className="text-sm text-textMuted">Qty: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-text">${Number(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            /* Payment Step */
            <Card padding="lg">
              <h2 className="mb-6 font-semibold text-text">Payment Details</h2>
              {clientSecret && (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: 'stripe',
                      variables: {
                        colorPrimary: '#EA5B26',
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
                type="button"
                onClick={() => setCheckoutStep('details')}
                className="mt-4 text-sm text-primary hover:underline focus-visible:outline-none focus-visible:shadow-focus"
              >
                ← Back to order details
              </button>
            </Card>
          )}
        </div>

        {/* Order Total Sidebar */}
        <div>
          <Card className="sticky top-24" padding="lg">
            <h2 className="font-semibold text-text">Payment Summary</h2>
            {/* Estimated delivery time */}
            <div className="mt-3 flex items-center gap-2 rounded-md bg-primarySoft px-3 py-2">
              <svg className="h-4 w-4 flex-shrink-0 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {etaLoading ? (
                <span className="text-sm text-textSubtle">Calculating delivery time...</span>
              ) : deliveryEta ? (
                <span className="text-sm text-text">
                  Est. delivery: <strong>{deliveryEta.minMinutes}–{deliveryEta.maxMinutes} min</strong>
                </span>
              ) : (
                <span className="text-sm text-text">Est. delivery: <strong>~30–45 min</strong></span>
              )}
            </div>
            <div className="mt-4 space-y-2">
              {checkoutStep === 'details' && !hasApiBreakdown ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-textMuted">Subtotal (cart)</span>
                    <span className="text-text">
                      ${Number(cartSubtotal).toFixed(2)}
                    </span>
                  </div>
                  {tipDollars() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-textMuted">Tip (your selection)</span>
                      <span className="text-text">
                        ${Number(tipDollars()).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Promo ({promoCode})</span>
                      <span>-${promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <p className="pt-2 text-xs leading-relaxed text-textMuted">
                    Delivery, service fees, and tax are set by
                    the server when you continue to payment — not shown here as estimates.
                  </p>
                </>
              ) : breakdown ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-textMuted">Subtotal</span>
                    <span className="text-text">
                      ${Number(breakdown.subtotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textMuted">
                      Delivery fee
                      {breakdown.deliveryDistanceKm !== undefined && (
                        <span className="ml-1 text-xs text-textSubtle">
                          ({breakdown.deliveryDistanceKm.toFixed(1)} km)
                        </span>
                      )}
                    </span>
                    <span className="text-text">
                      ${Number(breakdown.deliveryFee).toFixed(2)}
                    </span>
                  </div>
                  {breakdown.surgeActive && breakdown.surgeMultiplier !== undefined && (
                    <div className="flex items-center gap-2 rounded-md border border-warning/30 bg-warningSoft px-3 py-2 text-xs">
                      <span className="font-medium text-warning">High demand</span>
                      <span className="text-warning">
                        Busy area — delivery fee is {breakdown.surgeMultiplier.toFixed(2)}x higher than usual
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-textMuted">Service fee</span>
                    <span className="text-text">
                      ${Number(breakdown.serviceFee).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textMuted">Tax</span>
                    <span className="text-text">
                      ${Number(breakdown.tax).toFixed(2)}
                    </span>
                  </div>
                  {breakdown.tip > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-textMuted">Tip</span>
                      <span className="text-text">
                        ${Number(breakdown.tip).toFixed(2)}
                      </span>
                    </div>
                  )}
                  {breakdown.discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Discount</span>
                      <span>-${Number(breakdown.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t border-divider pt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-text">Total</span>
                      <span className="text-primary">
                        ${Number(paymentTotal).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-textMuted">Preparing payment summary…</p>
              )}
            </div>

            {error && (
              <p className="mt-4 text-sm text-danger">{error}</p>
            )}

            {checkoutStep === 'details' && (
              <Button
                variant="primary"
                size="lg"
                fullWidth
                onClick={handleProceedToPayment}
                disabled={creatingPayment || !selectedAddress}
                loading={creatingPayment}
                className="mt-4"
              >
                {creatingPayment ? 'Processing…' : 'Continue to Payment'}
              </Button>
            )}

            <p className="mt-4 text-center text-xs text-textSubtle">
              By placing this order, you agree to our Terms of Service
            </p>
          </Card>
        </div>
      </div>
    </main>

    {/* Sticky mobile Pay bar */}
    {checkoutStep === 'details' && (
      <div className="fixed bottom-0 left-0 right-0 z-sticky border-t border-border bg-surface p-4 shadow-lg md:hidden">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-textMuted">Subtotal</p>
            <p className="font-semibold text-text">${cartSubtotal.toFixed(2)}</p>
          </div>
          <Button
            variant="primary"
            size="lg"
            onClick={handleProceedToPayment}
            disabled={creatingPayment || !selectedAddress}
            loading={creatingPayment}
            className="flex-1"
          >
            {creatingPayment ? 'Processing…' : 'Continue to Payment'}
          </Button>
        </div>
      </div>
    )}
    {checkoutStep === 'details' && <div className="h-24 md:hidden" />}
    </>
  );
}

function LoadingFallback() {
  return <CheckoutSkeleton />;
}

export default function CheckoutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Suspense fallback={<LoadingFallback />}>
        <CheckoutContent />
      </Suspense>
    </div>
  );
}
