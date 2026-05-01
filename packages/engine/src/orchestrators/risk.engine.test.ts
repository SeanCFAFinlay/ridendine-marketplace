import { describe, it, expect } from 'vitest';
import {
  RiskEngine,
  evaluateCheckoutRisk,
  evaluateCustomerRisk,
  evaluateOrderRisk,
  evaluatePaymentRisk,
  DEFAULT_RISK_LIMITS,
} from './risk.engine';

const ISO = '2026-04-30T12:00:00.000Z';

describe('RiskEngine', () => {
  it('allows normal valid checkout input', () => {
    const r = evaluateCheckoutRisk(
      {
        customerId: 'cust_1',
        cartId: 'cart_1',
        amountCents: 2500,
        currency: 'cad',
        evaluatedAt: ISO,
      },
      DEFAULT_RISK_LIMITS
    );
    expect(r.allowed).toBe(true);
    expect(r.recommendedAction).toBe('allow');
    expect(r.level).toBe('low');
    expect(r.reasons).toEqual([]);
    expect(r.auditPayload.reasonCodes).toEqual([]);
  });

  it('blocks missing customer identity', () => {
    const r = evaluateCustomerRisk({ customerId: '', evaluatedAt: ISO });
    expect(r.allowed).toBe(false);
    expect(r.recommendedAction).toBe('block');
    expect(r.reasons).toContain('missing_customer_identity');
  });

  it('blocks zero or negative amount', () => {
    expect(evaluatePaymentRisk({ amountCents: 0, evaluatedAt: ISO }).allowed).toBe(
      false
    );
    expect(evaluatePaymentRisk({ amountCents: -1, evaluatedAt: ISO }).allowed).toBe(
      false
    );
    expect(
      evaluatePaymentRisk({ amountCents: 0, evaluatedAt: ISO }).reasons
    ).toContain('invalid_amount');
  });

  it('reviews unusually large amount', () => {
    const r = evaluatePaymentRisk(
      {
        amountCents: DEFAULT_RISK_LIMITS.LARGE_ORDER_AMOUNT_CENTS,
        currency: 'usd',
        evaluatedAt: ISO,
      },
      DEFAULT_RISK_LIMITS
    );
    expect(r.allowed).toBe(true);
    expect(r.recommendedAction).toBe('review');
    expect(r.reasons).toContain('large_order_amount');
  });

  it('reviews high attempt count when provided', () => {
    const r = evaluateCheckoutRisk(
      {
        customerId: 'c1',
        cartId: 'cart1',
        amountCents: 1000,
        currency: 'cad',
        checkoutAttemptCount: DEFAULT_RISK_LIMITS.CHECKOUT_ATTEMPT_REVIEW_THRESHOLD,
        evaluatedAt: ISO,
      },
      DEFAULT_RISK_LIMITS
    );
    expect(r.allowed).toBe(true);
    expect(r.recommendedAction).toBe('review');
    expect(r.reasons).toContain('high_checkout_attempt_count');
  });

  it('blocks unsupported currency when provided', () => {
    const r = evaluatePaymentRisk({
      amountCents: 1000,
      currency: 'eur',
      evaluatedAt: ISO,
    });
    expect(r.allowed).toBe(false);
    expect(r.reasons).toContain('unsupported_currency');
  });

  it('returns deterministic sorted reasons', () => {
    const r = evaluateCheckoutRisk(
      {
        customerId: '',
        cartId: '',
        amountCents: -5,
        currency: 'xxx',
        evaluatedAt: ISO,
      },
      DEFAULT_RISK_LIMITS
    );
    const sorted = [...r.reasons].sort();
    expect(r.reasons).toEqual(sorted);
    expect(r.reasons.length).toBeGreaterThan(1);
  });

  it('audit payload contains no secret-like keys', () => {
    const r = evaluateCheckoutRisk(
      {
        customerId: 'cust',
        cartId: 'cart',
        amountCents: 500,
        evaluatedAt: ISO,
      },
      DEFAULT_RISK_LIMITS
    );
    const keys = JSON.stringify(r.auditPayload).toLowerCase();
    expect(keys).not.toMatch(/secret|password|token|authorization|bearer/);
    expect(r.auditPayload).not.toHaveProperty('stripe');
  });

  it('evaluateOrderRisk allows id-only when amount omitted', () => {
    const r = evaluateOrderRisk(
      { orderId: 'ord_1', evaluatedAt: ISO },
      DEFAULT_RISK_LIMITS
    );
    expect(r.allowed).toBe(true);
    expect(r.reasons).toEqual([]);
  });

  it('RiskEngine namespace matches exports', () => {
    expect(RiskEngine.evaluatePaymentRisk({ amountCents: 1, evaluatedAt: ISO }).allowed).toBe(
      true
    );
  });
});
