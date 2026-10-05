// ==========================================
// RIDENDINE ENGINE - CENTRAL BUSINESS LOGIC
// ==========================================

// Core engine factory and utilities
export * from './core';

// Business rules engine (validation layer)
export * from './core/business-rules-engine';

// SLA checks (standalone functions)
export * from './core/sla-checks';

// Canonical engines (single authority for lifecycle transitions)
export * from './orchestrators/master-order-engine';
export * from './orchestrators/delivery-engine';
export * from './orchestrators/order-state-machine';
export * from './orchestrators/kitchen-ticket-state';
export * from './orchestrators/inventory.engine';
export * from './orchestrators/purchasing.engine';
export * from './orchestrators/production.engine';
export * from './orchestrators/labor.engine';
export * from './orchestrators/payout-engine';

// Phase 3 extractions
export { OrderCreationService, createOrderCreationService, type CreateOrderInput } from './orchestrators/order-creation.service';
export type { PaymentAdapter } from './types/payment-adapter';
export { stripePaymentAdapter } from './services/stripe-payment-adapter';

// Phase 2 dispatch split (Stage 2)
export {
  DriverMatchingService,
  createDriverMatchingService,
  calculateDriverAssignmentScore,
  computeDriverScores,
  getRawDriverSupplyData,
  type EligibleDriver,
  type RankedCandidate,
  type CoverageGap,
} from './orchestrators/driver-matching.service';
export {
  OfferManagementService,
  createOfferManagementService,
} from './orchestrators/offer-management.service';
export {
  DispatchOrchestrator,
  createDispatchOrchestrator,
} from './orchestrators/dispatch-orchestrator';

// Domain orchestrators (facades)
export * from './orchestrators/kitchen.engine';
export * from './orchestrators/kitchen-availability';
export * from './orchestrators/commerce.engine';
export * from './orchestrators/support.engine';
export * from './orchestrators/platform.engine';
export * from './orchestrators/ops.engine';
export * from './orchestrators/operations-command.gateway';

// Risk (IRR-022) — deterministic pre-payment / pre-mutation checks; wire at API in Phase 6+
export * from './orchestrators/risk.engine';

// Analytics services
export * from './services/ops-analytics.service';

// Loyalty Program
export {
  LoyaltyService,
  createLoyaltyService,
  computeTier,
  computeMultiplier,
  computePointsEarned,
  TIER_THRESHOLDS,
  type LoyaltyTier,
  type LoyaltyAccount,
  type LoyaltyBalance,
  type EarnResult,
  type RedeemResult,
} from './services/loyalty.service';

// Geocoding and delivery zone validation
export {
  geocodeAddress,
  isWithinDeliveryZone,
  buildAddressString,
  type Coordinates,
} from './services/geocoding.service';

// Distance-based delivery fee calculation
export {
  calculateDeliveryFee,
  estimateDistance,
  DELIVERY_BASE_FEE_CENTS,
  DELIVERY_PER_KM_CENTS,
  DELIVERY_MAX_FEE_CENTS,
  SMALL_ORDER_THRESHOLD_CENTS,
  SMALL_ORDER_SURCHARGE_CENTS,
  type DeliveryFeeResult,
  type DeliveryFeeBreakdown,
} from './services/delivery-fee.service';

// Surge / demand-based pricing
export {
  getSurgeMultiplier,
  calculateSurgeMultiplier,
  SURGE_CAP,
  SURGE_TIER_NORMAL,
  SURGE_TIER_BUSY,
  SURGE_TIER_VERY_BUSY,
  SURGE_TIER_PEAK,
  RATIO_BUSY,
  RATIO_VERY_BUSY,
  RATIO_PEAK,
} from './services/surge-pricing.service';

// Legacy services (for backwards compatibility)
export * from './services/orders.service';
export * from './services/costing.service';
export * from './services/inventory-consumption.service';
export * from './services/labor-allocation.service';
export * from './services/kitchen-pnl.service';
export * from './services/prep-consolidation.service';
export * from './services/payroll.service';
export * from './services/order-consumption.writer';
export * from './services/chefs.service';
export * from './services/customers.service';
export * from './services/permissions.service';
export * from './services/storage.service';

// Stripe (IRR-007 / IRR-018) — server-only secret; safe to import from route handlers
export {
  getStripeClient,
  assertStripeConfigured,
  STRIPE_API_VERSION,
  getOrCreateStripeCustomer,
  getStripePublishableKey,
  isStripeTestModeConfigured,
  StripeTestModeUnavailableError,
} from './services/stripe.service';

export {
  claimStripeWebhookEventForProcessing,
  finalizeStripeWebhookSuccess,
  finalizeStripeWebhookFailure,
} from './services/stripe-webhook-idempotency';

export {
  handleStripeFinanceWebhook,
  financeWebhookSystemActor,
  type FinanceWebhookEngineSlice,
} from './services/stripe-webhook-finance';

export { createEtaService } from './services/eta.service';
export type { EtaService } from '@ridendine/routing';

export {
  LedgerService,
  createLedgerService,
  makeLedgerIdempotencyKey,
  type LedgerInsertRow,
} from './services/ledger.service';
export {
  PayoutService,
  createPayoutService,
  type PayoutPreviewLine,
  type PayoutServiceDeps,
} from './services/payout.service';
export {
  ReconciliationService,
  createReconciliationService,
  type ReconciliationRunSummary,
} from './services/reconciliation.service';
export {
  TaxConfigService,
  createTaxConfigService,
  type TaxRates,
} from './services/tax-config.service';

// Referral system
export {
  ReferralService,
  createReferralService,
  REFERRAL_REWARD_CENTS,
  type ReferralCode,
  type ReferralSignup,
  type ReferralStats,
  type ReferralSignupSummary,
  type CompleteReferralResult,
} from './services/referral.service';

// Constants
export * from './constants';

// Shared client helpers (explicit to avoid naming conflicts with core getEngine)
export {
  getAdminEngine,
  registerPaymentAdapter,
  resetEngineClient,
  errorResponse,
  successResponse,
} from './client-helpers';
