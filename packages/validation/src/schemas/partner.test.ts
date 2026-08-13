// ==========================================
// PARTNER SCHEMA TESTS
// Regression coverage for the COOCO integration report (2026-08):
// every documented /checkout/quote payload was rejected with a bare
// `VALIDATION_ERROR: "Required"` because the quote route validated against the
// full checkout schema, which requires a `customer` block the quote never uses.
// ==========================================

import { describe, expect, it } from 'vitest';
import { partnerCheckoutSchema, partnerQuoteSchema } from './partner';
import { formatIssueDetails, formatValidationMessage } from './common';

const STOREFRONT_ID = 'b2b2b2b2-0002-0002-0021-b2b2b2b2b2b2';
const MENU_ITEM_ID = 'b2b2b2b2-0002-0002-0041-b2b2b2b2b2b2';

/** The exact body published in RIDENDINE_PARTNER_API.md §2.3. */
const DOCUMENTED_QUOTE_BODY = {
  storefrontId: STOREFRONT_ID,
  deliveryAddress: {
    addressLine1: '123 King St W',
    city: 'Hamilton',
    state: 'ON',
    postalCode: 'L8P 1A1',
  },
  items: [{ menuItemId: MENU_ITEM_ID, quantity: 2 }],
};

describe('partnerQuoteSchema', () => {
  it('accepts the documented quote body (no customer block)', () => {
    const result = partnerQuoteSchema.safeParse(DOCUMENTED_QUOTE_BODY);
    expect(result.success).toBe(true);
  });

  it('accepts — and does not require — a customer block', () => {
    const result = partnerQuoteSchema.safeParse({
      ...DOCUMENTED_QUOTE_BODY,
      customer: { email: 'diner@example.com', firstName: 'Jane' },
    });
    expect(result.success).toBe(true);
  });

  it('still requires storefrontId, deliveryAddress and items', () => {
    const result = partnerQuoteSchema.safeParse({});
    expect(result.success).toBe(false);
    if (result.success) return;
    const fields = formatIssueDetails(result.error).map((d) => d.field);
    expect(fields).toEqual(
      expect.arrayContaining(['storefrontId', 'deliveryAddress', 'items'])
    );
    expect(fields).not.toContain('customer');
  });

  it('defaults tip to 0 and country to CA', () => {
    const result = partnerQuoteSchema.safeParse(DOCUMENTED_QUOTE_BODY);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.tip).toBe(0);
    expect(result.data.deliveryAddress.country).toBe('CA');
  });
});

describe('partnerCheckoutSchema', () => {
  it('still requires the customer block (a real order materializes a customer)', () => {
    const result = partnerCheckoutSchema.safeParse(DOCUMENTED_QUOTE_BODY);
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(formatIssueDetails(result.error).map((d) => d.field)).toContain('customer');
  });

  it('accepts the documented checkout body', () => {
    const result = partnerCheckoutSchema.safeParse({
      ...DOCUMENTED_QUOTE_BODY,
      customer: { email: 'diner@example.com', firstName: 'Jane', phone: '+16475551234' },
    });
    expect(result.success).toBe(true);
  });
});

describe('validation error formatting', () => {
  it('names the missing field instead of a bare "Required"', () => {
    const result = partnerCheckoutSchema.safeParse(DOCUMENTED_QUOTE_BODY);
    expect(result.success).toBe(false);
    if (result.success) return;

    const message = formatValidationMessage(result.error);
    expect(message).toContain('customer');
    expect(message).not.toBe('Required');
  });

  it('distinguishes an empty payload from a partially-filled one', () => {
    const empty = partnerCheckoutSchema.safeParse({});
    const partial = partnerCheckoutSchema.safeParse({ storefrontId: STOREFRONT_ID });
    expect(empty.success).toBe(false);
    expect(partial.success).toBe(false);
    if (empty.success || partial.success) return;

    expect(formatValidationMessage(empty.error)).not.toBe(
      formatValidationMessage(partial.error)
    );
  });

  it('indexes array paths so a bad item is locatable', () => {
    const result = partnerQuoteSchema.safeParse({
      ...DOCUMENTED_QUOTE_BODY,
      items: [
        { menuItemId: MENU_ITEM_ID, quantity: 1 },
        { menuItemId: 'not-a-uuid', quantity: 1 },
      ],
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(formatIssueDetails(result.error).map((d) => d.field)).toContain(
      'items[1].menuItemId'
    );
  });

  it('reports nested address fields with a dotted path', () => {
    const result = partnerQuoteSchema.safeParse({
      ...DOCUMENTED_QUOTE_BODY,
      deliveryAddress: { addressLine1: '123 King St W', city: 'Hamilton' },
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const fields = formatIssueDetails(result.error).map((d) => d.field);
    expect(fields).toContain('deliveryAddress.state');
    expect(fields).toContain('deliveryAddress.postalCode');
  });

  it('caps the message and counts the remainder', () => {
    const result = partnerQuoteSchema.safeParse({ deliveryAddress: {}, items: [] });
    expect(result.success).toBe(false);
    if (result.success) return;
    const message = formatValidationMessage(result.error, 2);
    expect(message.split(';')).toHaveLength(2);
    expect(message).toMatch(/\(\+\d+ more\)$/);
  });
});
