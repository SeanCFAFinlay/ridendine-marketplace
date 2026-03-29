import { z } from 'zod';
import { phoneSchema, coordinatesSchema, imageUrlSchema } from './common';

// ==========================================
// DRIVER VALIDATION SCHEMAS
// ==========================================

export const createDriverProfileSchema = z.object({
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  phone: phoneSchema,
  email: z.string().email(),
  profileImageUrl: imageUrlSchema.nullable().optional(),
});

export const updateDriverProfileSchema = createDriverProfileSchema.partial();

export const createDriverVehicleSchema = z.object({
  vehicleType: z.enum(['car', 'motorcycle', 'bicycle', 'scooter']),
  make: z.string().max(50).nullable().optional(),
  model: z.string().max(50).nullable().optional(),
  year: z.number().int().min(1990).max(new Date().getFullYear() + 1).nullable().optional(),
  color: z.string().max(30).nullable().optional(),
  licensePlate: z.string().max(20).nullable().optional(),
});

export const updateDriverVehicleSchema = createDriverVehicleSchema.partial();

export const updateDriverLocationSchema = coordinatesSchema.extend({
  accuracy: z.number().nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).nullable().optional(),
});

export const locationUpdateSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).nullable().optional(),
  heading: z.number().min(0).max(360).nullable().optional(),
  speed: z.number().min(0).nullable().optional(),
  deliveryId: z.string().uuid().nullable().optional(),
});

export const goOnlineSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export const respondToDeliveryOfferSchema = z.object({
  response: z.enum(['accepted', 'rejected']),
  rejectionReason: z.string().max(200).optional(),
});

export const confirmPickupSchema = z.object({
  photoUrl: imageUrlSchema.optional(),
  notes: z.string().max(500).optional(),
});

export const confirmDropoffSchema = z.object({
  photoUrl: imageUrlSchema.optional(),
  signatureUrl: imageUrlSchema.optional(),
  notes: z.string().max(500).optional(),
});

export const uploadDriverDocumentSchema = z.object({
  documentType: z.enum([
    'drivers_license',
    'vehicle_registration',
    'vehicle_insurance',
  ]),
  documentUrl: z.string().url(),
  expiresAt: z.string().datetime().nullable().optional(),
});

// Type exports
export type CreateDriverProfileInput = z.infer<typeof createDriverProfileSchema>;
export type UpdateDriverProfileInput = z.infer<typeof updateDriverProfileSchema>;
export type CreateDriverVehicleInput = z.infer<typeof createDriverVehicleSchema>;
export type UpdateDriverVehicleInput = z.infer<typeof updateDriverVehicleSchema>;
export type UpdateDriverLocationInput = z.infer<typeof updateDriverLocationSchema>;
export type LocationUpdateInput = z.infer<typeof locationUpdateSchema>;
export type GoOnlineInput = z.infer<typeof goOnlineSchema>;
export type RespondToDeliveryOfferInput = z.infer<typeof respondToDeliveryOfferSchema>;
export type ConfirmPickupInput = z.infer<typeof confirmPickupSchema>;
export type ConfirmDropoffInput = z.infer<typeof confirmDropoffSchema>;
export type UploadDriverDocumentInput = z.infer<typeof uploadDriverDocumentSchema>;
