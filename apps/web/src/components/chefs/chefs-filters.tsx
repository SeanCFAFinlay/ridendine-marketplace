'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Input, Button, Select } from '@ridendine/ui';

const cuisineTypes = [
  'Mexican', 'Italian', 'Thai', 'Indian', 'Chinese',
  'Japanese', 'American', 'Mediterranean', 'Southern', 'Vegan',
];

const sortOptions = [
  { value: 'default', label: 'Featured' },
  { value: 'fastest', label: 'Fastest Delivery' },
  { value: 'rating', label: 'Highest Rated' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
] as const;

export function ChefsFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [selectedCuisines, setSelectedCuisines] = useState<string[]>(
    searchParams.getAll('cuisine')
  );
  const [minRating, setMinRating] = useState(searchParams.get('rating') || '');
  const [sortBy, setSortBy] = useState(searchParams.get('sort') || 'default');
  const [openNow, setOpenNow] = useState(searchParams.get('openNow') === 'true');
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const activeFiltersCount =
    selectedCuisines.length +
    (minRating ? 1 : 0) +
    (sortBy !== 'default' ? 1 : 0) +
    (openNow ? 1 : 0);

  const applyFilters = () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    selectedCuisines.forEach((c) => params.append('cuisine', c));
    if (minRating) params.set('rating', minRating);
    if (sortBy && sortBy !== 'default') params.set('sort', sortBy);
    if (openNow) params.set('openNow', 'true');
    router.push(`/chefs?${params.toString()}`);
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedCuisines([]);
    setMinRating('');
    setSortBy('default');
    setOpenNow(false);
    router.push('/chefs');
  };

  const toggleCuisine = (cuisine: string) => {
    setSelectedCuisines((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  };

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-text">Filters</h3>
        <button
          type="button"
          onClick={() => setMobileExpanded(!mobileExpanded)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1 text-xs font-semibold text-text transition-colors hover:bg-surfaceMuted lg:hidden"
          aria-expanded={mobileExpanded}
          aria-label={mobileExpanded ? 'Collapse filters' : 'Expand filters'}
        >
          <span>{mobileExpanded ? 'Hide' : 'Filter & Sort'}</span>
          {activeFiltersCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
              {activeFiltersCount}
            </span>
          )}
          <svg
            className={`h-4 w-4 text-textMuted transition-transform ${mobileExpanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <div className="mt-4">
        <Input
          placeholder="Search chefs, cuisines..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
        />
      </div>

      <div className={`space-y-6 ${mobileExpanded ? 'mt-6 block' : 'hidden lg:mt-6 lg:block'}`}>
        <div>
          <Select
            label="Sort By"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border bg-surfaceMuted px-3 py-2">
            <span>
              <span className="block text-sm font-medium text-text">Open now</span>
              <span className="block text-xs text-textMuted">Show chefs taking orders today</span>
            </span>
            <input
              type="checkbox"
              aria-label="Open now"
              checked={openNow}
              onChange={(e) => setOpenNow(e.target.checked)}
              className="h-4 w-4 rounded border-border text-primary accent-primary focus-visible:shadow-focus focus-visible:outline-none"
            />
          </label>
        </div>

        <div>
          <h4 className="text-sm font-medium text-text">Cuisine Type</h4>
          <div className="mt-2 space-y-2">
            {cuisineTypes.map((cuisine) => (
              <label key={cuisine} className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedCuisines.includes(cuisine)}
                  onChange={() => toggleCuisine(cuisine)}
                  className="h-4 w-4 rounded border-border text-primary accent-primary focus-visible:shadow-focus focus-visible:outline-none"
                />
                <span className="text-sm text-textMuted">{cuisine}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-text">Rating</h4>
          <div className="mt-2 space-y-2">
            {[4.5, 4.0, 3.5].map((rating) => (
              <label key={rating} className="flex cursor-pointer items-center gap-2">
                <input
                  type="radio"
                  name="rating"
                  checked={minRating === String(rating)}
                  onChange={() => setMinRating(String(rating))}
                  className="h-4 w-4 border-border text-primary accent-primary focus-visible:shadow-focus focus-visible:outline-none"
                />
                <span className="text-sm text-textMuted">{rating}+ stars</span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Button onClick={applyFilters} fullWidth>
            Apply Filters
          </Button>
          <Button variant="secondary" onClick={clearFilters} fullWidth>
            Clear Filters
          </Button>
        </div>
      </div>
    </Card>
  );
}
