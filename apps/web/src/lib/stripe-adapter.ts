// ==========================================
// Re-export shim. The Stripe PaymentAdapter now lives in @ridendine/engine
// (services/stripe-payment-adapter.ts) and is registered by default for ALL
// apps, not just this one. Kept so existing imports keep resolving.
// ==========================================

export { stripePaymentAdapter } from '@ridendine/engine';
