import { describe, expect, it } from 'vitest';
import {
  chefStorefrontOrdersChannel,
  customerNotificationsChannel,
  deliveryTrackingChannelLegacy,
  entityDeliveryChannel,
  opsAlertsChannel,
  opsLiveMapChannel,
  opsOrdersChannel,
  orderChannel,
  postgresTableChannelId,
} from './channels';

describe('realtime channel builders', () => {
  it('builds order-scoped channel', () => {
    expect(orderChannel('ord_1')).toBe('order:ord_1');
  });

  it('builds chef storefront channel', () => {
    expect(chefStorefrontOrdersChannel('sf_9')).toBe('chef:sf_9:orders');
  });

  it('separates ops orders from ops alerts', () => {
    expect(opsOrdersChannel()).toBe('ops:orders');
    expect(opsAlertsChannel()).toBe('ops:alerts');
    expect(opsOrdersChannel()).not.toBe(opsAlertsChannel());
  });

  it('builds stable postgres channel ids for the same inputs', () => {
    expect(postgresTableChannelId('public', 'orders', 'INSERT')).toBe(
      postgresTableChannelId('public', 'orders', 'INSERT')
    );
    expect(postgresTableChannelId('public', 'orders', '*', 'storefront_id=eq.x')).toContain(
      'storefront_id%3Deq.x'
    );
  });

  it('keeps customer delivery channels distinct from ops', () => {
    expect(deliveryTrackingChannelLegacy('d1')).toBe('tracking:d1');
    expect(entityDeliveryChannel('d1')).toBe('entity:delivery:d1');
    expect(deliveryTrackingChannelLegacy('d1')).not.toContain('ops:');
  });

  it('scopes customer notifications channel per user', () => {
    expect(customerNotificationsChannel('u1')).toBe('customer:u1:notifications');
    expect(customerNotificationsChannel('u1')).not.toBe(customerNotificationsChannel('u2'));
  });

  it('uses dedicated ops map channel', () => {
    expect(opsLiveMapChannel()).toBe('ops:map:presence');
  });
});
