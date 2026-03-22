import { z } from 'zod';
import { priceSchema, ratingSchema } from './common';

// ==========================================
// ORDER VALIDATION SCHEMAS
// ==========================================

export const createOrderSchema = z.object({
  storefrontId: z.string().uuid(),
  deliveryAddressId: z.string().uuid(),
  items: z.array(z.object({
    menuItemId: z.string().uuid(),
    quantity: z.number().int().min(1).max(99),
    specialInstructions: z.string().max(500).nullable().optional(),
    selectedOptions: z.array(z.object({
      optionId: z.string().uuid(),
      valueId: z.string().uuid(),
    })).optional(),
  })).min(1, 'At least one item is required'),
  specialInstructions: z.string().max(1000).nullable().optional(),
  tip: priceSchema.default(0),
  promoCode: z.string().max(50).nullable().optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'accepted',
    'rejected',
    'preparing',
    'ready_for_pickup',
    'cancelled',
  ]),
  notes: z.string().max(500).nullable().optional(),
  rejectionReason: z.string().max(500).optional(),
});

export const createReviewSchema = z.object({
  orderId: z.string().uuid(),
  rating: ratingSchema,
  comment: z.string().max(2000).nullable().optional(),
});

export const chefRespondToReviewSchema = z.object({
  response: z.string().min(1).max(1000),
});

export const applyPromoCodeSchema = z.object({
  code: z.string().min(1).max(50),
});

export const processRefundSchema = z.object({
  orderId: z.string().uuid(),
  amount: priceSchema,
  reason: z.string().min(1).max(500),
});

// Type exports
export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type UpdateOrderStatusInput = z.infer<typeof updateOrderStatusSchema>;
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ChefRespondToReviewInput = z.infer<typeof chefRespondToReviewSchema>;
export type ApplyPromoCodeInput = z.infer<typeof applyPromoCodeSchema>;
export type ProcessRefundInput = z.infer<typeof processRefundSchema>;
