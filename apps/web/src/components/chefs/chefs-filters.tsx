'use client';

import { Card, Input, Button } from '@ridendine/ui';

const cuisineTypes = [
  'Mexican',
  'Italian',
  'Thai',
  'Indian',
  'Chinese',
  'Japanese',
  'American',
  'Mediterranean',
  'Southern',
  'Vegan',
];

export function ChefsFilters() {
  return (
    <Card>
      <h3 className="font-semibold text-gray-900">Filters</h3>

      <div className="mt-4">
        <Input
          placeholder="Search chefs..."
          className="w-full"
        />
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700">Cuisine Type</h4>
        <div className="mt-2 space-y-2">
          {cuisineTypes.map((cuisine) => (
            <label key={cuisine} className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-600">{cuisine}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h4 className="text-sm font-medium text-gray-700">Rating</h4>
        <div className="mt-2 space-y-2">
          {[4.5, 4.0, 3.5].map((rating) => (
            <label key={rating} className="flex items-center gap-2">
              <input
                type="radio"
                name="rating"
                className="h-4 w-4 border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-sm text-gray-600">{rating}+ stars</span>
            </label>
          ))}
        </div>
      </div>

      <Button variant="outline" className="mt-6 w-full">
        Clear Filters
      </Button>
    </Card>
  );
}
