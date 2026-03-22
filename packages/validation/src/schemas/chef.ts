import { z } from 'zod';
import { addressSchema, phoneSchema, priceSchema, timeSchema, dayOfWeekSchema, imageUrlSchema } from './common';

// ==========================================
// CHEF VALIDATION SCHEMAS
// ==========================================

export const createChefProfileSchema = z.object({
  displayName: z.string().min(2, 'Display name must be at least 2 characters').max(100),
  bio: z.string().max(1000).nullable().optional(),
  profileImageUrl: imageUrlSchema.nullable().optional(),
  phone: phoneSchema.optional(),
});

export const updateChefProfileSchema = createChefProfileSchema.partial();

export const createKitchenSchema = z.object({
  name: z.string().min(1, 'Kitchen name is required').max(100),
  ...addressSchema.shape,
});

export const updateKitchenSchema = createKitchenSchema.partial();

export const createStorefrontSchema = z.object({
  name: z.string().min(2, 'Storefront name must be at least 2 characters').max(100),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase with hyphens only'),
  description: z.string().max(2000).nullable().optional(),
  cuisineTypes: z.array(z.string()).default([]),
  coverImageUrl: imageUrlSchema.nullable().optional(),
  logoUrl: imageUrlSchema.nullable().optional(),
  minOrderAmount: priceSchema.default(0),
  estimatedPrepTimeMin: z.number().int().min(1).default(15),
  estimatedPrepTimeMax: z.number().int().min(1).default(45),
});

export const updateStorefrontSchema = createStorefrontSchema.partial();

export const createMenuCategorySchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  description: z.string().max(500).nullable().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const updateMenuCategorySchema = createMenuCategorySchema.partial();

export const createMenuItemSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().min(1, 'Item name is required').max(200),
  description: z.string().max(1000).nullable().optional(),
  price: priceSchema,
  imageUrl: imageUrlSchema.nullable().optional(),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  dietaryTags: z.array(z.string()).default([]),
  prepTimeMinutes: z.number().int().min(1).nullable().optional(),
  sortOrder: z.number().int().default(0),
});

export const updateMenuItemSchema = createMenuItemSchema.partial();

export const createMenuItemOptionSchema = z.object({
  name: z.string().min(1, 'Option name is required').max(100),
  isRequired: z.boolean().default(false),
  maxSelections: z.number().int().min(1).default(1),
  sortOrder: z.number().int().default(0),
  values: z.array(z.object({
    name: z.string().min(1).max(100),
    priceAdjustment: z.number().default(0),
    isAvailable: z.boolean().default(true),
    sortOrder: z.number().int().default(0),
  })).min(1, 'At least one option value is required'),
});

export const updateMenuItemOptionSchema = createMenuItemOptionSchema.partial();

export const setAvailabilitySchema = z.object({
  dayOfWeek: dayOfWeekSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  isAvailable: z.boolean(),
}).refine((data) => {
  if (!data.isAvailable) return true;
  return data.startTime < data.endTime;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const createDeliveryZoneSchema = z.object({
  name: z.string().min(1).max(100),
  radiusKm: z.number().min(0.5).max(50).nullable().optional(),
  deliveryFee: priceSchema,
  minOrderForFreeDelivery: priceSchema.nullable().optional(),
  estimatedDeliveryMin: z.number().int().min(1).default(15),
  estimatedDeliveryMax: z.number().int().min(1).default(45),
  isActive: z.boolean().default(true),
});

export const updateDeliveryZoneSchema = createDeliveryZoneSchema.partial();

// Type exports
export type CreateChefProfileInput = z.infer<typeof createChefProfileSchema>;
export type UpdateChefProfileInput = z.infer<typeof updateChefProfileSchema>;
export type CreateKitchenInput = z.infer<typeof createKitchenSchema>;
export type CreateStorefrontInput = z.infer<typeof createStorefrontSchema>;
export type UpdateStorefrontInput = z.infer<typeof updateStorefrontSchema>;
export type CreateMenuCategoryInput = z.infer<typeof createMenuCategorySchema>;
export type CreateMenuItemInput = z.infer<typeof createMenuItemSchema>;
export type UpdateMenuItemInput = z.infer<typeof updateMenuItemSchema>;
export type CreateMenuItemOptionInput = z.infer<typeof createMenuItemOptionSchema>;
export type SetAvailabilityInput = z.infer<typeof setAvailabilitySchema>;
export type CreateDeliveryZoneInput = z.infer<typeof createDeliveryZoneSchema>;
