import { z } from 'zod';

const uuid = z.string().uuid();
const requiredReason = z.string().min(3).max(500);
const requiredNote = z.string().min(3).max(2000);

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
    action: z.literal('force_assign'),
    deliveryId: z.string().uuid(),
    driverId: z.string().uuid(),
    reason: z.string().min(3).max(500),
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
    refundCaseId: uuid,
    approvedAmountCents: z.number().int().min(1),
  }).strict(),
  z.object({
    action: z.literal('deny_refund'),
    refundCaseId: uuid,
    reason: requiredReason,
  }).strict(),
  z.object({
    action: z.literal('process_refund'),
    refundCaseId: uuid,
  }).strict(),
  z.object({
    action: z.literal('create_payout_hold'),
    payeeType: z.enum(['chef', 'driver']),
    payeeId: uuid,
    orderId: uuid,
    amountCents: z.number().int().min(1),
    reason: requiredReason,
  }).strict(),
  z.object({
    action: z.literal('release_payout_hold'),
    adjustmentId: uuid,
  }).strict(),
]);

export const refundCommandSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('request_refund'),
    orderId: uuid,
    amountCents: z.coerce.number().int().min(1),
    reason: z.enum([
      'customer_requested',
      'order_cancelled',
      'missing_items',
      'wrong_order',
      'quality_issue',
      'late_delivery',
      'never_delivered',
      'damaged_order',
      'fraudulent',
      'duplicate_charge',
      'ops_goodwill',
    ]),
    notes: z.string().max(2000).optional(),
  }).strict(),
  ...financeActionSchema.options,
]);

export const bankPayoutCommandSchema = z.union([
  z.object({
    action: z.literal('schedule_chef_payout'),
    chefId: uuid,
    storefrontId: uuid,
    amountCents: z.coerce.number().int().min(1),
  }).strict(),
  z.object({
    action: z.literal('execute_chef_run'),
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional(),
  }).strict(),
  z.object({
    action: z.literal('execute_driver_run'),
    periodStart: z.string().datetime().optional(),
    periodEnd: z.string().datetime().optional(),
  }).strict(),
  z.object({
    action: z.literal('approve_bank_payout'),
    payeeType: z.enum(['chef', 'driver']).default('chef'),
    payoutId: uuid,
  }).strict(),
  z.object({
    action: z.literal('export_bank_batch'),
    payeeType: z.enum(['chef', 'driver']).default('chef'),
    payoutId: uuid.optional(),
    payoutIds: z.array(uuid).optional(),
    bankBatchId: z.string().min(3).max(120).optional(),
  }).strict().refine((input) => Boolean(input.payoutId || input.payoutIds?.length), {
    message: 'At least one payout id is required',
    path: ['payoutIds'],
  }),
  z.object({
    action: z.literal('mark_bank_submitted'),
    payeeType: z.enum(['chef', 'driver']).default('chef'),
    payoutId: uuid,
    bankReference: z.string().min(3).max(120).optional(),
  }).strict(),
  z.object({
    action: z.literal('mark_bank_paid'),
    payeeType: z.enum(['chef', 'driver']).default('chef'),
    payoutId: uuid,
    bankReference: z.string().min(3).max(120),
  }).strict(),
  z.object({
    action: z.literal('reconcile_bank_payout'),
    payeeType: z.enum(['chef', 'driver']).default('chef'),
    payoutId: uuid,
    bankReference: z.string().min(3).max(120),
  }).strict(),
]);

export const dashboardCommandSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('acknowledge_alert'),
    alertId: uuid,
  }).strict(),
  z.object({
    action: z.literal('process_expired_offers'),
  }).strict(),
  z.object({
    action: z.literal('process_sla_timers'),
  }).strict(),
]);

export const maintenanceCommandSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('activate_maintenance'),
    message: requiredReason.optional(),
  }).strict(),
  z.object({
    action: z.literal('deactivate_maintenance'),
  }).strict(),
]);

export const automationRuleCommandSchema = z.object({
  action: z.literal('update_automation_rule'),
  ruleId: z.string().min(3).max(120),
  enabled: z.boolean().optional(),
  params: z.record(z.unknown()).optional(),
}).strict().refine((input) => input.enabled !== undefined || input.params !== undefined, {
  message: 'enabled or params is required',
});

export const exceptionCommandSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('create_exception'),
    type: z.string().min(3).max(80),
    severity: z.string().min(3).max(40),
    orderId: uuid.optional(),
    customerId: uuid.optional(),
    chefId: uuid.optional(),
    driverId: uuid.optional(),
    deliveryId: uuid.optional(),
    title: z.string().min(3).max(160),
    description: requiredReason,
    recommendedActions: z.array(z.string().min(1).max(160)).optional(),
    slaMinutes: z.number().int().min(1).max(10080).optional(),
  }).strict(),
  z.object({
    action: z.literal('create_exception_from_ticket'),
    ticketId: uuid,
    exceptionType: z.string().min(3).max(80),
    severity: z.string().min(3).max(40),
  }).strict(),
  z.object({
    action: z.literal('acknowledge_exception'),
    exceptionId: uuid,
  }).strict(),
  z.object({
    action: z.literal('update_exception_status'),
    exceptionId: uuid,
    status: z.string().min(3).max(40),
    notes: z.string().max(2000).optional(),
  }).strict(),
  z.object({
    action: z.literal('escalate_exception'),
    exceptionId: uuid,
    reason: requiredReason,
  }).strict(),
  z.object({
    action: z.literal('resolve_exception'),
    exceptionId: uuid,
    resolution: requiredReason,
    linkedRefundId: uuid.optional(),
    linkedPayoutAdjustmentId: uuid.optional(),
  }).strict(),
  z.object({
    action: z.literal('add_exception_note'),
    exceptionId: uuid,
    content: requiredNote,
    isInternal: z.boolean().default(true),
  }).strict(),
]);

export const orderCommandSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('accept_order'),
    orderId: uuid,
    estimatedPrepMinutes: z.coerce.number().int().min(5).max(180).default(20),
  }).strict(),
  z.object({
    action: z.literal('reject_order'),
    orderId: uuid,
    reason: requiredReason,
    notes: z.string().max(2000).optional(),
  }).strict(),
  z.object({
    action: z.literal('start_preparing_order'),
    orderId: uuid,
  }).strict(),
  z.object({
    action: z.literal('mark_order_ready'),
    orderId: uuid,
  }).strict(),
  z.object({
    action: z.literal('cancel_order'),
    orderId: uuid,
    reason: requiredReason,
    notes: z.string().max(2000).optional(),
  }).strict(),
  z.object({
    action: z.literal('complete_order'),
    orderId: uuid,
  }).strict(),
  z.object({
    action: z.literal('override_order_status'),
    orderId: uuid,
    targetStatus: z.string().min(3).max(80),
    reason: requiredReason,
  }).strict(),
]);

export const opsCommandSchema = z.union([
  deliveryInterventionActionSchema,
  refundCommandSchema,
  bankPayoutCommandSchema,
  dashboardCommandSchema,
  maintenanceCommandSchema,
  automationRuleCommandSchema,
  exceptionCommandSchema,
  orderCommandSchema,
]);

// ==========================================
// OPS-ADMIN ROUTE SCHEMAS
// ==========================================

export const chefPatchSchema = z.object({
  action: z.enum(['approve', 'reject', 'suspend', 'unsuspend']).optional(),
  status: z.enum(['approved', 'rejected', 'suspended']).optional(),
  reason: z.string().optional(),
});

export const driverPatchSchema = z.object({
  status: z.string().min(1),
  reason: z.string().optional(),
});

export const opsDeliveryPatchSchema = z.object({
  driverId: z.string().uuid('driverId must be a valid UUID'),
});

export const refundSchema = z.object({
  amount: z.number().positive('Valid refund amount is required'),
  reason: z.string().optional(),
});

export const orderPatchSchema = z.object({
  status: z.string().optional(),
  action: z.string().optional(),
  reason: z.string().optional(),
  notes: z.string().optional(),
});

export const supportTicketSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  description: z.string().min(1, 'Description is required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  order_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  chef_id: z.string().uuid().optional(),
  driver_id: z.string().uuid().optional(),
}).passthrough();

export const supportPatchSchema = z.object({
  action: z.enum(['start_review', 'resolve']).optional(),
  status: z.string().optional(),
  assigned_to: z.string().optional(),
  resolution_notes: z.string().optional(),
}).passthrough();

export const supportRequestSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  category: z.enum(['general', 'order', 'technical', 'chef', 'other']).optional(),
});

export type PlatformSettingsInput = z.infer<typeof platformSettingsSchema>;
export type PlatformSettingsUpdateInput = z.infer<typeof platformSettingsUpdateSchema>;
export type DeliveryInterventionActionInput = z.infer<typeof deliveryInterventionActionSchema>;
export type FinanceActionInput = z.infer<typeof financeActionSchema>;
export type OpsCommandInput = z.infer<typeof opsCommandSchema>;
export type ChefPatchInput = z.infer<typeof chefPatchSchema>;
export type DriverPatchInput = z.infer<typeof driverPatchSchema>;
export type OpsDeliveryPatchInput = z.infer<typeof opsDeliveryPatchSchema>;
export type RefundInput = z.infer<typeof refundSchema>;
export type OrderPatchInput = z.infer<typeof orderPatchSchema>;
export type SupportTicketInput = z.infer<typeof supportTicketSchema>;
export type SupportPatchInput = z.infer<typeof supportPatchSchema>;
export type SupportRequestInput = z.infer<typeof supportRequestSchema>;
