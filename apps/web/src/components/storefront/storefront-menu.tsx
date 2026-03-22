'use client';

import { Card, Badge, Button } from '@ridendine/ui';

interface StorefrontMenuProps {
  storefrontId: string;
}

// Placeholder menu data
const menuCategories = [
  {
    id: 'c1',
    name: 'Appetizers',
    items: [
      {
        id: 'm1',
        name: 'Guacamole & Chips',
        description: 'Fresh made guacamole with house-made tortilla chips',
        price: 8.99,
        dietaryTags: ['Vegan', 'Gluten-Free'],
        isAvailable: true,
      },
      {
        id: 'm2',
        name: 'Queso Fundido',
        description: 'Melted cheese with chorizo and peppers',
        price: 10.99,
        dietaryTags: [],
        isAvailable: true,
      },
    ],
  },
  {
    id: 'c2',
    name: 'Main Courses',
    items: [
      {
        id: 'm3',
        name: 'Carne Asada Plate',
        description: 'Grilled steak with rice, beans, and fresh salsa',
        price: 18.99,
        dietaryTags: ['Gluten-Free'],
        isAvailable: true,
      },
      {
        id: 'm4',
        name: 'Enchiladas Verdes',
        description: 'Three chicken enchiladas with green tomatillo sauce',
        price: 15.99,
        dietaryTags: [],
        isAvailable: true,
      },
      {
        id: 'm5',
        name: 'Fish Tacos',
        description: 'Crispy beer-battered fish with cabbage slaw',
        price: 14.99,
        dietaryTags: [],
        isAvailable: false,
      },
    ],
  },
  {
    id: 'c3',
    name: 'Desserts',
    items: [
      {
        id: 'm6',
        name: 'Churros',
        description: 'Cinnamon sugar churros with chocolate sauce',
        price: 6.99,
        dietaryTags: ['Vegetarian'],
        isAvailable: true,
      },
      {
        id: 'm7',
        name: 'Tres Leches',
        description: 'Traditional three milk cake',
        price: 7.99,
        dietaryTags: ['Vegetarian'],
        isAvailable: true,
      },
    ],
  },
];

export function StorefrontMenu({ storefrontId: _storefrontId }: StorefrontMenuProps) {
  const handleAddToCart = (itemId: string) => {
    console.log('Add to cart:', itemId);
    // TODO: Implement add to cart
  };

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Menu Items */}
      <div className="lg:col-span-2">
        {menuCategories.map((category) => (
          <section key={category.id} className="mb-8">
            <h2 className="mb-4 text-xl font-semibold text-gray-900">
              {category.name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {category.items.map((item) => (
                <Card
                  key={item.id}
                  className={`flex gap-4 ${!item.isAvailable ? 'opacity-60' : ''}`}
                >
                  {/* Image placeholder */}
                  <div className="h-24 w-24 flex-shrink-0 rounded-lg bg-gray-100" />

                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">{item.name}</h3>
                        <p className="mt-1 text-sm text-gray-500">{item.description}</p>
                      </div>
                    </div>

                    {item.dietaryTags.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.dietaryTags.map((tag) => (
                          <Badge key={tag} variant="success" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-semibold text-gray-900">
                        ${item.price.toFixed(2)}
                      </span>
                      {item.isAvailable ? (
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
