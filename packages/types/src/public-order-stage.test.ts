import { describe, expect, it } from 'vitest';
import { mapEngineStatusToPublicStage, PublicOrderStage } from './public-order-stage';

describe('mapEngineStatusToPublicStage', () => {
  it('maps kitchen and dispatch pre-pickup to cooking', () => {
    expect(mapEngineStatusToPublicStage('accepted')).toBe(PublicOrderStage.COOKING);
    expect(mapEngineStatusToPublicStage('preparing')).toBe(PublicOrderStage.COOKING);
    expect(mapEngineStatusToPublicStage('driver_assigned')).toBe(PublicOrderStage.COOKING);
  });

  it('maps in-transit engine statuses to on_the_way', () => {
    expect(mapEngineStatusToPublicStage('picked_up')).toBe(PublicOrderStage.ON_THE_WAY);
    expect(mapEngineStatusToPublicStage('driver_en_route_dropoff')).toBe(PublicOrderStage.ON_THE_WAY);
  });

  it('maps refund engine statuses to refunded', () => {
    expect(mapEngineStatusToPublicStage('refund_pending')).toBe(PublicOrderStage.REFUNDED);
    expect(mapEngineStatusToPublicStage('partially_refunded')).toBe(PublicOrderStage.REFUNDED);
  });

  it('defaults unknown engine_status to placed (matches SQL ELSE)', () => {
    expect(mapEngineStatusToPublicStage('legacy_unknown_status')).toBe(PublicOrderStage.PLACED);
    expect(mapEngineStatusToPublicStage(null)).toBe(PublicOrderStage.PLACED);
  });
});

describe('legacy orders.status independence', () => {
  it('public stage mapping does not read or mutate legacy OrderStatus strings', () => {
    // Contract: engine_status drives public_stage; orders.status is a separate legacy column.
    expect(mapEngineStatusToPublicStage('accepted')).toBe(PublicOrderStage.COOKING);
    // Legacy UI might still show orders.status === 'pending' while engine is accepted — that is OK for Phase 0.
    expect(mapEngineStatusToPublicStage('pending')).toBe(PublicOrderStage.PLACED);
  });
});
