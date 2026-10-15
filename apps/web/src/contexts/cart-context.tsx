'use client';

import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import { calculateCartSubtotal } from '@/lib/cart-summary';

interface CartItem {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  special_instructions?: string;
  image_url?: string;
}

interface Cart {
  id: string;
  storefront_id: string;
  storefront_name?: string;
  items: CartItem[];
  subtotal: number;
}

interface CartApiItem {
  id: string;
  menu_item_id: string;
  unit_price: number;
  quantity: number;
  special_instructions?: string;
  menu_items?: {
    name?: string | null;
    image_url?: string | null;
  } | null;
}

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  storefrontId: string | null;
  itemCount: number;
  addToCart: (storefrontId: string, menuItemId: string, quantity: number, specialInstructions?: string) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => void;
  setStorefrontId: (id: string) => void;
  fetchCart: (storefrontId: string) => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

/**
 * localStorage key for the active cart's storefront id. The cart itself is
 * server-backed (fetchCart pulls it from /api/cart); only this pointer is
 * persisted so a page refresh can restore the cart context.
 */
export const CART_STOREFRONT_STORAGE_KEY = 'ridendine.cart.storefrontId';

/** Best-effort persistence — localStorage may be unavailable (SSR, private mode). */
function persistStorefrontId(id: string | null) {
  if (typeof window === 'undefined') return;
  try {
    if (id) {
      window.localStorage.setItem(CART_STOREFRONT_STORAGE_KEY, id);
    } else {
      window.localStorage.removeItem(CART_STOREFRONT_STORAGE_KEY);
    }
  } catch {
    // Ignore quota/security errors — persistence is an enhancement only.
  }
}

function readPersistedStorefrontId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(CART_STOREFRONT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [storefrontId, setStorefrontIdState] = useState<string | null>(null);

  const setStorefrontId = useCallback((id: string) => {
    setStorefrontIdState(id);
    persistStorefrontId(id);
  }, []);

  const itemCount = cart?.items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) ?? 0;

  const fetchCart = useCallback(async (sfId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cart?storefrontId=${sfId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const cartData = result.data;
        const items: CartItem[] = (cartData.cart_items || []).map((item: CartApiItem) => ({
          id: item.id,
          menu_item_id: item.menu_item_id,
          name: item.menu_items?.name || 'Unknown Item',
          price: Number(item.unit_price) || 0,
          quantity: Number(item.quantity) || 0,
          special_instructions: item.special_instructions,
          image_url: item.menu_items?.image_url,
        }));

        // Per-line rounding keeps the displayed subtotal aligned with the
        // server quote's rounding protocol (see lib/cart-summary).
        const subtotal = calculateCartSubtotal(items);

        setCart({
          id: cartData.id,
          storefront_id: cartData.storefront_id,
          items,
          subtotal,
        });
      } else {
        setCart(null);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
      setCart(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const addToCart = useCallback(async (
    sfId: string,
    menuItemId: string,
    quantity: number,
    specialInstructions?: string
  ) => {
    setLoading(true);
    try {
      const response = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          storefrontId: sfId,
          menuItemId,
          quantity,
          specialInstructions,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStorefrontId(sfId);
        await fetchCart(sfId);
        return;
      }

      // Previously this branch was silent — users saw the "add to cart" button
      // click do nothing with no feedback. Now we surface the failure: a 401
      // (no session) bounces to login with a redirect back; anything else
      // throws so callers (storefront menu, etc.) can show the message.
      if (response.status === 401) {
        const redirect = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `/auth/login?redirect=${redirect}`;
        return;
      }
      const message =
        typeof result?.error === 'string'
          ? result.error
          : `Add to cart failed (HTTP ${response.status})`;
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  }, [fetchCart, setStorefrontId]);

  const removeItem = useCallback(async (itemId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cart?itemId=${itemId}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (result.success && storefrontId) {
        await fetchCart(storefrontId);
      }
    } catch (error) {
      console.error('Error removing item:', error);
    } finally {
      setLoading(false);
    }
  }, [storefrontId, fetchCart]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      return removeItem(itemId);
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/cart?itemId=${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      });

      const result = await response.json();

      if (result.success && storefrontId) {
        await fetchCart(storefrontId);
      }
    } catch (error) {
      console.error('Error updating cart:', error);
    } finally {
      setLoading(false);
    }
  }, [storefrontId, fetchCart, removeItem]);

  const clearCart = useCallback(() => {
    setCart(null);
    setStorefrontIdState(null);
    persistStorefrontId(null);
  }, []);

  // On mount, restore the persisted storefront pointer (if any) so a page
  // refresh re-hydrates the server-backed cart. The fetch itself happens in
  // the effect below once storefrontId is set and no cart is loaded.
  useEffect(() => {
    const stored = readPersistedStorefrontId();
    if (stored) {
      // Functional update: never clobber a storefront already set by a page
      // (e.g. addToCart) before this effect ran.
      setStorefrontIdState((current) => current ?? stored);
    }
  }, []);

  useEffect(() => {
    if (storefrontId && !cart) {
      fetchCart(storefrontId);
    }
  }, [storefrontId, cart, fetchCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        storefrontId,
        itemCount,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        setStorefrontId,
        fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
