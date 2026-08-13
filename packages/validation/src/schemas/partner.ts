import { z } from 'zod';

// ==========================================
// PARTNER (EXTERNAL STOREFRONT) VALIDATION SCHEMAS
// Inline order payloads for the partner payment API. Unlike the customer
// checkoutSchema (which references pre-existing cart / address rows), partners
// send the customer, address and items inline; the route materializes them.
// ==========================================

export const partnerCustomerSchema = z.object({
  email: z.string().email('A valid customer email is required'),
  firstName: z.string().min(1, 'firstName is required').max(50),
  // customers.last_name is NOT NULL; default to empty string when absent.
  lastName: z.string().max(50).optional().default(''),
  // customers.phone is VARCHAR(20).
  phone: z.string().max(20).nullable().optional(),
});

export const partnerDeliveryAddressSchema = z.object({
  label: z.string().max(50).optional().default('Delivery'),
  addressLine1: z.string().min(1, 'addressLine1 is required'),
  addressLine2: z.string().nullable().optional(),
  city: z.string().min(1, 'city is required'),
  state: z.string().min(1, 'state is required'),
  postalCode: z.string().min(1, 'postalCode is required'),
  country: z.string().default('CA'),
  // Optional: when absent the route geocodes addressLine1/city/state/postalCode.
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  deliveryInstructions: z.string().max(500).nullable().optional(),
});

export const partnerCheckoutItemSchema = z.object({
  menuItemId: z.string().uuid('menuItemId must be a valid UUID'),
  quantity: z.number().int().min(1).max(99),
  specialInstructions: z.string().max(500).nullable().optional(),
  selectedOptions: z
    .array(
      z.object({
        optionId: z.string().uuid(),
        valueId: z.string().uuid(),
      })
    )
    .optional(),
});

export const partnerCheckoutSchema = z.object({
  storefrontId: z.string().uuid('storefrontId must be a valid UUID'),
  customer: partnerCustomerSchema,
  deliveryAddress: partnerDeliveryAddressSchema,
  items: z.array(partnerCheckoutItemSchema).min(1, 'At least one item is required'),
  tip: z
    .number()
    .min(0, 'Tip cannot be negative')
    .max(500, 'Tip cannot exceed $500')
    .multipleOf(0.01, 'Tip must be a whole cent amount')
    .optional()
    .default(0),
  promoCode: z.string().optional(),
  specialInstructions: z.string().max(1000).optional(),
  /** ISO timestamp for scheduled delivery. Null / absent means ASAP. */
  scheduledFor: z.string().datetime({ offset: true }).nullable().optional(),
});

/**
 * Quote-only payload. `/checkout/quote` prices items + address and writes
 * nothing — it never touches the customer — so `customer` is optional here and
 * ignored when present. (The full object stays REQUIRED at `/checkout`, which
 * materializes a customer row.) This matches the published partner reference:
 * "you only need storefrontId, deliveryAddress and items here."
 *
 * Requiring `customer` at /quote made every documented quote payload fail with
 * a bare `VALIDATION_ERROR: "Required"`.
 */
export const partnerQuoteSchema = partnerCheckoutSchema.extend({
  customer: partnerCustomerSchema.optional(),
});

export type PartnerCustomerInput = z.infer<typeof partnerCustomerSchema>;
export type PartnerDeliveryAddressInput = z.infer<typeof partnerDeliveryAddressSchema>;
export type PartnerCheckoutItemInput = z.infer<typeof partnerCheckoutItemSchema>;
export type PartnerCheckoutInput = z.infer<typeof partnerCheckoutSchema>;
/**
 * The parsed /checkout/quote REQUEST BODY. Deliberately not named
 * `PartnerQuoteInput` — that name is taken by the argument type of
 * `buildPartnerQuote` in apps/web/src/lib/checkout/quote.ts, which is a
 * different shape (it carries an adminClient and no tip/promo defaults).
 */
export type PartnerQuoteBody = z.infer<typeof partnerQuoteSchema>;
