'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/cart-context';
import { Badge, Button, Card, useToast } from '@ridendine/ui';

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
  return Object.entries(groups).sort((a, b) => a[1].sortOrder - b[1].sortOrder);
}

// Price is stored as decimal (e.g. 18.99), not cents
function formatPrice(price: number): string {
  return `$${Number(price).toFixed(2)}`;
}

export function StorefrontMenu({ storefrontId, menuItems }: StorefrontMenuProps) {
  const { addToCart, loading, cart, itemCount } = useCart();
  const { showToast } = useToast();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);

  const handleAddToCart = async (item: MenuItem) => {
    setAddingItemId(item.id);

    try {
      await addToCart(storefrontId, item.id, 1);
      showToast({ message: `${item.name} added to cart!`, variant: 'success' });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      showToast({ message: 'Failed to add item to cart', variant: 'error' });
    } finally {
      setAddingItemId(null);
    }
  };

  const categories = groupByCategory(menuItems);

  const cartItems = cart?.items ?? [];
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (menuItems.length === 0) {
    return (
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surfaceMuted">
              <svg className="h-8 w-8 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text">Menu coming soon</h3>
            <p className="mt-2 text-textMuted">This chef is still setting up their menu. Check back soon!</p>
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
      {/* Menu Items */}
      <div className="space-y-10 lg:col-span-2">
        {categories.map(([categoryId, { name, items }]) => (
          <section key={categoryId}>
            <div className="mb-5 flex items-center gap-3">
              <h2 className="text-xl font-bold text-text">{name}</h2>
              <div className="h-px flex-1 bg-divider" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <Card
                  key={item.id}
                  padding="sm"
                  className={`group relative flex gap-4 transition-shadow hover:shadow-md ${
                    !item.is_available ? 'opacity-60' : ''
                  }`}
                >
                  {/* Featured badge */}
                  {item.is_featured && (
                    <div className="absolute -top-2 -right-2 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primaryFg shadow">
                      ★ Featured
                    </div>
                  )}

                  {/* Image */}
                  {item.image_url ? (
                    <div
                      className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-md bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.image_url})` }}
                    />
                  ) : (
                    <div className="flex h-24 w-24 flex-shrink-0 items-center justify-center rounded-md bg-primarySoft">
                      <svg className="h-8 w-8 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}

                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold leading-tight text-text">{item.name}</h3>
                    {item.description && (
                      <p className="mt-1 text-sm leading-relaxed text-textMuted line-clamp-2">
                        {item.description}
                      </p>
                    )}

                    {/* Dietary tags */}
                    {item.dietary_tags && item.dietary_tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.dietary_tags.map((tag) => (
                          <Badge key={tag} tone="success" size="sm">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Prep time */}
                    {item.prep_time_minutes && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-textSubtle">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{item.prep_time_minutes} min prep</span>
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-lg font-bold text-text">
                        {formatPrice(item.price)}
                      </span>
                      {item.is_available ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleAddToCart(item)}
                          disabled={loading}
                          loading={addingItemId === item.id}
                          leftIcon={
                            addingItemId === item.id ? null : (
                              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                              </svg>
                            )
                          }
                        >
                          {addingItemId === item.id ? 'Adding…' : 'Add'}
                        </Button>
                      ) : (
                        <span className="rounded-md bg-surfaceMuted px-3 py-1.5 text-sm text-textMuted">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                </Card>
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

      {/* Sticky mobile View Cart bar */}
      {itemCount > 0 && (
        <div
          data-testid="sticky-mobile-view-cart-bar"
          className="fixed bottom-0 left-0 right-0 z-sticky border-t border-border bg-surface p-4 shadow-lg lg:hidden"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-textMuted">Subtotal</p>
              <p className="font-semibold text-text">{formatPrice(subtotal)}</p>
            </div>
            <Link href={`/cart?storefrontId=${storefrontId}`} className="flex-1">
              <Button variant="primary" fullWidth>
                View Cart ({itemCount})
              </Button>
            </Link>
          </div>
        </div>
      )}
      {itemCount > 0 && <div className="h-24 lg:hidden" />}
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
      <Card padding="lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-text">Your Order</h3>
          {itemCount > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primaryFg">
              {itemCount}
            </span>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surfaceMuted">
              <svg className="h-7 w-7 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text">Your cart is empty</p>
            <p className="mt-1 text-xs text-textSubtle">Add items from the menu to get started</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-divider">
              {cartItems.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight text-text">
                      {item.quantity}× {item.name || 'Item'}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-sm text-textMuted">
                    {formatPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              {cartItems.length > 6 && (
                <p className="py-2 text-center text-xs text-textSubtle">
                  +{cartItems.length - 6} more items
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-divider pt-4">
              <div className="flex justify-between text-base font-bold">
                <span className="text-text">Subtotal</span>
                <span className="text-primary">{formatPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-textSubtle">
                Delivery fee and taxes calculated at checkout
              </p>
            </div>

            <Link href={`/cart?storefrontId=${storefrontId}`} className="mt-4 block">
              <Button variant="secondary" fullWidth>
                View Cart ({itemCount})
              </Button>
            </Link>

            <Link href={`/checkout?storefrontId=${storefrontId}`} className="mt-2 block">
              <Button variant="primary" fullWidth>
                Checkout →
              </Button>
            </Link>
          </>
        )}
      </Card>
    </div>
  );
}
