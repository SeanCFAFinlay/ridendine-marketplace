const DELIVERY_FEE = 3.99;
const SERVICE_FEE_RATE = 0.075;
const TAX_RATE = 0.13;

export function generateOrderNumber(): string {
  const randomNum = Math.floor(100000 + Math.random() * 900000);
  return `RD-${randomNum}`;
}

export function calculateOrderTotals(subtotal: number, tip: number = 0) {
  const deliveryFee = DELIVERY_FEE;
  const serviceFee = parseFloat((subtotal * SERVICE_FEE_RATE).toFixed(2));
  const taxableAmount = subtotal + deliveryFee + serviceFee;
  const tax = parseFloat((taxableAmount * TAX_RATE).toFixed(2));
  const total = parseFloat((taxableAmount + tax + tip).toFixed(2));

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
