import { formatCurrency } from '@ridendine/utils';

export const CART_FEE_DISCLOSURE =
  'Delivery, service fees, HST, promos, and payment are confirmed at checkout.';

export interface CartSummaryItem {
  id: string;
  name?: string;
  price: number;
  quantity: number;
}

/** Canonical money rounding for apps/web — round to 2 decimal places. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Cart prices are dollars — delegate to the shared currency formatter. */
export function formatCartCurrency(value: number): string {
  return formatCurrency(Number(value));
}

export function calculateCartLineTotal(item: Pick<CartSummaryItem, 'price' | 'quantity'>): number {
  return roundMoney((Number(item.price) || 0) * (Number(item.quantity) || 0));
}

export function calculateCartSubtotal(items: CartSummaryItem[]): number {
  return roundMoney(items.reduce((sum, item) => sum + calculateCartLineTotal(item), 0));
}

export function calculateCartItemCount(items: CartSummaryItem[]): number {
  return items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
}

export function checkoutHrefForStorefront(storefrontId?: string | null): string {
  return storefrontId ? `/checkout?storefrontId=${encodeURIComponent(storefrontId)}` : '/chefs';
}

/**
 * True when two dollar amounts differ by more than one cent.
 *
 * Used by checkout to compare the server-confirmed breakdown against the
 * totals the customer saw on the details step; comparison is done in integer
 * cents so floating-point noise can't trigger (or mask) a mismatch.
 */
export function totalsDifferBeyondTolerance(expectedDollars: number, serverDollars: number): boolean {
  const diffCents = Math.abs(Math.round(serverDollars * 100) - Math.round(expectedDollars * 100));
  return diffCents > 1;
}
