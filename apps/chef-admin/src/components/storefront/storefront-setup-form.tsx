'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@ridendine/ui';

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
  'Vietnamese',
  'Korean',
  'Filipino',
  'Soul Food',
  'Caribbean',
  'Vegetarian-Friendly',
  'Vegan-Friendly',
];

export function StorefrontSetupForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.target as HTMLFormElement);
    const cuisineCheckboxes = formRef.current?.querySelectorAll('input[type="checkbox"]:checked');
    const selectedCuisines = Array.from(cuisineCheckboxes || []).map(
      (cb) => (cb as HTMLInputElement).value
    );

    try {
      const response = await fetch('/api/storefront', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description') || null,
          cuisine_types: selectedCuisines,
          min_order_amount: parseFloat(formData.get('min_order_amount') as string) || 0,
          estimated_prep_time_min: parseInt(formData.get('estimated_prep_time_min') as string) || 15,
          estimated_prep_time_max: parseInt(formData.get('estimated_prep_time_max') as string) || 45,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to create storefront');
      }

      // Refresh the page to show the newly created storefront
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100">
          <svg className="h-8 w-8 text-[#E85D26]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create Your Storefront</h1>
        <p className="mt-2 text-gray-500">
          Set up your kitchen profile so customers can find and order from you
        </p>
      </div>

      <form onSubmit={handleSubmit} ref={formRef}>
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          <Card>
            <h2 className="font-semibold text-gray-900">Basic Information</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Storefront Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  placeholder="e.g., Maria's Kitchen, Thai Delights"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                  required
                />
                <p className="mt-1 text-xs text-gray-500">
                  This is how customers will see your kitchen in the marketplace
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  placeholder="Tell customers what makes your kitchen special..."
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-gray-900">Cuisine Types</h2>
            <p className="mt-1 text-sm text-gray-500">
              Select all that apply to help customers discover your kitchen
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {availableCuisines.map((cuisine) => (
                <label
                  key={cuisine}
                  className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    value={cuisine}
                    className="rounded border-gray-300 text-[#E85D26] focus:ring-[#E85D26]"
                  />
                  <span className="text-sm">{cuisine}</span>
                </label>
              ))}
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold text-gray-900">Order Settings</h2>
            <p className="mt-1 text-sm text-gray-500">You can adjust these later</p>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Minimum Order Amount ($)
                </label>
                <input
                  name="min_order_amount"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue="0"
                  placeholder="0.00"
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Min Prep Time (minutes)
                  </label>
                  <input
                    name="estimated_prep_time_min"
                    type="number"
                    min="5"
                    defaultValue="15"
                    placeholder="15"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Max Prep Time (minutes)
                  </label>
                  <input
                    name="estimated_prep_time_max"
                    type="number"
                    min="5"
                    defaultValue="45"
                    placeholder="45"
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-[#E85D26] focus:outline-none focus:ring-1 focus:ring-[#E85D26]"
                  />
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-4">
            <Button type="submit" disabled={loading} className="px-8">
              {loading ? 'Creating...' : 'Create Storefront'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
