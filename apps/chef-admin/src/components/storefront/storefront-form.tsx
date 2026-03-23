'use client';

import { Card, Input, Button, Textarea } from '@ridendine/ui';

interface Storefront {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cuisine_types: string[];
  cover_image_url: string | null;
  logo_url: string | null;
  min_order_amount: number;
  estimated_prep_time_min: number;
  estimated_prep_time_max: number;
}

interface StorefrontFormProps {
  storefront: Storefront;
}

const availableCuisines = [
  'Mexican',
  'Italian',
  'Chinese',
  'Japanese',
  'Indian',
  'Thai',
  'Mediterranean',
  'American',
  'Latin',
  'Tex-Mex',
  'Vegetarian-Friendly',
  'Vegan-Friendly',
];

export function StorefrontForm({ storefront }: StorefrontFormProps) {
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Save storefront settings');
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-gray-900">Basic Information</h2>
          <div className="mt-4 space-y-4">
            <Input
              label="Storefront Name"
              defaultValue={storefront.name}
              placeholder="Your storefront name"
              required
            />
            <Textarea
              label="Description"
              defaultValue={storefront.description || ''}
              placeholder="Tell customers about your kitchen..."
              rows={4}
            />
            <Input
              label="Slug"
              defaultValue={storefront.slug}
              placeholder="your-kitchen-name"
              hint={`This will be your URL: ridendine.com/chefs/${storefront.slug}`}
              required
            />
          </div>
          <Button className="mt-4" type="submit">Save Changes</Button>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-900">Images</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Logo</label>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-gray-100">
                  {storefront.logo_url ? (
                    <img
                      src={storefront.logo_url}
                      alt="Logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                <Button variant="outline" size="sm" type="button">Upload</Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cover Image</label>
              <div className="mt-2 h-32 overflow-hidden rounded-lg bg-gray-100">
                {storefront.cover_image_url ? (
                  <img
                    src={storefront.cover_image_url}
                    alt="Cover"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-gray-400">
                    <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </div>
              <Button variant="outline" size="sm" className="mt-2" type="button">Upload</Button>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-900">Cuisine Types</h2>
          <p className="mt-1 text-sm text-gray-500">Help customers find you by selecting your cuisine types</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {availableCuisines.map((cuisine) => (
              <label
                key={cuisine}
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  defaultChecked={storefront.cuisine_types.includes(cuisine)}
                  className="rounded border-gray-300 text-[#E85D26] focus:ring-[#E85D26]"
                />
                <span className="text-sm">{cuisine}</span>
              </label>
            ))}
          </div>
          <Button variant="outline" size="sm" className="mt-4" type="button">
            Add Custom Tag
          </Button>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-900">Order Settings</h2>
          <div className="mt-4 space-y-4">
            <Input
              label="Minimum Order Amount"
              type="number"
              step="0.01"
              defaultValue={storefront.min_order_amount.toFixed(2)}
              placeholder="0.00"
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Prep Time (min)"
                type="number"
                defaultValue={storefront.estimated_prep_time_min}
                placeholder="15"
                required
              />
              <Input
                label="Prep Time (max)"
                type="number"
                defaultValue={storefront.estimated_prep_time_max}
                placeholder="45"
                required
              />
            </div>
          </div>
          <Button className="mt-4" type="submit">Save Changes</Button>
        </Card>
      </div>
    </form>
  );
}
