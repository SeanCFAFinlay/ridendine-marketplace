'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, Button } from '@ridendine/ui';
import { CategoryModal } from './category-modal';
import { ItemModal } from './item-modal';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured: boolean;
  category_id: string;
}

interface MenuCategory {
  id: string;
  name: string;
  description: string | null;
  items: MenuItem[];
}

interface MenuListProps {
  categories: MenuCategory[];
}

export function MenuList({ categories: initialCategories }: MenuListProps) {
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const toggleAvailability = async (itemId: string, currentStatus: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_available: !currentStatus }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update item');
      }

      const { menuItem: updatedItem } = await response.json();
      setCategories(categories.map(cat => ({
        ...cat,
        items: cat.items.map(item => item.id === itemId ? updatedItem : item),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete item');
      }

      setCategories(categories.map(cat => ({
        ...cat,
        items: cat.items.filter(item => item.id !== itemId),
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-6 flex gap-2 flex-wrap">
        <Button variant="outline" onClick={() => setShowCategoryModal(true)}>
          Add Category
        </Button>
        <Button onClick={() => setShowItemModal(true)}>Add Item</Button>
      </div>

      <div className="mt-6 space-y-6">
        {categories.length === 0 ? (
          <Card>
            <p className="py-8 text-center text-sm text-gray-500">
              No menu items yet. Click &quot;Add Category&quot; to get started.
            </p>
          </Card>
        ) : (
          categories.map((category) => (
            <Card key={category.id}>
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div>
                  <h2 className="font-semibold text-gray-900">{category.name}</h2>
                  {category.description && (
                    <p className="mt-0.5 text-sm text-gray-500">{category.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedCategoryId(category.id);
                      setShowItemModal(true);
                    }}
                  >
                    Add Item
                  </Button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {category.items.length === 0 ? (
                  <p className="py-4 text-center text-sm text-gray-400">
                    No items in this category
                  </p>
                ) : (
                  category.items.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 p-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-gray-400">
                              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-gray-900">{item.name}</p>
                            {item.is_featured && (
                              <Badge variant="default" className="text-xs">Featured</Badge>
                            )}
                          </div>
                          {item.description && (
                            <p className="mt-0.5 text-sm text-gray-500 line-clamp-2">{item.description}</p>
                          )}
                          <p className="mt-1 text-sm font-medium text-[#E85D26]">
                            ${item.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap justify-end">
                        <button
                          onClick={() => toggleAvailability(item.id, item.is_available)}
                          disabled={loading}
                          className="focus:outline-none"
                        >
                          <Badge variant={item.is_available ? 'success' : 'default'}>
                            {item.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingItem(item);
                            setShowItemModal(true);
                          }}
                          disabled={loading}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteItem(item.id)}
                          disabled={loading}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {showCategoryModal && (
        <CategoryModal
          onClose={() => setShowCategoryModal(false)}
          onSuccess={(newCategory) => {
            setCategories([...categories, { ...newCategory, items: [] }]);
            setShowCategoryModal(false);
          }}
        />
      )}

      {showItemModal && (
        <ItemModal
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          editingItem={editingItem}
          onClose={() => {
            setShowItemModal(false);
            setEditingItem(null);
            setSelectedCategoryId(null);
          }}
          onSuccess={(item) => {
            if (editingItem) {
              setCategories(categories.map(cat => ({
                ...cat,
                items: cat.items.map(i => i.id === item.id ? item : i),
              })));
            } else {
              setCategories(categories.map(cat =>
                cat.id === item.category_id
                  ? { ...cat, items: [...cat.items, item] }
                  : cat
              ));
            }
            setShowItemModal(false);
            setEditingItem(null);
            setSelectedCategoryId(null);
          }}
        />
      )}
    </>
  );
}
