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
import { CheckoutProgress } from '@/components/checkout/checkout-progress';
import { orderConfirmationPath } from '@/lib/customer-ordering';
import { calculateCartSubtotal, formatCartCurrency, totalsDifferBeyondTolerance } from '@/lib/cart-summary';
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

function errorText(fallback?: unknown): string | undefined {
  if (!fallback) {
    return undefined;
  }
  if (typeof fallback === 'string') {
    return fallback;
  }
  if (typeof fallback === 'object' && 'message' in fallback) {
    const message = (fallback as { message?: unknown }).message;
    return typeof message === 'string' ? message : undefined;
  }
  return undefined;
}

function mapCheckoutError(code?: string, fallback?: unknown): string {
  const fallbackText = errorText(fallback);

  switch (code) {
    case 'VALIDATION_ERROR':
      return fallbackText || 'Your cart or checkout details are invalid. Please review and try again.';
    case 'RISK_BLOCKED':
      return fallbackText || 'This order was blocked by risk checks. Please contact support if needed.';
    case 'PAYMENT_CONFIG_ERROR':
      return 'Payment is temporarily unavailable. Please try again shortly.';
    case 'PAYMENT_FAILED':
      return fallbackText || 'Payment failed. Please try a different card.';
    case 'IDEMPOTENCY_CONFLICT':
      return 'Duplicate checkout detected. Please wait and refresh your order status.';
    case 'INTERNAL_ERROR':
      return 'Something went wrong while creating checkout. Please try again.';
    default:
      return fallbackText || 'Failed to create checkout';
  }
}

const TIP_OPTIONS = [
  { label: '15%', percent: 15 },
  { label: '20%', percent: 20 },
  { label: '25%', percent: 25 },
  { label: 'Custom', isCustom: true },
];

const DEFAULT_TIP_PERCENT = 18;

const CHECKOUT_TRUST_CUES = [
  {
    title: 'Delivery details first',
    description: 'Confirm address, timing, driver tip, and order notes.',
  },
  {
    title: 'Server-confirmed fees',
    description: 'Delivery, service fees, tax, promos, and total are locked next.',
  },
  {
    title: 'Secure Stripe payment',
    description: 'Payment is collected only after RideNDine confirms the order total.',
  },
];

const CHECKOUT_CONFIDENCE_ITEMS = [
  'Cart subtotal shown now',
  'Fees lock before payment',
  'Edit before payment',
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
  const [tipPercent, setTipPercent] = useState<number | null>(DEFAULT_TIP_PERCENT);
  const [showCustomTip, setShowCustomTip] = useState(false);
  const [customTip, setCustomTip] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoStatus, setPromoStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [promoMessage, setPromoMessage] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [scheduledFor, setScheduledFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const promoDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Sequences promo validation requests so a slow response for an earlier
  // keystroke can never overwrite the result of a later one.
  const promoRequestIdRef = useRef(0);

  // Stripe state
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [breakdown, setBreakdown] = useState<OrderBreakdown | null>(null);
  const [checkoutStep, setCheckoutStep] = useState<'details' | 'payment'>('details');
  const [creatingPayment, setCreatingPayment] = useState(false);
  // Set when the server-confirmed breakdown no longer matches the amounts the
  // customer reviewed on the details step (subtotal + tip − promo discount).
  // While set, the Stripe payment form is gated behind an explicit
  // re-confirmation of the updated total. The server stays the source of
  // truth — this only stops a changed total from being charged silently.
  const [totalChangeNotice, setTotalChangeNotice] = useState<{ expectedTotal: number } | null>(null);

  // Saved payment method state
  const [savedPaymentMethodId, setSavedPaymentMethodId] = useState<string | null>(null);
  const [saveCard, setSaveCard] = useState(false);
  const { eta: deliveryEta, loading: etaLoading } = useEta(storefrontId, selectedAddress || null);

  useEffect(() => {
    async function loadData() {
      if (!storefrontId) {
        setError('Checkout link is missing a storefront. Return to your cart and try again.');
        setLoading(false);
        return;
      }

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
          const sub = calculateCartSubtotal(items);
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

  /** Cart subtotal in dollars — per-line rounding matches the server quote's
   * rounding protocol, so the client total can't drift from accumulated
   * floating-point error and trip the server-side mismatch validation. */
  const cartSubtotal = cart ? calculateCartSubtotal(cart.items) : 0;

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
    const requestId = ++promoRequestIdRef.current;
    if (!code.trim()) {
      setPromoStatus('idle');
      setPromoMessage('');
      setPromoDiscount(0);
      return;
    }
    // In flight: show the validating state until the LATEST response lands.
    // (Stale responses below leave it untouched, so the indicator persists.)
    setPromoStatus('validating');
    try {
      const res = await fetch(
        `/api/promos/validate?code=${encodeURIComponent(code)}&subtotal=${cartSubtotal}`
      );
      const json = await res.json();
      if (requestId !== promoRequestIdRef.current) return; // stale response — newer input exists
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
      if (requestId !== promoRequestIdRef.current) return; // stale response — newer input exists
      setPromoStatus('invalid');
      setPromoMessage('Could not validate promo code');
      setPromoDiscount(0);
    }
  }, [cartSubtotal]);

  const handlePromoChange = useCallback((value: string) => {
    // Invalidate any in-flight validation for older input immediately, so a
    // late response cannot overwrite the reset below before the debounce fires.
    promoRequestIdRef.current += 1;
    setPromoCode(value.toUpperCase());
    // Non-empty input is about to be validated (after the debounce), so show
    // the in-flight state immediately rather than the idle "enter a code" UI.
    setPromoStatus(value.trim() ? 'validating' : 'idle');
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
      const checkoutPayload: Record<string, unknown> = {
        storefrontId,
        deliveryAddressId: selectedAddress,
        specialInstructions: deliveryInstructions,
        tip: tipDollars(),
        saveCard,
      };

      if (promoStatus === 'valid' && promoCode) {
        checkoutPayload.promoCode = promoCode;
      }
      if (scheduledFor) {
        checkoutPayload.scheduledFor = scheduledFor;
      }
      if (savedPaymentMethodId) {
        checkoutPayload.savedPaymentMethodId = savedPaymentMethodId;
      }

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(checkoutPayload),
      });

      const result = await response.json();

      if (result.success) {
        const serverBreakdown: OrderBreakdown | null = result.data.breakdown ?? null;
        setOrderId(result.data.orderId);
        setBreakdown(serverBreakdown);

        // Saved card confirmed server-side — no client-secret needed
        if (!result.data.clientSecret) {
          router.push(orderConfirmationPath(result.data.orderId));
          return;
        }

        // Re-validate before payment: compare what the customer just reviewed
        // (cart subtotal + tip − promo discount; delivery/service fees and tax
        // are server-set and intentionally not shown as estimates on the
        // details step) against the same components of the server breakdown.
        // A mismatch of more than a cent gates payment behind re-confirmation.
        const expectedTotal = cartSubtotal + tipDollars() - (promoStatus === 'valid' ? promoDiscount : 0);
        const serverComparableTotal = serverBreakdown
          ? serverBreakdown.subtotal + serverBreakdown.tip - serverBreakdown.discount
          : expectedTotal;
        setTotalChangeNotice(
          totalsDifferBeyondTolerance(expectedTotal, serverComparableTotal)
            ? { expectedTotal }
            : null
        );

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
    : 0;

  return (
    <>
      <main className="container py-8">
      <h1 className="font-display text-2xl font-bold tracking-tight text-text">Checkout</h1>
      <CheckoutProgress activeStep={checkoutStep} className="mt-4" />

      <Card className="mt-4" padding="lg">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-primary">Final review</p>
            <h2 className="mt-1 text-xl font-bold text-text">Finish your order</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-textMuted">
              Review delivery details first. RideNDine confirms fees and total before secure
              Stripe payment starts.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[520px]">
            {CHECKOUT_TRUST_CUES.map((cue) => (
              <div key={cue.title} className="rounded-lg border border-border bg-surfaceMuted p-3">
                <p className="text-sm font-semibold text-text">{cue.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-textMuted">{cue.description}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

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
                    hint={
                      promoStatus === 'valid'
                        ? `✓ ${promoMessage}`
                        : promoStatus === 'validating'
                          ? 'Checking code…'
                          : undefined
                    }
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
                      <p className="font-medium text-text">{formatCartCurrency(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          ) : (
            /* Payment Step */
            <Card padding="lg">
              <h2 className="mb-6 font-semibold text-text">Payment Details</h2>
              {totalChangeNotice ? (
                <div className="mb-5 rounded-lg border border-warning/30 bg-warningSoft px-4 py-3">
                  <h3 className="text-sm font-bold text-text">Your order total was updated</h3>
                  <p className="mt-1 text-sm leading-relaxed text-textMuted">
                    When RideNDine confirmed your order, the amounts changed from what you
                    reviewed (you expected {formatCartCurrency(totalChangeNotice.expectedTotal)} before
                    delivery, service fees, and tax). Please review the updated breakdown in the
                    payment summary, then confirm the new total to continue.
                  </p>
                  <Button
                    variant="primary"
                    className="mt-3"
                    onClick={() => setTotalChangeNotice(null)}
                  >
                    Confirm updated total — {formatCartCurrency(paymentTotal)}
                  </Button>
                </div>
              ) : (
                <div className="mb-5 rounded-lg border border-success/30 bg-successSoft px-4 py-3">
                  <h3 className="text-sm font-bold text-text">Secure payment with confirmed total</h3>
                  <p className="mt-1 text-sm leading-relaxed text-textMuted">
                    RideNDine has locked delivery, service fees, tax, promos, tip, and total.
                    Stripe securely handles the card step.
                  </p>
                </div>
              )}
              {clientSecret && !totalChangeNotice && (
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
            {checkoutStep === 'details' && (
              <div className="mt-4 rounded-lg border border-border bg-surfaceMuted p-3">
                <h3 className="text-sm font-bold text-text">Checkout confidence</h3>
                <ul className="mt-2 space-y-1 text-sm text-textMuted">
                  {CHECKOUT_CONFIDENCE_ITEMS.map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-4 space-y-2">
              {checkoutStep === 'details' && !hasApiBreakdown ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-textMuted">Subtotal (cart)</span>
                    <span className="text-text">
                      {formatCartCurrency(cartSubtotal)}
                    </span>
                  </div>
                  {tipDollars() > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-textMuted">Tip (your selection)</span>
                      <span className="text-text">
                        {formatCartCurrency(tipDollars())}
                      </span>
                    </div>
                  )}
                  {promoDiscount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Promo ({promoCode})</span>
                      <span>-{formatCartCurrency(promoDiscount)}</span>
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
                      {formatCartCurrency(breakdown.subtotal)}
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
                      {formatCartCurrency(breakdown.deliveryFee)}
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
                      {formatCartCurrency(breakdown.serviceFee)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-textMuted">Tax</span>
                    <span className="text-text">
                      {formatCartCurrency(breakdown.tax)}
                    </span>
                  </div>
                  {breakdown.tip > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-textMuted">Tip</span>
                      <span className="text-text">
                        {formatCartCurrency(breakdown.tip)}
                      </span>
                    </div>
                  )}
                  {breakdown.discount > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Discount</span>
                      <span>-{formatCartCurrency(breakdown.discount)}</span>
                    </div>
                  )}
                  <div className="border-t border-divider pt-2">
                    <div className="flex justify-between text-lg font-semibold">
                      <span className="text-text">Total</span>
                      <span className="text-primary">
                        {formatCartCurrency(paymentTotal)}
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
            <p className="font-semibold text-text">{formatCartCurrency(cartSubtotal)}</p>
            <p className="text-xs text-textSubtle">Fees confirmed next</p>
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
