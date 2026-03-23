'use client';

import { Card, Badge, Button } from '@ridendine/ui';
import type { MenuItem } from '@ridendine/db';

interface StorefrontMenuProps {
  storefrontId: string;
  menuItems: MenuItem[];
}

// Group menu items by category
function groupByCategory(items: MenuItem[]) {
  const groups: Record<string, MenuItem[]> = {};
  for (const item of items) {
    const category = item.category_id || 'Other';
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(item);
  }
  return groups;
}

// Format category name
function formatCategoryName(categoryId: string): string {
  return categoryId
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function StorefrontMenu({ storefrontId: _storefrontId, menuItems }: StorefrontMenuProps) {
  const handleAddToCart = (itemId: string) => {
    console.log('Add to cart:', itemId);
    // TODO: Implement add to cart
  };

  const groupedItems = groupByCategory(menuItems);
  const categories = Object.keys(groupedItems);

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
                <svg
                  className="h-12 w-12 text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                  />
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
      {/* Menu Items */}
      <div className="lg:col-span-2">
        {categories.map((categoryId) => (
          <section key={categoryId} className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {formatCategoryName(categoryId)}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {(groupedItems[categoryId] || []).map((item) => (
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
                    <div className="h-24 w-24 flex-shrink-0 rounded-lg bg-gray-100" />
                  )}

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        {item.description && (
                          <p className="mt-1 text-sm text-gray-500">{item.description}</p>
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
                          onClick={() => handleAddToCart(item.id)}
                        >
                          Add
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
            <h3 className="font-semibold text-gray-900">Your Order</h3>
            <div className="mt-4 flex flex-col items-center justify-center py-8 text-center">
              <svg
                className="h-12 w-12 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              <p className="mt-2 text-sm text-gray-500">
                Your cart is empty
              </p>
              <p className="text-sm text-gray-400">
                Add items to get started
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
