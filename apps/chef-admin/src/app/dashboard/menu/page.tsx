'use client';

export const dynamic = 'force-dynamic';

import { Card, Badge, Button } from '@ridendine/ui';

const menuCategories = [
  {
    id: 'c1',
    name: 'Appetizers',
    items: [
      { id: 'm1', name: 'Guacamole & Chips', price: 8.99, isAvailable: true },
      { id: 'm2', name: 'Queso Fundido', price: 10.99, isAvailable: true },
    ],
  },
  {
    id: 'c2',
    name: 'Main Courses',
    items: [
      { id: 'm3', name: 'Carne Asada Plate', price: 18.99, isAvailable: true },
      { id: 'm4', name: 'Enchiladas Verdes', price: 15.99, isAvailable: true },
      { id: 'm5', name: 'Fish Tacos', price: 14.99, isAvailable: false },
    ],
  },
  {
    id: 'c3',
    name: 'Desserts',
    items: [
      { id: 'm6', name: 'Churros', price: 6.99, isAvailable: true },
      { id: 'm7', name: 'Tres Leches', price: 7.99, isAvailable: true },
    ],
  },
];

export default function MenuPage() {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
          <p className="mt-1 text-gray-500">Manage your menu categories and items</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Add Category</Button>
          <Button>Add Item</Button>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {menuCategories.map((category) => (
          <Card key={category.id}>
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="font-semibold text-gray-900">{category.name}</h2>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">Edit</Button>
                <Button variant="ghost" size="sm">Reorder</Button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {category.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-lg bg-gray-100" />
                    <div>
                      <p className="font-medium text-gray-900">{item.name}</p>
                      <p className="text-sm text-gray-500">${item.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={item.isAvailable ? 'success' : 'default'}>
                      {item.isAvailable ? 'Available' : 'Unavailable'}
                    </Badge>
                    <Button variant="outline" size="sm">Edit</Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
