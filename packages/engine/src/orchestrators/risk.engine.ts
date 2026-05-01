// ==========================================
// RISK ENGINE (IRR-022)
// Deterministic, testable pre-flight checks — no external calls.
// Thresholds: DEFAULT_RISK_LIMITS — document changes in BUSINESS_ENGINE_FOUNDATION.md
// ==========================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'blocked';

export type RiskRecommendedAction = 'allow' | 'review' | 'block';

export interface RiskEvaluationResult {
  allowed: boolean;
  score: number;
  level: RiskLevel;
  reasons: string[];
  recommendedAction: RiskRecommendedAction;
  auditPayload: Record<string, unknown>;
}

/** Tuning guide: `docs/BUSINESS_ENGINE_FOUNDATION.md` */
export const DEFAULT_RISK_LIMITS = {
  /** Total in minor units (e.g. cents) above which checkout/order is flagged for review */
  LARGE_ORDER_AMOUNT_CENTS: 50_000,
  /** `checkoutAttemptCount` at or above → review (if provided) */
  CHECKOUT_ATTEMPT_REVIEW_THRESHOLD: 5,
  /** ISO 4217 lowercase — block checkout/payment if `currency` is set and not in this list */
  ALLOWED_CURRENCIES: ['cad', 'usd'] as const,
} as const;

export type RiskLimits = typeof DEFAULT_RISK_LIMITS;

const REASON = {
  MISSING_CUSTOMER_IDENTITY: 'missing_customer_identity',
  MISSING_CART_REFERENCE: 'missing_cart_reference',
  MISSING_ORDER_REFERENCE: 'missing_order_reference',
  INVALID_AMOUNT: 'invalid_amount',
  UNSUPPORTED_CURRENCY: 'unsupported_currency',
  LARGE_ORDER_AMOUNT: 'large_order_amount',
  HIGH_CHECKOUT_ATTEMPT_COUNT: 'high_checkout_attempt_count',
} as const;

function normalizeCurrency(c: string | null | undefined): string | null {
  if (c == null || String(c).trim() === '') return null;
  return String(c).trim().toLowerCase();
}

function isAllowedCurrency(
  currency: string | null,
  allowed: readonly string[]
): boolean {
  if (currency == null) return true;
  return (allowed as readonly string[]).includes(currency);
}

function finalizeResult(params: {
  allowed: boolean;
  blockReasons: string[];
  reviewReasons: string[];
  scenario: string;
  evaluatedAt: string;
  auditExtras: Record<string, unknown>;
}): RiskEvaluationResult {
  const { allowed, blockReasons, reviewReasons, scenario, evaluatedAt, auditExtras } =
    params;
  const reasons = [...blockReasons, ...reviewReasons].sort();
  let score = 0;
  if (blockReasons.length > 0) score = 100;
  else score = Math.min(99, reviewReasons.length * 35);

  let level: RiskLevel;
  let recommendedAction: RiskRecommendedAction;
  if (!allowed) {
    level = 'blocked';
    recommendedAction = 'block';
  } else if (reviewReasons.length > 0) {
    level = reviewReasons.length >= 2 ? 'high' : 'medium';
    recommendedAction = 'review';
  } else {
    level = 'low';
    recommendedAction = 'allow';
  }

  const auditPayload: Record<string, unknown> = {
    scenario,
    evaluatedAt,
    allowed,
    level,
    recommendedAction,
    reasonCodes: [...reasons],
    ...auditExtras,
  };

  return {
    allowed,
    score,
    level,
    reasons,
    recommendedAction,
    auditPayload,
  };
}

export interface CustomerRiskInput {
  customerId?: string | null;
  evaluatedAt?: string;
}

export function evaluateCustomerRisk(
  input: CustomerRiskInput,
  limits?: RiskLimits
): RiskEvaluationResult {
  void limits;
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const id = input.customerId?.trim() ?? '';
  if (id.length === 0) {
    return finalizeResult({
      allowed: false,
      blockReasons: [REASON.MISSING_CUSTOMER_IDENTITY],
      reviewReasons: [],
      scenario: 'customer',
      evaluatedAt,
      auditExtras: { hasCustomerId: false },
    });
  }
  return finalizeResult({
    allowed: true,
    blockReasons: [],
    reviewReasons: [],
    scenario: 'customer',
    evaluatedAt,
    auditExtras: { hasCustomerId: true },
  });
}

export interface PaymentRiskInput {
  amountCents: number;
  currency?: string | null;
  evaluatedAt?: string;
}

export function evaluatePaymentRisk(
  input: PaymentRiskInput,
  limits: RiskLimits = DEFAULT_RISK_LIMITS
): RiskEvaluationResult {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const blockReasons: string[] = [];
  const reviewReasons: string[] = [];
  const currency = normalizeCurrency(input.currency);

  if (!Number.isFinite(input.amountCents) || input.amountCents <= 0) {
    blockReasons.push(REASON.INVALID_AMOUNT);
  }
  if (currency != null && !isAllowedCurrency(currency, limits.ALLOWED_CURRENCIES)) {
    blockReasons.push(REASON.UNSUPPORTED_CURRENCY);
  }
  if (
    blockReasons.length === 0 &&
    input.amountCents >= limits.LARGE_ORDER_AMOUNT_CENTS
  ) {
    reviewReasons.push(REASON.LARGE_ORDER_AMOUNT);
  }

  return finalizeResult({
    allowed: blockReasons.length === 0,
    blockReasons,
    reviewReasons,
    scenario: 'payment',
    evaluatedAt,
    auditExtras: {
      amountCentsPresent: Number.isFinite(input.amountCents),
      currencyNormalized: currency,
    },
  });
}

export interface OrderRiskInput {
  orderId?: string | null;
  amountCents?: number;
  currency?: string | null;
  evaluatedAt?: string;
}

export function evaluateOrderRisk(
  input: OrderRiskInput,
  limits: RiskLimits = DEFAULT_RISK_LIMITS
): RiskEvaluationResult {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const blockReasons: string[] = [];
  const reviewReasons: string[] = [];
  const orderId = input.orderId?.trim() ?? '';
  if (orderId.length === 0) {
    blockReasons.push(REASON.MISSING_ORDER_REFERENCE);
  }

  const hasAmount =
    input.amountCents !== undefined && Number.isFinite(input.amountCents);
  if (hasAmount) {
    const pay = evaluatePaymentRisk(
      {
        amountCents: input.amountCents as number,
        currency: input.currency,
        evaluatedAt,
      },
      limits
    );
    if (!pay.allowed) {
      for (const r of pay.reasons) {
        if (!blockReasons.includes(r)) blockReasons.push(r);
      }
    } else {
      for (const r of pay.reasons) {
        if (!reviewReasons.includes(r)) reviewReasons.push(r);
      }
    }
  } else {
    const c = normalizeCurrency(input.currency);
    if (c != null && !isAllowedCurrency(c, limits.ALLOWED_CURRENCIES)) {
      blockReasons.push(REASON.UNSUPPORTED_CURRENCY);
    }
  }

  return finalizeResult({
    allowed: blockReasons.length === 0,
    blockReasons,
    reviewReasons,
    scenario: 'order',
    evaluatedAt,
    auditExtras: { hasOrderId: orderId.length > 0 },
  });
}

export interface CheckoutRiskInput {
  customerId?: string | null;
  cartId?: string | null;
  amountCents: number;
  currency?: string | null;
  checkoutAttemptCount?: number | null;
  evaluatedAt?: string;
}

export function evaluateCheckoutRisk(
  input: CheckoutRiskInput,
  limits: RiskLimits = DEFAULT_RISK_LIMITS
): RiskEvaluationResult {
  const evaluatedAt = input.evaluatedAt ?? new Date().toISOString();
  const blockReasons: string[] = [];
  const reviewReasons: string[] = [];

  const cust = evaluateCustomerRisk(
    { customerId: input.customerId, evaluatedAt },
    limits
  );
  if (!cust.allowed) blockReasons.push(...cust.reasons);

  const cartId = input.cartId?.trim() ?? '';
  if (cartId.length === 0) {
    blockReasons.push(REASON.MISSING_CART_REFERENCE);
  }

  const pay = evaluatePaymentRisk(
    {
      amountCents: input.amountCents,
      currency: input.currency,
      evaluatedAt,
    },
    limits
  );
  if (!pay.allowed) {
    for (const r of pay.reasons) {
      if (!blockReasons.includes(r)) blockReasons.push(r);
    }
  } else {
    for (const r of pay.reasons) {
      if (!reviewReasons.includes(r)) reviewReasons.push(r);
    }
  }

  const attempts = input.checkoutAttemptCount;
  if (
    attempts != null &&
    Number.isFinite(attempts) &&
    attempts >= limits.CHECKOUT_ATTEMPT_REVIEW_THRESHOLD
  ) {
    reviewReasons.push(REASON.HIGH_CHECKOUT_ATTEMPT_COUNT);
  }

  return finalizeResult({
    allowed: blockReasons.length === 0,
    blockReasons,
    reviewReasons,
    scenario: 'checkout',
    evaluatedAt,
    auditExtras: {
      hasCartId: cartId.length > 0,
      checkoutAttemptCount: attempts ?? null,
    },
  });
}

/** Namespace export for discoverability */
export const RiskEngine = {
  evaluateCheckoutRisk,
  evaluateOrderRisk,
  evaluateCustomerRisk,
  evaluatePaymentRisk,
  DEFAULT_RISK_LIMITS,
} as const;
