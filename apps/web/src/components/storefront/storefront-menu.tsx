'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/contexts/cart-context';
import {
  filterStorefrontMenuItems,
  formatMenuPrice,
  getCartQuantityForMenuItem,
  getDietaryTagOptions,
  getMinimumOrderProgress,
  groupMenuItemsByCategory,
  type MinimumOrderProgress,
} from '@/lib/storefront-menu';
import { Badge, Button, Card, useToast } from '@ridendine/ui';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  is_featured?: boolean;
  dietary_tags: string[] | null;
  prep_time_minutes?: number | null;
  category_id: string;
  menu_categories?: {
    id: string;
    name: string;
    sort_order: number;
  } | null;
}

interface StorefrontMenuProps {
  storefrontId: string;
  storefrontName?: string;
  minOrderAmount?: number;
  menuItems: MenuItem[];
}

interface CartItem {
  id: string;
  menu_item_id?: string;
  name?: string;
  price: number;
  quantity: number;
}

function toggleTag(tags: string[], tag: string): string[] {
  return tags.includes(tag) ? tags.filter((current) => current !== tag) : [...tags, tag];
}

function minimumOrderText(progress: MinimumOrderProgress): string {
  if (!progress.isRequired) return 'No minimum order';
  if (progress.isMet) return 'Minimum reached';
  return `${formatMenuPrice(progress.remaining)} away from checkout`;
}

function ImagePlaceholder({ className = '' }: { className?: string }) {
  return (
    <div className={`flex h-full w-full items-center justify-center bg-primarySoft ${className}`}>
      <svg className="h-8 w-8 text-primary/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    </div>
  );
}

function MenuItemCard({
  item,
  cartQuantity,
  addingItemId,
  loading,
  onAdd,
  compact = false,
}: {
  item: MenuItem;
  cartQuantity: number;
  addingItemId: string | null;
  loading: boolean;
  onAdd: (item: MenuItem) => void;
  compact?: boolean;
}) {
  const isAdding = addingItemId === item.id;
  const imageFrameSize = compact ? 'h-24 w-24 sm:h-28 sm:w-28' : 'h-28 w-28 sm:h-32 sm:w-32';
  const cardGridColumns = compact
    ? 'grid-cols-[minmax(0,1fr)_6rem] sm:grid-cols-[minmax(0,1fr)_7rem]'
    : 'grid-cols-[minmax(0,1fr)_7rem] sm:grid-cols-[minmax(0,1fr)_8rem]';

  return (
    <Card
      padding="sm"
      className={`group grid ${cardGridColumns} gap-3 overflow-hidden transition-shadow hover:shadow-md ${
        !item.is_available ? 'opacity-60' : ''
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start gap-2">
          <h3 className="font-semibold leading-tight text-text">{item.name}</h3>
          {item.is_featured && (
            <span className="rounded-sm bg-primary px-2 py-0.5 text-xs font-bold text-primaryFg">
              Featured
            </span>
          )}
          {cartQuantity > 0 && (
            <span className="shrink-0 rounded-sm bg-accentSoft px-2 py-0.5 text-xs font-semibold text-accent">
              {cartQuantity} in cart
            </span>
          )}
        </div>

        {item.description && (
          <p className="mt-1 text-sm leading-relaxed text-textMuted line-clamp-2">
            {item.description}
          </p>
        )}

        {item.dietary_tags && item.dietary_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {item.dietary_tags.map((tag) => (
              <Badge key={tag} tone="success" size="sm">
                {tag}
              </Badge>
            ))}
          </div>
        )}

        {item.prep_time_minutes && (
          <div className="mt-1 flex items-center gap-1 text-xs text-textSubtle">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{item.prep_time_minutes} min prep</span>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-lg font-bold text-text">
            {formatMenuPrice(item.price)}
          </span>
          {item.is_available ? (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onAdd(item)}
              disabled={loading}
              loading={isAdding}
              leftIcon={
                isAdding ? null : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                )
              }
            >
              {isAdding ? 'Adding...' : 'Add'}
            </Button>
          ) : (
            <span className="rounded-md bg-surfaceMuted px-3 py-1.5 text-sm text-textMuted">
              Unavailable
            </span>
          )}
        </div>
      </div>

      <div className={`${imageFrameSize} aspect-square justify-self-end overflow-hidden rounded-lg bg-primarySoft`}>
        {item.image_url ? (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>
    </Card>
  );
}

function MinimumOrderMeter({
  progress,
  minOrderAmount,
}: {
  progress: MinimumOrderProgress;
  minOrderAmount: number;
}) {
  if (!progress.isRequired) return null;

  return (
    <div className="mt-4 rounded-md border border-border bg-surfaceMuted p-3">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-text">{minimumOrderText(progress)}</span>
        <span className="text-textSubtle">Min {formatMenuPrice(minOrderAmount)}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
        <div
          className="h-full rounded-full bg-primary"
          style={{ width: `${progress.percent}%` }}
          aria-hidden="true"
        />
      </div>
    </div>
  );
}

export function StorefrontMenu({
  storefrontId,
  storefrontName = 'this chef',
  minOrderAmount = 0,
  menuItems,
}: StorefrontMenuProps) {
  const { addToCart, loading, cart, itemCount } = useCart();
  const { showToast } = useToast();
  const [addingItemId, setAddingItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);

  const cartItems = cart?.items ?? [];
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const minimumProgress = getMinimumOrderProgress(subtotal, minOrderAmount);

  const allCategories = useMemo(() => groupMenuItemsByCategory(menuItems), [menuItems]);
  const dietaryTags = useMemo(() => getDietaryTagOptions(menuItems), [menuItems]);
  const visibleMenuItems = useMemo(
    () => filterStorefrontMenuItems(menuItems, { search: searchQuery, dietaryTags: selectedDietaryTags }),
    [menuItems, searchQuery, selectedDietaryTags],
  );
  const visibleCategories = useMemo(() => groupMenuItemsByCategory(visibleMenuItems), [visibleMenuItems]);
  const featuredItems = visibleMenuItems.filter((item) => item.is_featured).slice(0, 4);
  const hasActiveFilters = searchQuery.trim().length > 0 || selectedDietaryTags.length > 0;
  const minimumOrderLabel = minOrderAmount > 0 ? `Min. ${formatMenuPrice(minOrderAmount)}` : 'No minimum';
  const cartCountLabel = `${itemCount} in cart`;

  const handleAddToCart = async (item: MenuItem) => {
    setAddingItemId(item.id);

    try {
      await addToCart(storefrontId, item.id, 1);
      showToast({ message: `${item.name} added to cart!`, variant: 'success' });
    } catch (error) {
      console.error('Failed to add to cart:', error);
      showToast({ message: 'Failed to add item to cart', variant: 'error' });
    } finally {
      setAddingItemId(null);
    }
  };

  if (menuItems.length === 0) {
    return (
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-20 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-surfaceMuted">
              <svg className="h-8 w-8 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-text">Menu coming soon</h3>
            <p className="mt-2 text-textMuted">This chef is still setting up their menu. Check back soon!</p>
          </div>
        </div>
        <div className="lg:col-span-1">
          <CartSidebar
            cartItems={[]}
            itemCount={0}
            subtotal={0}
            storefrontId={storefrontId}
            storefrontName={storefrontName}
            minOrderAmount={minOrderAmount}
            minimumProgress={getMinimumOrderProgress(0, minOrderAmount)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="space-y-8 lg:col-span-2">
        <Card padding="md" className="border border-border bg-surface shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase text-primary">Order menu</p>
              <h2 id="storefront-order-heading" className="mt-1 text-xl font-bold text-text">
                Start your order
              </h2>
              <p className="mt-1 text-sm text-textMuted">
                Fresh dishes from {storefrontName}
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[24rem]">
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-xs font-medium text-textSubtle">Menu</p>
                <p className="text-sm font-bold text-text">{menuItems.length} dishes</p>
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-xs font-medium text-textSubtle">Minimum</p>
                <p className="text-sm font-bold text-text">{minimumOrderLabel}</p>
              </div>
              <div className="rounded-md border border-border bg-background px-3 py-2">
                <p className="text-xs font-medium text-textSubtle">Cart</p>
                <p className="text-sm font-bold text-text">{cartCountLabel}</p>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <label className="sr-only" htmlFor="storefront-menu-search">
                Search this menu
              </label>
              <div className="relative">
                <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35m1.35-5.15a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
                </svg>
                <input
                  id="storefront-menu-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search this menu"
                  className="h-11 w-full rounded-md border border-border bg-background pl-10 pr-3 text-sm text-text placeholder:text-textSubtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
            </div>

            <div className="rounded-md bg-primarySoft px-3 py-2 text-sm font-medium text-primary">
              {visibleMenuItems.length} showing
            </div>
          </div>

          {allCategories.length > 0 && (
            <nav aria-label="Menu categories" className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {allCategories.map((category) => (
                <a
                  key={category.id}
                  href={`#menu-category-${category.id}`}
                  className="shrink-0 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-text transition-colors hover:border-primary hover:text-primary"
                >
                  {category.name}
                  <span className="ml-1 text-textSubtle">{category.items.length}</span>
                </a>
              ))}
            </nav>
          )}

          {dietaryTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {dietaryTags.map((tag) => {
                const isSelected = selectedDietaryTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedDietaryTags((current) => toggleTag(current, tag))}
                    className={`rounded-md border px-3 py-1.5 text-sm font-medium transition-colors ${
                      isSelected
                        ? 'border-accent bg-accent text-white'
                        : 'border-border bg-background text-textMuted hover:border-accent hover:text-accent'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedDietaryTags([]);
                  }}
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-primary hover:bg-primarySoft"
                >
                  Clear
                </button>
              )}
            </div>
          )}
        </Card>

        {featuredItems.length > 0 && (
          <section aria-labelledby="featured-dishes-heading">
            <div className="mb-4 flex items-center gap-3">
              <h2 id="featured-dishes-heading" className="text-xl font-bold text-text">
                Featured dishes
              </h2>
              <div className="h-px flex-1 bg-divider" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredItems.map((item) => (
                <MenuItemCard
                  key={`featured-${item.id}`}
                  item={item}
                  cartQuantity={getCartQuantityForMenuItem(cartItems, item.id)}
                  addingItemId={addingItemId}
                  loading={loading}
                  onAdd={handleAddToCart}
                  compact
                />
              ))}
            </div>
          </section>
        )}

        {visibleMenuItems.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-surface p-8 text-center">
            <h2 className="text-lg font-semibold text-text">No dishes match that search</h2>
            <p className="mt-2 text-sm text-textMuted">
              Clear your filters or try a different dish, category, or dietary tag.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {visibleCategories.map((category) => (
              <section key={category.id} id={`menu-category-${category.id}`} className="scroll-mt-24">
                <div className="mb-5 flex items-center gap-3">
                  <h2 className="text-xl font-bold text-text">{category.name}</h2>
                  <div className="h-px flex-1 bg-divider" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {category.items.map((item) => (
                    <MenuItemCard
                      key={item.id}
                      item={item}
                      cartQuantity={getCartQuantityForMenuItem(cartItems, item.id)}
                      addingItemId={addingItemId}
                      loading={loading}
                      onAdd={handleAddToCart}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-1">
        <CartSidebar
          cartItems={cartItems}
          itemCount={itemCount}
          subtotal={subtotal}
          storefrontId={storefrontId}
          storefrontName={storefrontName}
          minOrderAmount={minOrderAmount}
          minimumProgress={minimumProgress}
        />
      </div>

      {itemCount > 0 && (
        <div
          data-testid="sticky-mobile-view-cart-bar"
          className="fixed bottom-0 left-0 right-0 z-sticky border-t border-border bg-surface p-4 pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] shadow-lg lg:hidden"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-textMuted">Subtotal</p>
              <p className="font-semibold text-text">{formatMenuPrice(subtotal)}</p>
              {minimumProgress.isRequired && (
                <p className="truncate text-xs text-textSubtle">{minimumOrderText(minimumProgress)}</p>
              )}
            </div>
            <Link href={`/cart?storefrontId=${storefrontId}`} className="flex-1">
              <Button variant="primary" fullWidth>
                View Cart ({itemCount})
              </Button>
            </Link>
          </div>
        </div>
      )}
      {itemCount > 0 && <div className="h-24 lg:hidden" />}
    </div>
  );
}

function CartSidebar({
  cartItems,
  itemCount,
  subtotal,
  storefrontId,
  storefrontName,
  minOrderAmount,
  minimumProgress,
}: {
  cartItems: CartItem[];
  itemCount: number;
  subtotal: number;
  storefrontId: string;
  storefrontName: string;
  minOrderAmount: number;
  minimumProgress: MinimumOrderProgress;
}) {
  return (
    <div className="sticky top-24">
      <Card padding="lg">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-text">Your Order</h3>
            <p className="text-xs text-textSubtle">From {storefrontName}</p>
          </div>
          {itemCount > 0 && (
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primaryFg">
              {itemCount}
            </span>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surfaceMuted">
              <svg className="h-7 w-7 text-textSubtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 014 0z" />
              </svg>
            </div>
            <p className="text-sm font-medium text-text">Your cart is empty</p>
            <p className="mt-1 text-xs text-textSubtle">Add items from the menu to get started</p>
          </div>
        ) : (
          <>
            <div className="divide-y divide-divider">
              {cartItems.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-start justify-between gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-tight text-text">
                      {item.quantity}x {item.name || 'Item'}
                    </p>
                  </div>
                  <span className="flex-shrink-0 text-sm text-textMuted">
                    {formatMenuPrice(item.price * item.quantity)}
                  </span>
                </div>
              ))}
              {cartItems.length > 6 && (
                <p className="py-2 text-center text-xs text-textSubtle">
                  +{cartItems.length - 6} more items
                </p>
              )}
            </div>

            <div className="mt-4 border-t border-divider pt-4">
              <div className="flex justify-between text-base font-bold">
                <span className="text-text">Subtotal</span>
                <span className="text-primary">{formatMenuPrice(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-textSubtle">
                Delivery fee and taxes calculated at checkout
              </p>
              <MinimumOrderMeter progress={minimumProgress} minOrderAmount={minOrderAmount} />
            </div>

            <Link href={`/cart?storefrontId=${storefrontId}`} className="mt-4 block">
              <Button variant="secondary" fullWidth>
                View Cart ({itemCount})
              </Button>
            </Link>

            {minimumProgress.isMet ? (
              <Link href={`/checkout?storefrontId=${storefrontId}`} className="mt-2 block">
                <Button variant="primary" fullWidth>
                  Checkout
                </Button>
              </Link>
            ) : (
              <div className="mt-2">
                <Button variant="primary" fullWidth disabled>
                  Checkout
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}
