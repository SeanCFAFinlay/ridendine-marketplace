'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/cart-context';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured?: boolean;
  dietary_tags: string[] | null;
  prep_time_minutes?: number | null;
  category_id: string;
  menu_categories?: {
    id: string;
    name: string;
    sort_order: number;
  } | null;
}

interface StorefrontMenuProps {
  storefrontId: string;
  menuItems: MenuItem[];
}

// Group menu items by category
function groupByCategory(items: MenuItem[]) {
  const groups: Record<string, { name: string; sortOrder: number; items: MenuItem[] }> = {};
  for (const item of items) {
    const categoryId = item.category_id || 'other';
    const categoryName = item.menu_categories?.name || 'Menu';
    const sortOrder = item.menu_categories?.sort_order || 99;
    if (!groups[categoryId]) {
      groups[categoryId] = { name: categoryName, sortOrder, items: [] };
    }
    groups[categoryId].items.push(item);
  }
  // Sort by sort_order
  return Object.entries(groups).sort((a, b) => a[1].sortOrder - b[1].sortOrder);
}

// Price is stored as decimal (e.g. 18.99), not cents
function formatPrice(price: number): string {
  return `$${Number(price).toFixed(2)}`;
}

export function StorefrontMenu({ storefrontId, menuItems }: StorefrontMenuProps) {
  const { addToCart, loading, cart, itemCount } = useCart();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleAddToCart = async (item: MenuItem) => {
    setAddingItemId(item.id);
    setSuccessMessage('');

    try {
      await addToCart(storefrontId, item.id, 1);
      setSuccessMessage(`${item.name} added to cart!`);
      setTimeout(() => setSuccessMessage(''), 2500);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingItemId(null);
    }
  };

  const categories = groupByCategory(menuItems);

  // Cart items
  const cartItems = cart?.items ?? [];
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (menuItems.length === 0) {
    return (
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-gray-200 py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Menu coming soon</h3>
            <p className="mt-2 text-gray-500">This chef is still setting up their menu. Check back soon!</p>
          </div>
        </div>
        <div className="lg:col-span-1">
          <CartSidebar cartItems={[]} itemCount={0} subtotal={0} storefrontId={storefrontId} />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Toast notification */}
      {successMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-white shadow-xl animate-fade-in">
          <svg className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{successMessage}</span>
        </div>
      )}

      {/* Menu Items */}
      <div className="lg:col-span-2 space-y-10">
        {categories.map(([categoryId, { name, items }]) => (
          <section key={categoryId}>
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{name}</h2>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`group relative flex gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:shadow-md ${
                    !item.is_available ? 'opacity-60' : ''
                  }`}
                >
                  {/* Featured badge */}
                  {item.is_featured && (
                    <div className="absolute -top-2 -right-2 rounded-full bg-[#E85D26] px-2 py-0.5 text-xs font-bold text-white shadow">
                      ★ Featured
                    </div>
                  )}

                  {/* Image */}
                  {item.image_url ? (
                    <div
                      className="h-24 w-24 flex-shrink-0 rounded-xl bg-cover bg-center overflow-hidden"
                      style={{ backgroundImage: `url(${item.image_url})` }}
                    />
                  ) : (
                    <div className="h-24 w-24 flex-shrink-0 rounded-xl bg-gradient-to-br from-[#fff0e8] to-[#fde8d8] flex items-center justify-center">
                      <svg className="h-8 w-8 text-[#E85D26]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 leading-tight">{item.name}</h3>
                    {item.description && (
                      <p className="mt-1 text-sm text-gray-500 line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    )}

                    {/* Dietary tags */}
                    {item.dietary_tags && item.dietary_tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.dietary_tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Prep time */}
                    {item.prep_time_minutes && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-gray-400">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{item.prep_time_minutes} min prep</span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-gray-900">
                        {formatPrice(item.price)}
                      </span>
                      {item.is_available ? (
                        <button
                          onClick={() => handleAddToCart(item)}
                          disabled={loading || addingItemId === item.id}
                          className="flex items-center gap-1.5 rounded-xl bg-[#E85D26] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#d44e1e] disabled:opacity-60"
                        >
                          {addingItemId === item.id ? (
                            <>
                              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Adding...
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                              Add
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="rounded-xl bg-gray-100 px-3 py-1.5 text-sm text-gray-500">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Cart Summary (sticky) */}
      <div className="lg:col-span-1">
        <CartSidebar
          cartItems={cartItems}
          itemCount={itemCount}
          subtotal={subtotal}
          storefrontId={storefrontId}
        />
      </div>
    </div>
  );
}

interface CartItem {
  id: string;
  name?: string;
  price: number;
  quantity: number;
}

function CartSidebar({
  cartItems,
  itemCount,
  subtotal,
  storefrontId,
}: {
  cartItems: CartItem[];
  itemCount: number;
  subtotal: number;
  storefrontId: string;
}) {
  return (
    <div className="sticky top-24">
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-900">Your Order</h3>
          {itemCount > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#E85D26] text-xs font-bold text-white">
              {itemCount}
            </span>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-50">
              <svg className="h-7 w-7 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-gray-700">Your cart is empty</p>
            <p className="mt-1 text-xs text-gray-400">Add items from the menu to get started</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-gray-50">
              {cartItems.slice(0, 6).map((item) => (
                <div key={item.id} className="py-2.5 flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-tight">
                      {item.quantity}× {item.name || 'Item'}
                    </p>
                  </div>
                  <span className="text-sm text-gray-600 flex-shrink-0">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              {cartItems.length > 6 && (
                <p className="py-2 text-xs text-gray-400 text-center">
                  +{cartItems.length - 6} more items
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <div className="flex justify-between text-base font-bold">
                <span className="text-gray-900">Subtotal</span>
                <span className="text-[#E85D26]">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-gray-400">
                Delivery fee and taxes calculated at checkout
              </p>
            </div>

            <Link href={`/cart?storefrontId=${storefrontId}`}>
              <button className="mt-4 w-full rounded-xl border border-[#E85D26] bg-white py-2.5 text-sm font-semibold text-[#E85D26] transition-colors hover:bg-[#fff0e8]">
                View Cart ({itemCount})
              </button>
            </Link>

            <Link href={`/checkout?storefrontId=${storefrontId}`}>
              <button className="mt-2 w-full rounded-xl bg-[#E85D26] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#d44e1e]">
                Checkout →
              </button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
