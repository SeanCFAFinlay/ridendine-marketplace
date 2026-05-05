import { describe, expect, it } from 'vitest';
import {
  deliveryInterventionActionSchema,
  financeActionSchema,
  opsCommandSchema,
  platformSettingsUpdateSchema,
} from '@ridendine/validation';

describe('ops control plane validation', () => {
  it('accepts a valid platform rules payload', () => {
    const parsed = platformSettingsUpdateSchema.safeParse({
      platformFeePercent: 15,
      serviceFeePercent: 8,
      hstRate: 13,
      minOrderAmount: 10,
      dispatchRadiusKm: 8,
      maxDeliveryDistanceKm: 12,
      defaultPrepTimeMinutes: 25,
      offerTimeoutSeconds: 60,
      maxAssignmentAttempts: 5,
      autoAssignEnabled: true,
      refundAutoReviewThresholdCents: 2500,
      supportSlaWarningMinutes: 15,
      supportSlaBreachMinutes: 60,
      storefrontThrottleOrderLimit: 0,
      storefrontThrottleWindowMinutes: 30,
      storefrontAutoPauseEnabled: false,
      storefrontPauseOnSlaBreach: true,
    });

    expect(parsed.success).toBe(true);
  });

  it('rejects invalid ordering for dispatch radius and SLA thresholds', () => {
    const parsed = platformSettingsUpdateSchema.safeParse({
      platformFeePercent: 15,
      serviceFeePercent: 8,
      hstRate: 13,
      minOrderAmount: 10,
      dispatchRadiusKm: 15,
      maxDeliveryDistanceKm: 10,
      defaultPrepTimeMinutes: 25,
      offerTimeoutSeconds: 60,
      maxAssignmentAttempts: 5,
      autoAssignEnabled: true,
      refundAutoReviewThresholdCents: 2500,
      supportSlaWarningMinutes: 30,
      supportSlaBreachMinutes: 15,
      storefrontThrottleOrderLimit: 0,
      storefrontThrottleWindowMinutes: 30,
      storefrontAutoPauseEnabled: false,
      storefrontPauseOnSlaBreach: true,
    });

    expect(parsed.success).toBe(false);
  });

  it('accepts supported intervention and finance actions', () => {
    expect(
      deliveryInterventionActionSchema.safeParse({
        action: 'manual_assign',
        deliveryId: '123e4567-e89b-12d3-a456-426614174000',
        driverId: '123e4567-e89b-12d3-a456-426614174001',
      }).success
    ).toBe(true);

    expect(
      financeActionSchema.safeParse({
        action: 'approve_refund',
        refundCaseId: '123e4567-e89b-12d3-a456-426614174002',
        approvedAmountCents: 2500,
      }).success
    ).toBe(true);
  });

  it('requires typed bank payout references for paid and reconciled states', () => {
    expect(
      opsCommandSchema.safeParse({
        action: 'mark_bank_paid',
        payeeType: 'chef',
        payoutId: '123e4567-e89b-12d3-a456-426614174003',
      }).success
    ).toBe(false);

    expect(
      opsCommandSchema.safeParse({
        action: 'mark_bank_paid',
        payeeType: 'chef',
        payoutId: '123e4567-e89b-12d3-a456-426614174003',
        bankReference: 'BANK-REF-100',
      }).success
    ).toBe(true);
  });

  it('routes refund processing as an engine command without route-supplied Stripe ids', () => {
    expect(
      opsCommandSchema.safeParse({
        action: 'process_refund',
        refundCaseId: '123e4567-e89b-12d3-a456-426614174004',
      }).success
    ).toBe(true);

    expect(
      opsCommandSchema.safeParse({
        action: 'process_refund',
        refundCaseId: '123e4567-e89b-12d3-a456-426614174004',
        stripeRefundId: 'route_supplied_refund_id',
      }).success
    ).toBe(false);
  });
});
