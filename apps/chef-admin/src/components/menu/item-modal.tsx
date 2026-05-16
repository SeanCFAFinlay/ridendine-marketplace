'use client';

import { useState } from 'react';
import { Button } from '@ridendine/ui';
import { Clock, Image, Package, Save, Tags, X } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  is_sold_out: boolean | null;
  sold_out_at: string | null;
  restock_at: string | null;
  daily_limit: number | null;
  daily_sold: number | null;
  prep_time_minutes: number | null;
  dietary_tags: string[] | null;
  category_id: string;
}

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
}

interface ItemModalProps {
  categories: MenuCategory[];
  selectedCategoryId: string | null;
  editingItem: MenuItem | null;
  onClose: () => void;
  onSuccess: (item: MenuItem) => void;
}

export function ItemModal({ categories, selectedCategoryId, editingItem, onClose, onSuccess }: ItemModalProps) {
  const [name, setName] = useState(editingItem?.name || '');
  const [description, setDescription] = useState(editingItem?.description || '');
  const [price, setPrice] = useState(editingItem?.price.toString() || '');
  const [categoryId, setCategoryId] = useState(selectedCategoryId || editingItem?.category_id || categories[0]?.id || '');
  const [imageUrl, setImageUrl] = useState(editingItem?.image_url || '');
  const [isAvailable, setIsAvailable] = useState(editingItem?.is_available ?? true);
  const [isFeatured, setIsFeatured] = useState(editingItem?.is_featured ?? false);
  const [isSoldOut, setIsSoldOut] = useState(editingItem?.is_sold_out ?? false);
  const [dailyLimit, setDailyLimit] = useState(editingItem?.daily_limit?.toString() || '');
  const [dailySold, setDailySold] = useState(editingItem?.daily_sold?.toString() || '');
  const [restockAt, setRestockAt] = useState(editingItem?.restock_at ? editingItem.restock_at.slice(0, 16) : '');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(editingItem?.prep_time_minutes?.toString() || '');
  const [dietaryTags, setDietaryTags] = useState((editingItem?.dietary_tags || []).join(', '));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editingItem ? `/api/menu/${editingItem.id}` : '/api/menu';
      const method = editingItem ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          price: parseFloat(price),
          category_id: categoryId,
          image_url: imageUrl || null,
          is_available: isAvailable,
          is_featured: isFeatured,
          is_sold_out: isSoldOut,
          daily_limit: dailyLimit ? Number(dailyLimit) : null,
          daily_sold: dailySold ? Number(dailySold) : 0,
          restock_at: restockAt ? new Date(restockAt).toISOString() : null,
          prep_time_minutes: prepTimeMinutes ? Number(prepTimeMinutes) : null,
          dietary_tags: dietaryTags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save item');
      }

      const { menuItem } = await response.json();
      onSuccess(menuItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-2xl rounded-lg bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-text">
              {editingItem ? 'Edit Item' : 'Add Menu Item'}
            </h2>
            <p className="mt-1 text-sm text-textMuted">
              Keep this item consistent across chef, customer, and ops dashboards.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-textSubtle hover:bg-surfaceMuted hover:text-textMuted"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {error && (
          <div className="mt-2 rounded-lg bg-dangerSoft p-3">
            <p className="text-sm text-danger">{error}</p>
          </div>
        )}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-borderStrong px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full rounded-lg border border-borderStrong px-3 py-2"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Price</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-lg border border-borderStrong px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Category</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-borderStrong px-3 py-2"
              required
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text">Image URL (optional)</label>
            <div className="mt-1 flex items-center gap-2 rounded-lg border border-borderStrong px-3 py-2">
              <Image className="h-4 w-4 text-textSubtle" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                className="min-w-0 flex-1 outline-none"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-text">Daily Limit</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-borderStrong px-3 py-2">
                <Package className="h-4 w-4 text-textSubtle" />
                <input
                  type="number"
                  min="0"
                  value={dailyLimit}
                  onChange={(e) => setDailyLimit(e.target.value)}
                  className="min-w-0 flex-1 outline-none"
                  placeholder="No limit"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-text">Sold Today</label>
              <input
                type="number"
                min="0"
                value={dailySold}
                onChange={(e) => setDailySold(e.target.value)}
                className="mt-1 w-full rounded-lg border border-borderStrong px-3 py-2"
                placeholder="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text">Prep Minutes</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-borderStrong px-3 py-2">
                <Clock className="h-4 w-4 text-textSubtle" />
                <input
                  type="number"
                  min="0"
                  value={prepTimeMinutes}
                  onChange={(e) => setPrepTimeMinutes(e.target.value)}
                  className="min-w-0 flex-1 outline-none"
                  placeholder="Default"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-text">Restock At</label>
              <input
                type="datetime-local"
                value={restockAt}
                onChange={(e) => setRestockAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-borderStrong px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text">Dietary Tags</label>
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-borderStrong px-3 py-2">
                <Tags className="h-4 w-4 text-textSubtle" />
                <input
                  type="text"
                  value={dietaryTags}
                  onChange={(e) => setDietaryTags(e.target.value)}
                  className="min-w-0 flex-1 outline-none"
                  placeholder="vegan, gluten free"
                />
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="rounded border-borderStrong"
              />
              <span className="text-sm text-text">Available</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="rounded border-borderStrong"
              />
              <span className="text-sm text-text">Featured</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isSoldOut}
                onChange={(e) => setIsSoldOut(e.target.checked)}
                className="rounded border-borderStrong"
              />
              <span className="text-sm text-text">Sold out</span>
            </label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="mr-2 h-4 w-4" />
              {loading ? 'Saving...' : editingItem ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
