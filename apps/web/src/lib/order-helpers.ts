// Re-export from engine package for centralized business logic
// All values are in cents to avoid floating point issues

import {
  BASE_DELIVERY_FEE,
  SERVICE_FEE_PERCENT,
  HST_RATE,
} from '@ridendine/engine';

export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RD-${timestamp}-${random}`;
}

export function calculateOrderTotals(subtotal: number, tip: number = 0) {
  // All values in cents
  const deliveryFee = BASE_DELIVERY_FEE;
  const serviceFee = Math.round(subtotal * (SERVICE_FEE_PERCENT / 100));
  const taxableAmount = subtotal + serviceFee;
  const tax = Math.round(taxableAmount * (HST_RATE / 100));
  const total = subtotal + deliveryFee + serviceFee + tax + tip;

  return {
    deliveryFee,
    serviceFee,
    tax,
    total,
  };
}

export function calculateCartSubtotal(cartItems: any[]): number {
  return cartItems.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0
  );
}
