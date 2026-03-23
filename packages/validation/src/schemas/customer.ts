import { z } from 'zod';
import { addressSchema, phoneSchema, imageUrlSchema } from './common';

// ==========================================
// CUSTOMER VALIDATION SCHEMAS
// ==========================================

export const updateCustomerProfileSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  phone: phoneSchema.nullable().optional(),
  profileImageUrl: imageUrlSchema.nullable().optional(),
});

export const createCustomerAddressSchema = z.object({
  label: z.string().min(1, 'Label is required').max(50),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().nullable().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  country: z.string().default('US'),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  deliveryInstructions: z.string().max(500).nullable().optional(),
  isDefault: z.boolean().default(false),
});

export const updateCustomerAddressSchema = createCustomerAddressSchema.partial();

export const addToCartSchema = z.object({
  storefrontId: z.string().uuid(),
  menuItemId: z.string().uuid(),
  quantity: z.number().int().min(1).max(99),
  specialInstructions: z.string().max(500).nullable().optional(),
  selectedOptions: z.array(z.object({
    optionId: z.string().uuid(),
    valueId: z.string().uuid(),
  })).optional(),
});

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(1).max(99).optional(),
  specialInstructions: z.string().max(500).nullable().optional(),
  selectedOptions: z.array(z.object({
    optionId: z.string().uuid(),
    valueId: z.string().uuid(),
  })).optional(),
});

export const addFavoriteSchema = z.object({
  storefrontId: z.string().uuid(),
});

// Type exports
export type UpdateCustomerProfileInput = z.infer<typeof updateCustomerProfileSchema>;
export type CreateCustomerAddressInput = z.infer<typeof createCustomerAddressSchema>;
export type UpdateCustomerAddressInput = z.infer<typeof updateCustomerAddressSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type UpdateCartItemInput = z.infer<typeof updateCartItemSchema>;
