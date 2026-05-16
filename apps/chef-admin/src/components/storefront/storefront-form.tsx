'use client';

import { useState, useRef } from 'react';
import { Card, Button } from '@ridendine/ui';

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
  is_active?: boolean;
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

export function StorefrontForm({ storefront: initialStorefront }: StorefrontFormProps) {
  const [storefront, setStorefront] = useState(initialStorefront);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const formRef = useRef<HTMLFormElement>(null);

  function getFormValues(form: HTMLFormElement) {
    const formData = new FormData(form);
    return {
      name: String(formData.get('name') ?? '').trim(),
      description: String(formData.get('description') ?? ''),
      minOrderAmount: Number.parseFloat(String(formData.get('min_order_amount') ?? '0')),
      prepTimeMin: Number.parseInt(String(formData.get('estimated_prep_time_min') ?? '0'), 10),
      prepTimeMax: Number.parseInt(String(formData.get('estimated_prep_time_max') ?? '0'), 10),
    };
  }

  function validateForm(form: HTMLFormElement) {
    const values = getFormValues(form);
    const nextErrors: Record<string, string> = {};

    if (!values.name) nextErrors.name = 'Name is required';
    if (!Number.isFinite(values.minOrderAmount) || values.minOrderAmount < 0) {
      nextErrors.min_order_amount = 'Minimum order amount must be 0 or greater';
    }
    if (
      !Number.isFinite(values.prepTimeMin) ||
      !Number.isFinite(values.prepTimeMax) ||
      values.prepTimeMax <= values.prepTimeMin
    ) {
      nextErrors.estimated_prep_time_max = 'Prep time max must be greater than min';
    }

    return nextErrors;
  }

  function handleFieldBlur(field: string) {
    const form = formRef.current;
    if (!form) return;
    setTouchedFields((current) => ({ ...current, [field]: true }));
    setFieldErrors(validateForm(form));
  }

  function fieldClass(field: string) {
    if (fieldErrors[field]) return 'border-danger';
    if (touchedFields[field]) return 'border-success';
    return 'border-borderStrong';
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const nextErrors = validateForm(form);
    setTouchedFields({
      name: true,
      min_order_amount: true,
      estimated_prep_time_min: true,
      estimated_prep_time_max: true,
    });
    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(form);
    const cuisineCheckboxes = formRef.current?.querySelectorAll('input[type="checkbox"]:checked');
    const selectedCuisines = Array.from(cuisineCheckboxes || []).map(
      (cb) => (cb as HTMLInputElement).value
    );

    try {
      const response = await fetch('/api/storefront', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          description: formData.get('description') || null,
          cuisine_types: selectedCuisines,
          min_order_amount: parseFloat(formData.get('min_order_amount') as string),
          estimated_prep_time_min: parseInt(formData.get('estimated_prep_time_min') as string),
          estimated_prep_time_max: parseInt(formData.get('estimated_prep_time_max') as string),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update storefront');
      }

      const { storefront: updatedStorefront } = await response.json();
      setStorefront(updatedStorefront);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} ref={formRef} noValidate>
      {error && (
        <div className="mb-4 rounded-lg bg-dangerSoft p-4">
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}
      {success && (
        <div className="mb-4 rounded-lg bg-successSoft p-4">
          <p className="text-sm text-success">Storefront updated successfully!</p>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold text-text">Basic Information</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text">Storefront Name</label>
              <input
                name="name"
                type="text"
                defaultValue={storefront.name}
                placeholder="Your storefront name"
                onBlur={() => handleFieldBlur('name')}
                onChange={() => {
                  if (touchedFields.name && formRef.current) setFieldErrors(validateForm(formRef.current));
                }}
                className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldClass('name')}`}
              />
              {fieldErrors.name && <p className="mt-1 text-xs text-danger">{fieldErrors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-text">Description</label>
              <textarea
                name="description"
                defaultValue={storefront.description || ''}
                placeholder="Tell customers about your kitchen..."
                rows={4}
                className="mt-1 w-full rounded-lg border border-borderStrong px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text">Slug</label>
              <input
                type="text"
                value={storefront.slug}
                placeholder="your-kitchen-name"
                className="mt-1 w-full rounded-lg border border-borderStrong bg-surfaceMuted px-3 py-2"
                disabled
              />
              <p className="mt-1 text-xs text-textMuted">
                This will be your URL: ridendine.com/chefs/{storefront.slug}
              </p>
            </div>
          </div>
          <Button className="mt-4" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Card>

        <Card>
          <h2 className="font-semibold text-text">Images</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text">Logo</label>
              <div className="mt-2 flex items-center gap-4">
                <div className="h-20 w-20 overflow-hidden rounded-full bg-surfaceMuted">
                  {storefront.logo_url ? (
                    <img
                      src={storefront.logo_url}
                      alt="Logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-textSubtle">
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
              <label className="block text-sm font-medium text-text">Cover Image</label>
              <div className="mt-2 h-32 overflow-hidden rounded-lg bg-surfaceMuted">
                {storefront.cover_image_url ? (
                  <img
                    src={storefront.cover_image_url}
                    alt="Cover"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-textSubtle">
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
          <h2 className="font-semibold text-text">Cuisine Types</h2>
          <p className="mt-1 text-sm text-textMuted">Help customers find you by selecting your cuisine types</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {availableCuisines.map((cuisine) => (
              <label
                key={cuisine}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 hover:bg-surfaceMuted cursor-pointer"
              >
                <input
                  type="checkbox"
                  value={cuisine}
                  defaultChecked={storefront.cuisine_types.includes(cuisine)}
                  className="rounded border-borderStrong text-primary focus:ring-primary"
                />
                <span className="text-sm">{cuisine}</span>
              </label>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-text">Order Settings</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-text">Minimum Order Amount</label>
              <input
                name="min_order_amount"
                type="number"
                step="0.01"
                min="0"
                defaultValue={storefront.min_order_amount.toFixed(2)}
                placeholder="0.00"
                onBlur={() => handleFieldBlur('min_order_amount')}
                onChange={() => {
                  if (touchedFields.min_order_amount && formRef.current) setFieldErrors(validateForm(formRef.current));
                }}
                className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldClass('min_order_amount')}`}
              />
              {fieldErrors.min_order_amount && (
                <p className="mt-1 text-xs text-danger">{fieldErrors.min_order_amount}</p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text">Prep Time (min)</label>
                <input
                  name="estimated_prep_time_min"
                  type="number"
                  min="0"
                  defaultValue={storefront.estimated_prep_time_min}
                  placeholder="15"
                  onBlur={() => handleFieldBlur('estimated_prep_time_min')}
                  onChange={() => {
                    if (touchedFields.estimated_prep_time_min && formRef.current) {
                      setFieldErrors(validateForm(formRef.current));
                    }
                  }}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldClass('estimated_prep_time_min')}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text">Prep Time (max)</label>
                <input
                  name="estimated_prep_time_max"
                  type="number"
                  min="0"
                  defaultValue={storefront.estimated_prep_time_max}
                  placeholder="45"
                  onBlur={() => handleFieldBlur('estimated_prep_time_max')}
                  onChange={() => {
                    if (touchedFields.estimated_prep_time_max && formRef.current) {
                      setFieldErrors(validateForm(formRef.current));
                    }
                  }}
                  className={`mt-1 w-full rounded-lg border px-3 py-2 ${fieldClass('estimated_prep_time_max')}`}
                />
                {fieldErrors.estimated_prep_time_max && (
                  <p className="mt-1 text-xs text-danger">{fieldErrors.estimated_prep_time_max}</p>
                )}
              </div>
            </div>
          </div>
          <Button className="mt-4" type="submit" disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </Button>
        </Card>
      </div>
    </form>
  );
}
