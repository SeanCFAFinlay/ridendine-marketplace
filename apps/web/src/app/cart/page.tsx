'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button, Card, EmptyState } from '@ridendine/ui';
import { useCart } from '@/contexts/cart-context';
import {
  CART_FEE_DISCLOSURE,
  calculateCartItemCount,
  calculateCartLineTotal,
  calculateCartSubtotal,
  checkoutHrefForStorefront,
  formatCartCurrency,
} from '@/lib/cart-summary';

export default function CartPage() {
  const searchParams = useSearchParams();
  const storefrontIdParam = searchParams.get('storefrontId');
  const { cart, loading, storefrontId, fetchCart, updateQuantity, removeItem } = useCart();

  useEffect(() => {
    if (storefrontIdParam) {
      fetchCart(storefrontIdParam);
    } else if (storefrontId) {
      fetchCart(storefrontId);
    }
  }, [storefrontIdParam, storefrontId, fetchCart]);

  const cartItems = cart?.items ?? [];
  const subtotal = calculateCartSubtotal(cartItems);
  const itemCount = calculateCartItemCount(cartItems);
  const checkoutHref = checkoutHrefForStorefront(cart?.storefront_id ?? storefrontIdParam ?? storefrontId);

  const handleDecrement = (itemId: string, currentQty: number) => {
    if (currentQty <= 1) {
      removeItem(itemId);
    } else {
      updateQuantity(itemId, currentQty - 1);
    }
  };

  const handleIncrement = (itemId: string, currentQty: number) => {
    updateQuantity(itemId, currentQty + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <h1 className="font-display text-2xl font-bold text-text">Your Cart</h1>
          <div className="mt-8 flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <h1 className="font-display text-2xl font-bold tracking-tight text-text">Your Cart</h1>

        {cartItems.length === 0 ? (
          <Card className="mt-8" padding="lg">
            <EmptyState
              icon={
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="Your cart is empty"
              description="Looks like you haven't added any items yet."
              action={
                <Link href="/chefs">
                  <Button variant="primary">Browse Chefs</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                <div className="border-b border-divider pb-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase text-primary">Cart review</p>
                      <h2 className="mt-1 text-xl font-bold text-text">Review your order</h2>
                      <p className="mt-1 text-sm text-textMuted">
                        Check your dishes before checkout confirms fees and payment.
                      </p>
                    </div>
                    <span className="w-fit rounded-md bg-primarySoft px-3 py-2 text-sm font-semibold text-primary">
                      {itemCount} items
                    </span>
                  </div>
                </div>

                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-4 border-b border-divider py-4 last:border-0 md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
                  >
                    <div className="flex min-w-0 items-center gap-4">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-16 w-16 flex-shrink-0 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-md bg-primarySoft">
                          <svg className="h-6 w-6 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <h3 className="font-medium text-text">{item.name}</h3>
                        <p className="text-sm text-textMuted">
                          {formatCartCurrency(item.price)} each
                        </p>
                        {item.special_instructions && (
                          <p className="mt-1 text-xs text-textSubtle">
                            Note: {item.special_instructions}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-3 md:justify-end md:gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDecrement(item.id, item.quantity)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:shadow-focus"
                          aria-label="Decrease quantity"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center font-medium text-text">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleIncrement(item.id, item.quantity)}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-border transition-colors hover:bg-surfaceMuted focus-visible:outline-none focus-visible:shadow-focus"
                          aria-label="Increase quantity"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      <span className="min-w-[64px] text-right font-semibold text-text">
                        {formatCartCurrency(calculateCartLineTotal(item))}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-textSubtle transition-colors hover:text-danger focus-visible:outline-none focus-visible:shadow-focus"
                        aria-label="Remove item"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </Card>
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-24" padding="lg">
                <h2 className="font-semibold text-text">Order Summary</h2>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-textMuted">Items</span>
                    <span className="text-text">{itemCount}</span>
                  </div>
                  <div className="border-t border-divider pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span className="text-text">Cart subtotal</span>
                      <span className="text-primary">{formatCartCurrency(subtotal)}</span>
                    </div>
                    <p className="mt-2 rounded-md bg-primarySoft px-3 py-2 text-xs leading-relaxed text-textMuted">
                      {CART_FEE_DISCLOSURE}
                    </p>
                  </div>
                </div>
                <div className="mt-4 rounded-md border border-border bg-background p-3">
                  <h3 className="text-sm font-bold text-text">Checkout confidence</h3>
                  <div className="mt-3 grid gap-2 text-sm text-textMuted">
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                      <span>Secure payment</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                      <span>Fees confirmed at checkout</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                      <span>Edit until payment</span>
                    </div>
                  </div>
                </div>
                <Link href={checkoutHref} className="mt-4 block">
                  <Button variant="primary" size="lg" fullWidth>
                    Proceed to Checkout
                  </Button>
                </Link>
                <Link href="/chefs" className="mt-2 block w-full text-center text-sm text-textMuted transition-colors hover:text-primary">
                  ← Continue Shopping
                </Link>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Sticky mobile checkout bar */}
      {cartItems.length > 0 && (
        <div
          data-testid="sticky-mobile-checkout-bar"
          className="fixed bottom-0 left-0 right-0 z-sticky border-t border-border bg-surface p-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] shadow-lg lg:hidden"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-textMuted">Subtotal</p>
              <p className="font-semibold text-text">{formatCartCurrency(subtotal)}</p>
              <p className="max-w-[12rem] truncate text-xs text-textSubtle">{CART_FEE_DISCLOSURE}</p>
            </div>
            <Link href={checkoutHref} className="flex-1">
              <Button variant="primary" size="lg" fullWidth>
                Proceed to Checkout
              </Button>
            </Link>
          </div>
        </div>
      )}
      {cartItems.length > 0 && <div className="h-24 lg:hidden" />}
    </div>
  );
}
