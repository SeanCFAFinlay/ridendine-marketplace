'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, Badge, Button } from '@ridendine/ui';
import { useCart } from '@/contexts/cart-context';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  dietary_tags: string[] | null;
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
  const groups: Record<string, { name: string; items: MenuItem[] }> = {};
  for (const item of items) {
    const categoryId = item.category_id || 'other';
    const categoryName = item.menu_categories?.name || 'Other';
    if (!groups[categoryId]) {
      groups[categoryId] = { name: categoryName, items: [] };
    }
    groups[categoryId].items.push(item);
  }
  return groups;
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
      setTimeout(() => setSuccessMessage(''), 2000);
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      setAddingItemId(null);
    }
  };

  const groupedItems = groupByCategory(menuItems);
  const categories = Object.entries(groupedItems);

  // Calculate cart totals
  const cartItems = cart?.items ?? [];
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (menuItems.length === 0) {
    return (
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="py-12 text-center">
            <p className="text-gray-500">No menu items available at the moment.</p>
            <p className="mt-1 text-sm text-gray-400">Check back soon for delicious offerings!</p>
          </Card>
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <Card>
              <h3 className="font-semibold text-gray-900">Your Order</h3>
              <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
                <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Your cart is empty</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Success Message */}
      {successMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Menu Items */}
      <div className="lg:col-span-2">
        {categories.map(([categoryId, { name, items }]) => (
          <section key={categoryId} className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">{name}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {items.map((item) => (
                <Card
                  key={item.id}
                  className={`flex gap-4 ${!item.is_available ? 'opacity-60' : ''}`}
                >
                  {/* Image */}
                  {item.image_url ? (
                    <div
                      className="h-24 w-24 flex-shrink-0 rounded-lg bg-cover bg-center"
                      style={{ backgroundImage: `url(${item.image_url})` }}
                    />
                  ) : (
                    <div className="h-24 w-24 flex-shrink-0 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                      <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">{item.name}</h3>
                        {item.description && (
                          <p className="mt-1 text-sm text-gray-500 line-clamp-2">{item.description}</p>
                        )}
                      </div>
                    </div>

                    {item.dietary_tags && item.dietary_tags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.dietary_tags.map((tag) => (
                          <Badge key={tag} variant="success" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        ${(item.price / 100).toFixed(2)}
                      </span>
                      {item.is_available ? (
                        <Button
                          size="sm"
                          onClick={() => handleAddToCart(item)}
                          disabled={loading || addingItemId === item.id}
                        >
                          {addingItemId === item.id ? 'Adding...' : 'Add'}
                        </Button>
                      ) : (
                        <span className="text-sm text-gray-500">Unavailable</span>
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
        <div className="sticky top-24">
          <Card>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Your Order</h3>
              {itemCount > 0 && (
                <Badge className="bg-[#E85D26] text-white">{itemCount}</Badge>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
                <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="mt-2 text-sm text-gray-500">Your cart is empty</p>
                <p className="text-sm text-gray-400">Add items to get started</p>
              </div>
            ) : (
              <>
                <div className="mt-4 divide-y divide-gray-100">
                  {cartItems.slice(0, 5).map((item) => (
                    <div key={item.id} className="py-2 flex justify-between items-center">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {item.quantity}x {item.name}
                        </p>
                      </div>
                      <span className="text-sm text-gray-600 ml-2">
                        ${((item.price * item.quantity) / 100).toFixed(2)}
                      </span>
                    </div>
                  ))}
                  {cartItems.length > 5 && (
                    <p className="py-2 text-sm text-gray-500">
                      +{cartItems.length - 5} more items
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between font-semibold">
                    <span>Subtotal</span>
                    <span className="text-[#E85D26]">${(subtotal / 100).toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Delivery fee and taxes calculated at checkout
                  </p>
                </div>

                <Link href={`/cart?storefrontId=${storefrontId}`}>
                  <Button className="mt-4 w-full">
                    View Cart ({itemCount})
                  </Button>
                </Link>

                <Link href={`/checkout?storefrontId=${storefrontId}`}>
                  <Button className="mt-2 w-full" variant="secondary">
                    Checkout
                  </Button>
                </Link>
              </>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
