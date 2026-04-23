import { z } from 'zod';

// ==========================================
// COMMON VALIDATION SCHEMAS
// ==========================================

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().email('Invalid email address');

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s\-()]+$/, 'Invalid phone number')
  .min(10, 'Phone number too short');

export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// paginationSchema is in pagination.ts

export const searchSchema = z.object({
  query: z.string().optional(),
  sort: z.enum(['asc', 'desc']).optional().default('desc'),
  sortBy: z.string().optional(),
});

export const addressSchema = z.object({
  address_line1: z.string().min(1, 'Address is required'),
  address_line2: z.string().nullable().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postal_code: z.string().min(1, 'Postal code is required'),
  country: z.string().default('US'),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
});

export const coordinatesSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const priceSchema = z.number().min(0, 'Price must be positive');

export const ratingSchema = z.number().int().min(1).max(5);

export const slugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug format');

export const urlSchema = z.string().url('Invalid URL');

export const imageUrlSchema = urlSchema.or(z.string().startsWith('/'));

// Date/time schemas
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:MM)');

export const dayOfWeekSchema = z.number().int().min(0).max(6);

// Type exports
export type Search = z.infer<typeof searchSchema>;
export type Address = z.infer<typeof addressSchema>;
export type Coordinates = z.infer<typeof coordinatesSchema>;
