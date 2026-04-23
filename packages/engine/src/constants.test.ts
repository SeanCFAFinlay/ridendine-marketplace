import { describe, expect, it } from 'vitest';
import {
  PLATFORM_FEE_PERCENT,
  SERVICE_FEE_PERCENT,
  HST_RATE,
  BASE_DELIVERY_FEE,
  DRIVER_PAYOUT_PERCENT,
  ORDER_STATUS,
  VALID_ORDER_TRANSITIONS,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_COLORS,
  PAYMENT_STATUS,
  DELIVERY_STATUS,
} from './constants';

describe('Fee constants', () => {
  it('has PLATFORM_FEE_PERCENT of 15', () => {
    expect(PLATFORM_FEE_PERCENT).toBe(15);
  });

  it('has SERVICE_FEE_PERCENT of 8', () => {
    expect(SERVICE_FEE_PERCENT).toBe(8);
  });

  it('has HST_RATE of 13', () => {
    expect(HST_RATE).toBe(13);
  });

  it('has BASE_DELIVERY_FEE of 500 cents ($5.00)', () => {
    expect(BASE_DELIVERY_FEE).toBe(500);
  });

  it('has DRIVER_PAYOUT_PERCENT of 80', () => {
    expect(DRIVER_PAYOUT_PERCENT).toBe(80);
  });
});

describe('ORDER_STATUS', () => {
  it('has all expected statuses', () => {
    expect(ORDER_STATUS.PENDING).toBe('pending');
    expect(ORDER_STATUS.ACCEPTED).toBe('accepted');
    expect(ORDER_STATUS.REJECTED).toBe('rejected');
    expect(ORDER_STATUS.PREPARING).toBe('preparing');
    expect(ORDER_STATUS.READY_FOR_PICKUP).toBe('ready_for_pickup');
    expect(ORDER_STATUS.PICKED_UP).toBe('picked_up');
    expect(ORDER_STATUS.IN_TRANSIT).toBe('in_transit');
    expect(ORDER_STATUS.DELIVERED).toBe('delivered');
    expect(ORDER_STATUS.COMPLETED).toBe('completed');
    expect(ORDER_STATUS.CANCELLED).toBe('cancelled');
    expect(ORDER_STATUS.REFUNDED).toBe('refunded');
  });

  it('has exactly 11 statuses', () => {
    expect(Object.keys(ORDER_STATUS)).toHaveLength(11);
  });
});

describe('VALID_ORDER_TRANSITIONS', () => {
  it('allows pending → accepted', () => {
    expect(VALID_ORDER_TRANSITIONS.pending).toContain('accepted');
  });

  it('allows pending → rejected', () => {
    expect(VALID_ORDER_TRANSITIONS.pending).toContain('rejected');
  });

  it('allows pending → cancelled', () => {
    expect(VALID_ORDER_TRANSITIONS.pending).toContain('cancelled');
  });

  it('allows accepted → preparing', () => {
    expect(VALID_ORDER_TRANSITIONS.accepted).toContain('preparing');
  });

  it('allows accepted → cancelled', () => {
    expect(VALID_ORDER_TRANSITIONS.accepted).toContain('cancelled');
  });

  it('allows preparing → ready_for_pickup', () => {
    expect(VALID_ORDER_TRANSITIONS.preparing).toContain('ready_for_pickup');
  });

  it('allows ready_for_pickup → picked_up', () => {
    expect(VALID_ORDER_TRANSITIONS.ready_for_pickup).toContain('picked_up');
  });

  it('allows picked_up → in_transit', () => {
    expect(VALID_ORDER_TRANSITIONS.picked_up).toContain('in_transit');
  });

  it('allows in_transit → delivered', () => {
    expect(VALID_ORDER_TRANSITIONS.in_transit).toContain('delivered');
  });

  it('allows delivered → completed', () => {
    expect(VALID_ORDER_TRANSITIONS.delivered).toContain('completed');
  });

  it('allows completed → refunded', () => {
    expect(VALID_ORDER_TRANSITIONS.completed).toContain('refunded');
  });

  it('has no transitions from rejected (terminal)', () => {
    expect(VALID_ORDER_TRANSITIONS.rejected).toHaveLength(0);
  });

  it('has no transitions from cancelled (terminal)', () => {
    expect(VALID_ORDER_TRANSITIONS.cancelled).toHaveLength(0);
  });

  it('has no transitions from refunded (terminal)', () => {
    expect(VALID_ORDER_TRANSITIONS.refunded).toHaveLength(0);
  });

  it('does not allow backward transitions (accepted → pending)', () => {
    expect(VALID_ORDER_TRANSITIONS.accepted).not.toContain('pending');
  });

  it('has entries for all order statuses', () => {
    const allStatuses = Object.values(ORDER_STATUS);
    for (const status of allStatuses) {
      expect(VALID_ORDER_TRANSITIONS).toHaveProperty(status);
    }
  });
});

describe('ORDER_STATUS_LABELS', () => {
  it('has a label for every order status', () => {
    const allStatuses = Object.values(ORDER_STATUS);
    for (const status of allStatuses) {
      expect(ORDER_STATUS_LABELS).toHaveProperty(status);
      expect(typeof ORDER_STATUS_LABELS[status]).toBe('string');
      expect(ORDER_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
  });

  it('has human-readable labels', () => {
    expect(ORDER_STATUS_LABELS.pending).toBe('Pending');
    expect(ORDER_STATUS_LABELS.accepted).toBe('Accepted');
    expect(ORDER_STATUS_LABELS.ready_for_pickup).toBe('Ready for Pickup');
    expect(ORDER_STATUS_LABELS.in_transit).toBe('In Transit');
    expect(ORDER_STATUS_LABELS.completed).toBe('Completed');
  });
});

describe('ORDER_STATUS_COLORS', () => {
  it('has a color for every order status', () => {
    const allStatuses = Object.values(ORDER_STATUS);
    for (const status of allStatuses) {
      expect(ORDER_STATUS_COLORS).toHaveProperty(status);
      expect(typeof ORDER_STATUS_COLORS[status]).toBe('string');
      expect(ORDER_STATUS_COLORS[status].length).toBeGreaterThan(0);
    }
  });

  it('uses yellow for pending (attention needed)', () => {
    expect(ORDER_STATUS_COLORS.pending).toBe('yellow');
  });

  it('uses green for terminal success statuses', () => {
    expect(ORDER_STATUS_COLORS.delivered).toBe('green');
    expect(ORDER_STATUS_COLORS.completed).toBe('green');
  });

  it('uses red for failure/rejection statuses', () => {
    expect(ORDER_STATUS_COLORS.rejected).toBe('red');
    expect(ORDER_STATUS_COLORS.cancelled).toBe('red');
  });
});

describe('PAYMENT_STATUS', () => {
  it('has all expected payment statuses', () => {
    expect(PAYMENT_STATUS.PENDING).toBe('pending');
    expect(PAYMENT_STATUS.PROCESSING).toBe('processing');
    expect(PAYMENT_STATUS.COMPLETED).toBe('completed');
    expect(PAYMENT_STATUS.FAILED).toBe('failed');
    expect(PAYMENT_STATUS.REFUNDED).toBe('refunded');
  });
});

describe('DELIVERY_STATUS', () => {
  it('has pending and delivered statuses', () => {
    expect(DELIVERY_STATUS.PENDING).toBe('pending');
    expect(DELIVERY_STATUS.DELIVERED).toBe('delivered');
    expect(DELIVERY_STATUS.COMPLETED).toBe('completed');
    expect(DELIVERY_STATUS.CANCELLED).toBe('cancelled');
  });

  it('has pickup-related statuses', () => {
    expect(DELIVERY_STATUS.ASSIGNED).toBe('assigned');
    expect(DELIVERY_STATUS.PICKED_UP).toBe('picked_up');
    expect(DELIVERY_STATUS.EN_ROUTE_TO_PICKUP).toBe('en_route_to_pickup');
    expect(DELIVERY_STATUS.ARRIVED_AT_PICKUP).toBe('arrived_at_pickup');
  });
});
