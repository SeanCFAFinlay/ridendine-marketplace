'use client';

import { useEffect, useMemo, useState } from 'react';
import { Badge, Button } from '@ridendine/ui';
import {
  AlertTriangle,
  BarChart3,
  Camera,
  ChefHat,
  Clock,
  Copy,
  Edit3,
  Eye,
  EyeOff,
  Gauge,
  PackageCheck,
  PackageX,
  Plus,
  Search,
  Trash2,
  Utensils,
} from 'lucide-react';
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
  items: MenuItem[];
}

interface MenuListProps {
  categories: MenuCategory[];
  storefrontName: string;
}

type MenuFilter = 'all' | 'available' | 'sold-out' | 'featured' | 'low-capacity' | 'needs-setup';

const FILTERS: Array<{ id: MenuFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'available', label: 'Available' },
  { id: 'sold-out', label: 'Sold Out' },
  { id: 'featured', label: 'Featured' },
  { id: 'low-capacity', label: 'Low capacity' },
  { id: 'needs-setup', label: 'Needs setup' },
];

function getRemaining(item: MenuItem) {
  if (item.daily_limit == null) return null;
  return Math.max(Number(item.daily_limit) - Number(item.daily_sold ?? 0), 0);
}

function isLowCapacity(item: MenuItem) {
  const remaining = getRemaining(item);
  return remaining != null && Number(item.daily_limit) > 0 && remaining <= 3;
}

function getSetupIssues(item: MenuItem) {
  return [
    !item.image_url ? 'photo' : null,
    !item.description ? 'description' : null,
    !item.prep_time_minutes ? 'prep time' : null,
    item.daily_limit == null ? 'daily limit' : null,
  ].filter(Boolean) as string[];
}

function getItemHealth(item: MenuItem) {
  const issues = getSetupIssues(item);

  if (item.is_sold_out) {
    return { label: 'Sold Out', tone: 'bg-dangerSoft text-danger ring-danger/30', detail: 'Restock before customers can order' };
  }

  if (!item.is_available) {
    return { label: 'Hidden', tone: 'bg-surfaceMuted text-text ring-border', detail: 'Not visible to customers' };
  }

  if (isLowCapacity(item)) {
    return { label: 'Low capacity', tone: 'bg-warningSoft text-warning ring-warning/30', detail: `${getRemaining(item)} portions left today` };
  }

  if (issues.length > 0) {
    return { label: 'Needs setup', tone: 'bg-primarySoft text-primary ring-primary/30', detail: `Missing ${issues.slice(0, 2).join(', ')}` };
  }

  return { label: 'Ready', tone: 'bg-successSoft text-success ring-success/30', detail: 'Customer-ready and operational' };
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(value);
}

export function MenuList({ categories: initialCategories, storefrontName }: MenuListProps) {
  const [categories, setCategories] = useState<MenuCategory[]>(initialCategories);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [filter, setFilter] = useState<MenuFilter>('all');
  const [query, setQuery] = useState('');

  useEffect(() => {
    setCategories(initialCategories);
  }, [initialCategories]);

  const items = useMemo(
    () => categories.flatMap((category) => category.items.map((item) => ({ ...item, categoryName: category.name }))),
    [categories]
  );

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return categories
      .map((category) => ({
        ...category,
        items: category.items.filter((item) => {
          const matchesQuery = !normalizedQuery ||
            item.name.toLowerCase().includes(normalizedQuery) ||
            category.name.toLowerCase().includes(normalizedQuery) ||
            item.description?.toLowerCase().includes(normalizedQuery) ||
            item.dietary_tags?.some((tag) => tag.toLowerCase().includes(normalizedQuery));

          const matchesFilter =
            filter === 'all' ||
            (filter === 'available' && item.is_available && !item.is_sold_out) ||
            (filter === 'sold-out' && Boolean(item.is_sold_out)) ||
            (filter === 'featured' && item.is_featured) ||
            (filter === 'low-capacity' && isLowCapacity(item)) ||
            (filter === 'needs-setup' && getSetupIssues(item).length > 0);

          return matchesQuery && matchesFilter;
        }),
      }))
      .filter((category) => category.items.length > 0 || (filter === 'all' && !normalizedQuery));
  }, [categories, filter, query]);

  const operations = useMemo(() => {
    const activeItems = items.filter((item) => item.is_available && !item.is_sold_out);
    const totalCapacity = items.reduce((sum, item) => sum + Number(item.daily_limit ?? 0), 0);
    const soldToday = items.reduce((sum, item) => sum + Number(item.daily_sold ?? 0), 0);
    const remainingCapacity = items.reduce((sum, item) => sum + Number(getRemaining(item) ?? 0), 0);
    const avgPrep = activeItems.length
      ? Math.round(activeItems.reduce((sum, item) => sum + Number(item.prep_time_minutes ?? 0), 0) / activeItems.length)
      : 0;
    const revenueCapacity = items.reduce((sum, item) => sum + (Number(getRemaining(item) ?? 0) * Number(item.price)), 0);

    return {
      activeItems: activeItems.length,
      totalCapacity,
      soldToday,
      remainingCapacity,
      avgPrep,
      revenueCapacity,
      setupIssues: items.filter((item) => getSetupIssues(item).length > 0).length,
    };
  }, [items]);

  const updateItem = (updatedItem: MenuItem | null | undefined) => {
    if (!updatedItem?.id) {
      setError('Menu item update did not return a valid item. Refresh and try again.');
      return;
    }

    const updatedItemId = updatedItem.id;
    setCategories((current) => current.map((cat) => ({
      ...cat,
      items: cat.items.map((item) => item.id === updatedItemId ? updatedItem : item),
    })));
  };

  const patchItem = async (itemId: string, payload: Partial<MenuItem>) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/menu/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to update item');
      }

      const json = await response.json();
      const updatedItem = json.menuItem ?? json.data?.menuItem ?? null;
      updateItem(updatedItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const duplicateItem = async (item: MenuItem) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${item.name} Copy`,
          description: item.description,
          price: item.price,
          category_id: item.category_id,
          image_url: item.image_url,
          is_available: false,
          is_featured: false,
          is_sold_out: false,
          daily_limit: item.daily_limit,
          daily_sold: 0,
          restock_at: null,
          dietary_tags: item.dietary_tags ?? [],
          prep_time_minutes: item.prep_time_minutes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to duplicate item');
      }

      const json = await response.json();
      const menuItem = json.menuItem ?? json.data?.menuItem ?? null;
      if (!menuItem?.category_id) {
        throw new Error('Menu item duplicate did not return a valid item');
      }
      setCategories((current) => current.map((cat) =>
        cat.id === menuItem.category_id ? { ...cat, items: [...cat.items, menuItem] } : cat
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    if (!confirm('Delete this menu item? This removes it from the chef and customer menu.')) return;

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

      setCategories((current) => current.map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => item.id !== itemId),
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
        <div className="rounded-lg border border-danger/30 bg-dangerSoft p-4">
          <p className="text-sm font-medium text-danger">{error}</p>
        </div>
      )}

      <section className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-text">Today&apos;s menu readiness</p>
              <p className="mt-1 max-w-2xl text-sm text-textMuted">
                This is the live operating view for {storefrontName}: what can sell, what is constrained, and what needs chef or admin attention.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="min-h-10" onClick={() => setShowCategoryModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Category
              </Button>
              <Button className="min-h-10" onClick={() => setShowItemModal(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Menu item
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { icon: Utensils, label: 'Active items', value: operations.activeItems, helper: 'Ready to order' },
              { icon: Gauge, label: 'Capacity left', value: operations.remainingCapacity, helper: `${operations.soldToday}/${operations.totalCapacity || 0} sold` },
              { icon: Clock, label: 'Avg prep', value: `${operations.avgPrep}m`, helper: 'Active item average' },
              { icon: BarChart3, label: 'Revenue room', value: formatCurrency(operations.revenueCapacity), helper: 'Remaining sellable capacity' },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="rounded-lg border border-border bg-surfaceMuted p-4">
                  <div className="flex items-center gap-2 text-textMuted">
                    <Icon className="h-4 w-4" />
                    <p className="text-xs font-semibold uppercase tracking-wide">{metric.label}</p>
                  </div>
                  <p className="mt-2 text-2xl font-bold text-text">{metric.value}</p>
                  <p className="mt-1 text-xs text-textMuted">{metric.helper}</p>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-white p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            <p className="font-semibold text-text">Ops watchlist</p>
          </div>
          <div className="mt-4 space-y-3">
            {[
              { label: 'Setup gaps', value: operations.setupIssues, helper: 'Items missing operational data' },
              { label: 'Low capacity', value: items.filter(isLowCapacity).length, helper: 'Items near daily cap' },
              { label: 'Hidden from customers', value: items.filter((item) => !item.is_available).length, helper: 'Unavailable menu records' },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-3 rounded-lg border border-divider px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-text">{row.label}</p>
                  <p className="text-xs text-textMuted">{row.helper}</p>
                </div>
                <span className="text-lg font-bold text-text">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-white shadow-sm">
        <div className="border-b border-border p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="relative min-w-0 xl:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSubtle" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search items, categories, tags"
                className="h-10 w-full rounded-lg border border-borderStrong pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setFilter(entry.id)}
                  className={`h-9 rounded-lg border px-3 text-sm font-medium transition ${
                    filter === entry.id
                      ? 'border-primary bg-primary text-white'
                      : 'border-border bg-white text-text hover:border-borderStrong'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="divide-y divide-divider">
          {filteredCategories.length === 0 ? (
            <div className="p-10 text-center">
              <ChefHat className="mx-auto h-10 w-10 text-textSubtle" />
              <p className="mt-3 font-medium text-text">No matching menu items</p>
              <p className="mt-1 text-sm text-textMuted">Clear the search or change the filter to see more of the menu.</p>
            </div>
          ) : (
            filteredCategories.map((category) => {
              const sellable = category.items.filter((item) => item.is_available && !item.is_sold_out).length;
              const categoryCapacity = category.items.reduce((sum, item) => sum + Number(getRemaining(item) ?? 0), 0);

              return (
                <div key={category.id} className="p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-text">{category.name}</h2>
                        <Badge variant="default" className="text-xs">{sellable}/{category.items.length} sellable</Badge>
                        <Badge variant="default" className="text-xs">{categoryCapacity} capacity left</Badge>
                      </div>
                      {category.description ? (
                        <p className="mt-1 text-sm text-textMuted">{category.description}</p>
                      ) : null}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-10"
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setShowItemModal(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add item
                    </Button>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-lg border border-border">
                    <div className="hidden grid-cols-[minmax(280px,1.5fr)_120px_150px_140px_180px] bg-surfaceMuted px-4 py-2 text-xs font-semibold uppercase tracking-wide text-textMuted lg:grid">
                      <span>Item</span>
                      <span>Price</span>
                      <span>Production</span>
                      <span>Status</span>
                      <span className="text-right">Actions</span>
                    </div>
                    <div className="divide-y divide-divider">
                      {category.items.map((item) => {
                        const health = getItemHealth(item);
                        const remaining = getRemaining(item);
                        const setupIssues = getSetupIssues(item);

                        return (
                          <div
                            key={item.id}
                            className="grid gap-4 px-4 py-4 lg:grid-cols-[minmax(280px,1.5fr)_120px_150px_140px_180px] lg:items-center"
                          >
                            <div className="flex min-w-0 gap-3">
                              <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surfaceMuted">
                                {item.image_url ? (
                                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center text-textSubtle">
                                    <Camera className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-text">{item.name}</p>
                                  {item.is_featured ? <Badge variant="default" className="text-xs">Featured</Badge> : null}
                                </div>
                                <p className="mt-1 line-clamp-2 text-sm text-textMuted">
                                  {item.description || 'No customer-facing description yet.'}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {(item.dietary_tags ?? []).slice(0, 4).map((tag) => (
                                    <span key={tag} className="rounded-md bg-surfaceMuted px-2 py-1 text-xs font-medium text-textMuted">
                                      {tag}
                                    </span>
                                  ))}
                                  {setupIssues.length > 0 ? (
                                    <span className="rounded-md bg-primarySoft px-2 py-1 text-xs font-medium text-primary">
                                      Missing {setupIssues[0]}
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            <div>
                              <p className="text-sm font-semibold text-text">{formatCurrency(item.price)}</p>
                              <p className="text-xs text-textMuted">Customer price</p>
                            </div>

                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-text">
                                {item.prep_time_minutes ? `${item.prep_time_minutes} min prep` : 'Prep time missing'}
                              </p>
                              <p className="text-xs text-textMuted">
                                {item.daily_limit != null
                                  ? `${item.daily_sold ?? 0}/${item.daily_limit} sold today${remaining != null ? `, ${remaining} left` : ''}`
                                  : 'No daily capacity set'}
                              </p>
                            </div>

                            <div>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${health.tone}`}>
                                {health.label}
                              </span>
                              <p className="mt-1 text-xs text-textMuted">{health.detail}</p>
                            </div>

                            <div className="flex flex-wrap justify-start gap-2 lg:justify-end">
                              <button
                                type="button"
                                onClick={() => patchItem(item.id, { is_available: !item.is_available })}
                                disabled={loading}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text hover:bg-surfaceMuted disabled:opacity-50"
                                title={item.is_available ? 'Hide item' : 'Show item'}
                              >
                                {item.is_available ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => patchItem(item.id, { is_sold_out: !(item.is_sold_out ?? false), restock_at: null })}
                                disabled={loading}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text hover:bg-surfaceMuted disabled:opacity-50"
                                title={item.is_sold_out ? 'Restock item' : 'Mark sold out'}
                              >
                                {item.is_sold_out ? <PackageCheck className="h-4 w-4" /> : <PackageX className="h-4 w-4" />}
                              </button>
                              <button
                                type="button"
                                onClick={() => duplicateItem(item)}
                                disabled={loading}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text hover:bg-surfaceMuted disabled:opacity-50"
                                title="Duplicate item"
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItem(item);
                                  setShowItemModal(true);
                                }}
                                disabled={loading}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-text hover:bg-surfaceMuted disabled:opacity-50"
                                title="Edit item"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteItem(item.id)}
                                disabled={loading}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-danger/30 text-danger hover:bg-dangerSoft disabled:opacity-50"
                                title="Delete item"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

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
              updateItem(item);
            } else {
              setCategories(categories.map((cat) =>
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
