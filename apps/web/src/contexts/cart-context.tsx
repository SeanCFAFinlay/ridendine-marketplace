'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

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

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(false);
  const [storefrontId, setStorefrontId] = useState<string | null>(null);

  const itemCount = cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;

  const fetchCart = useCallback(async (sfId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/cart?storefrontId=${sfId}`);
      const result = await response.json();

      if (result.success && result.data) {
        const cartData = result.data;
        const items: CartItem[] = (cartData.cart_items || []).map((item: any) => ({
          id: item.id,
          menu_item_id: item.menu_item_id,
          name: item.menu_items?.name || 'Unknown Item',
          price: item.unit_price,
          quantity: item.quantity,
          special_instructions: item.special_instructions,
          image_url: item.menu_items?.image_url,
        }));

        const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchCart]);

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
  }, [storefrontId, fetchCart]);

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

  const clearCart = useCallback(() => {
    setCart(null);
    setStorefrontId(null);
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
