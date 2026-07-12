'use client';

// ==========================================
// KITCHEN SCOPE PROVIDER
//
// Holds the ghost-kitchen (commissary) scope for chef-admin: the operator's
// kitchen and the brand storefronts it runs, plus the ACTIVE brand. Shared-ops
// surfaces (inventory, suppliers, production, labour, P&L) act on the whole
// kitchen; brand surfaces (menu, recipes, orders, storefront) act on the active
// brand. Switching brand writes the `x-brand-id` cookie, which the server reads
// via getOperatorKitchenContext, then refreshes so server components re-fetch.
//
// Degrades cleanly: an independent single-storefront chef gets a scope with one
// brand (no switcher shown); a non-operator gets null (nothing changes).
// ==========================================

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';

export const BRAND_COOKIE = 'x-brand-id';

export interface KitchenBrand {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface KitchenScope {
  kitchenId: string;
  kitchenName: string;
  /** The active brand storefront id, or null for kitchen-wide. */
  activeBrandId: string | null;
  brands: KitchenBrand[];
}

interface KitchenScopeValue extends KitchenScope {
  /** Set the active brand (empty string clears it → kitchen-wide). */
  setActiveBrand: (brandId: string) => void;
}

const KitchenScopeContext = createContext<KitchenScopeValue | null>(null);

export function KitchenScopeProvider({
  scope,
  children,
}: {
  scope: KitchenScope | null;
  children: ReactNode;
}) {
  const router = useRouter();

  const setActiveBrand = useCallback(
    (brandId: string) => {
      if (brandId) {
        document.cookie = `${BRAND_COOKIE}=${encodeURIComponent(brandId)}; path=/; max-age=31536000; samesite=lax`;
      } else {
        document.cookie = `${BRAND_COOKIE}=; path=/; max-age=0; samesite=lax`;
      }
      router.refresh();
    },
    [router],
  );

  const value = useMemo<KitchenScopeValue | null>(
    () => (scope ? { ...scope, setActiveBrand } : null),
    [scope, setActiveBrand],
  );

  return (
    <KitchenScopeContext.Provider value={value}>
      {children}
    </KitchenScopeContext.Provider>
  );
}

export function useKitchenScope(): KitchenScopeValue | null {
  return useContext(KitchenScopeContext);
}

export function useActiveBrand(): KitchenBrand | null {
  const scope = useKitchenScope();
  if (!scope || !scope.activeBrandId) return null;
  return scope.brands.find((b) => b.id === scope.activeBrandId) ?? null;
}
