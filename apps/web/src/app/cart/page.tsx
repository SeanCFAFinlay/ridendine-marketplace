'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Header } from '@/components/layout/header';
import { Button, Card, EmptyState } from '@ridendine/ui';
import { useCart } from '@/contexts/cart-context';

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
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = cartItems.length > 0 ? 399 : 0; // cents
  const serviceFee = Math.round(subtotal * 0.08);
  const tax = Math.round((subtotal + serviceFee) * 0.13);
  const total = subtotal + deliveryFee + serviceFee + tax;

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
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="container py-8">
          <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
          <div className="mt-8 flex items-center justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#E85D26] border-t-transparent" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container py-8">
        <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>

        {cartItems.length === 0 ? (
          <Card className="mt-8">
            <EmptyState
              icon={
                <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              }
              title="Your cart is empty"
              description="Looks like you haven't added any items yet."
              action={
                <Link href="/chefs">
                  <Button>Browse Chefs</Button>
                </Link>
              }
            />
          </Card>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2">
              <Card>
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between border-b border-gray-100 py-4 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-16 w-16 rounded-lg bg-gray-100" />
                      )}
                      <div>
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="text-sm text-gray-500">
                          ${(item.price / 100).toFixed(2)}
                        </p>
                        {item.special_instructions && (
                          <p className="text-xs text-gray-400 mt-1">
                            Note: {item.special_instructions}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDecrement(item.id, item.quantity)}
                          className="rounded-lg border border-gray-300 p-1 hover:bg-gray-100"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => handleIncrement(item.id, item.quantity)}
                          className="rounded-lg border border-gray-300 p-1 hover:bg-gray-100"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>
                      <span className="font-semibold text-gray-900 min-w-[60px] text-right">
                        ${((item.price * item.quantity) / 100).toFixed(2)}
                      </span>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              <Card className="sticky top-24">
                <h2 className="font-semibold text-gray-900">Order Summary</h2>
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
                    <span className="text-gray-600">Service fee (8%)</span>
                    <span className="text-gray-900">${(serviceFee / 100).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">HST (13%)</span>
                    <span className="text-gray-900">${(tax / 100).toFixed(2)}</span>
                  </div>
                  <div className="border-t border-gray-200 pt-2">
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total</span>
                      <span className="text-[#E85D26]">${(total / 100).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                <Link href={`/checkout?storefrontId=${cart?.storefront_id}`}>
                  <Button className="mt-4 w-full" size="lg">
                    Proceed to Checkout
                  </Button>
                </Link>
              </Card>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
