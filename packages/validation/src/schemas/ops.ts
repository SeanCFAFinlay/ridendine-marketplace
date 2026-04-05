import { z } from 'zod';

export const platformSettingsSchema = z.object({
  platformFeePercent: z.number().min(0).max(100),
  serviceFeePercent: z.number().min(0).max(100),
  hstRate: z.number().min(0).max(100),
  minOrderAmount: z.number().min(0).max(1000),
  dispatchRadiusKm: z.number().min(1).max(100),
  maxDeliveryDistanceKm: z.number().min(1).max(100),
  defaultPrepTimeMinutes: z.number().int().min(5).max(180),
  offerTimeoutSeconds: z.number().int().min(15).max(600),
  maxAssignmentAttempts: z.number().int().min(1).max(20),
  autoAssignEnabled: z.boolean(),
  refundAutoReviewThresholdCents: z.number().int().min(0).max(500000),
  supportSlaWarningMinutes: z.number().int().min(1).max(1440),
  supportSlaBreachMinutes: z.number().int().min(1).max(2880),
  storefrontThrottleOrderLimit: z.number().int().min(0).max(1000),
  storefrontThrottleWindowMinutes: z.number().int().min(1).max(1440),
  storefrontAutoPauseEnabled: z.boolean(),
  storefrontPauseOnSlaBreach: z.boolean(),
});

export const platformSettingsUpdateSchema = platformSettingsSchema.refine(
  (input) => input.maxDeliveryDistanceKm >= input.dispatchRadiusKm,
  {
    message: 'Maximum delivery distance must be greater than or equal to dispatch radius',
    path: ['maxDeliveryDistanceKm'],
  }
).refine(
  (input) => input.supportSlaBreachMinutes >= input.supportSlaWarningMinutes,
  {
    message: 'Support SLA breach must be greater than or equal to warning threshold',
    path: ['supportSlaBreachMinutes'],
  }
);

export const deliveryInterventionActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('manual_assign'),
    deliveryId: z.string().uuid(),
    driverId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('reassign'),
    deliveryId: z.string().uuid(),
    reason: z.string().min(3).max(500),
  }),
  z.object({
    action: z.literal('retry_assignment'),
    deliveryId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('escalate_exception'),
    deliveryId: z.string().uuid(),
    reason: z.string().min(3).max(500),
  }),
  z.object({
    action: z.literal('cancel_delivery'),
    deliveryId: z.string().uuid(),
    reason: z.string().min(3).max(500),
  }),
  z.object({
    action: z.literal('acknowledge_issue'),
    exceptionId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('add_ops_note'),
    deliveryId: z.string().uuid(),
    note: z.string().min(3).max(2000),
  }),
]);

export const financeActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('approve_refund'),
    refundCaseId: z.string().uuid(),
    approvedAmountCents: z.number().int().min(1),
  }),
  z.object({
    action: z.literal('deny_refund'),
    refundCaseId: z.string().uuid(),
    reason: z.string().min(3).max(500),
  }),
  z.object({
    action: z.literal('process_refund'),
    refundCaseId: z.string().uuid(),
    stripeRefundId: z.string().min(3).max(255),
  }),
  z.object({
    action: z.literal('create_payout_hold'),
    payeeType: z.enum(['chef', 'driver']),
    payeeId: z.string().uuid(),
    orderId: z.string().uuid(),
    amountCents: z.number().int().min(1),
    reason: z.string().min(3).max(500),
  }),
  z.object({
    action: z.literal('release_payout_hold'),
    adjustmentId: z.string().uuid(),
  }),
]);

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;
export type PlatformSettingsUpdateInput = z.infer<typeof platformSettingsUpdateSchema>;
export type DeliveryInterventionActionInput = z.infer<typeof deliveryInterventionActionSchema>;
export type FinanceActionInput = z.infer<typeof financeActionSchema>;
