// ==========================================
// ORDER STATE MACHINE TESTS
// Validates transition rules, terminal states, and validation functions
// ==========================================

import { describe, expect, it } from 'vitest';
import { CanonicalPayoutStatus, EngineOrderStatus, EngineDeliveryStatus } from '@ridendine/types';
import {
  isValidOrderTransition,
  isValidDeliveryTransition,
  assertValidOrderTransition,
  assertValidDeliveryTransition,
  isTerminalOrderStatus,
  isTerminalDeliveryStatus,
  ALLOWED_ORDER_TRANSITIONS,
  ALLOWED_DELIVERY_TRANSITIONS,
  InvalidTransitionError,
  isValidPayoutTransition,
  assertValidPayoutTransition,
  isTerminalPayoutStatus,
  ALLOWED_PAYOUT_TRANSITIONS,
} from './order-state-machine';

describe('Order State Machine', () => {
  describe('isValidOrderTransition', () => {
    it('allows valid full order lifecycle', () => {
      const lifecycle = [
        [EngineOrderStatus.DRAFT, EngineOrderStatus.CHECKOUT_PENDING],
        [EngineOrderStatus.CHECKOUT_PENDING, EngineOrderStatus.PAYMENT_AUTHORIZED],
        [EngineOrderStatus.PAYMENT_AUTHORIZED, EngineOrderStatus.PENDING],
        [EngineOrderStatus.PENDING, EngineOrderStatus.ACCEPTED],
        [EngineOrderStatus.ACCEPTED, EngineOrderStatus.PREPARING],
        [EngineOrderStatus.PREPARING, EngineOrderStatus.READY],
        [EngineOrderStatus.READY, EngineOrderStatus.DISPATCH_PENDING],
        [EngineOrderStatus.DISPATCH_PENDING, EngineOrderStatus.DRIVER_OFFERED],
        [EngineOrderStatus.DRIVER_OFFERED, EngineOrderStatus.DRIVER_ASSIGNED],
        [EngineOrderStatus.DRIVER_ASSIGNED, EngineOrderStatus.DRIVER_EN_ROUTE_PICKUP],
        [EngineOrderStatus.DRIVER_EN_ROUTE_PICKUP, EngineOrderStatus.PICKED_UP],
        [EngineOrderStatus.PICKED_UP, EngineOrderStatus.DRIVER_EN_ROUTE_DROPOFF],
        [EngineOrderStatus.DRIVER_EN_ROUTE_DROPOFF, EngineOrderStatus.DELIVERED],
        [EngineOrderStatus.DELIVERED, EngineOrderStatus.COMPLETED],
      ];

      for (const [from, to] of lifecycle) {
        expect(isValidOrderTransition(from, to)).toBe(true);
      }
    });

    it('rejects invalid direct transition PENDING_PAYMENT -> PREPARING', () => {
      expect(isValidOrderTransition(
        EngineOrderStatus.CHECKOUT_PENDING,
        EngineOrderStatus.PREPARING
      )).toBe(false);
    });

    it('rejects skip transition DRAFT -> ACCEPTED', () => {
      expect(isValidOrderTransition(
        EngineOrderStatus.DRAFT,
        EngineOrderStatus.ACCEPTED
      )).toBe(false);
    });

    it('allows COMPLETED -> REFUNDED', () => {
      expect(isValidOrderTransition(
        EngineOrderStatus.COMPLETED,
        EngineOrderStatus.REFUNDED
      )).toBe(true);
    });

    it('allows CANCELLED -> REFUNDED', () => {
      expect(isValidOrderTransition(
        EngineOrderStatus.CANCELLED,
        EngineOrderStatus.REFUNDED
      )).toBe(true);
    });

    it('allows DRIVER_OFFERED -> DISPATCH_PENDING (driver declined)', () => {
      expect(isValidOrderTransition(
        EngineOrderStatus.DRIVER_OFFERED,
        EngineOrderStatus.DISPATCH_PENDING
      )).toBe(true);
    });
  });

  describe('terminal state protection', () => {
    it('COMPLETED -> PREPARING must fail', () => {
      expect(isValidOrderTransition(
        EngineOrderStatus.COMPLETED,
        EngineOrderStatus.PREPARING
      )).toBe(false);
    });

    it('CANCELLED -> PREPARING must fail', () => {
      expect(isValidOrderTransition(
        EngineOrderStatus.CANCELLED,
        EngineOrderStatus.PREPARING
      )).toBe(false);
    });

    it('REFUNDED -> any non-terminal must fail', () => {
      const nonTerminals = [
        EngineOrderStatus.DRAFT,
        EngineOrderStatus.PENDING,
        EngineOrderStatus.ACCEPTED,
        EngineOrderStatus.PREPARING,
        EngineOrderStatus.READY,
        EngineOrderStatus.DISPATCH_PENDING,
        EngineOrderStatus.DELIVERED,
      ];
      for (const status of nonTerminals) {
        expect(isValidOrderTransition(EngineOrderStatus.REFUNDED, status)).toBe(false);
      }
    });

    it('FAILED -> any non-terminal must fail', () => {
      expect(isValidOrderTransition(EngineOrderStatus.FAILED, EngineOrderStatus.PENDING)).toBe(false);
      expect(isValidOrderTransition(EngineOrderStatus.FAILED, EngineOrderStatus.PREPARING)).toBe(false);
    });
  });

  describe('isTerminalOrderStatus', () => {
    it('correctly identifies terminal statuses', () => {
      expect(isTerminalOrderStatus(EngineOrderStatus.COMPLETED)).toBe(true);
      expect(isTerminalOrderStatus(EngineOrderStatus.CANCELLED)).toBe(true);
      expect(isTerminalOrderStatus(EngineOrderStatus.REFUNDED)).toBe(true);
      expect(isTerminalOrderStatus(EngineOrderStatus.FAILED)).toBe(true);
    });

    it('correctly identifies non-terminal statuses', () => {
      expect(isTerminalOrderStatus(EngineOrderStatus.DRAFT)).toBe(false);
      expect(isTerminalOrderStatus(EngineOrderStatus.PENDING)).toBe(false);
      expect(isTerminalOrderStatus(EngineOrderStatus.PREPARING)).toBe(false);
      expect(isTerminalOrderStatus(EngineOrderStatus.DELIVERED)).toBe(false);
    });
  });

  describe('assertValidOrderTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => assertValidOrderTransition(
        EngineOrderStatus.PENDING,
        EngineOrderStatus.ACCEPTED
      )).not.toThrow();
    });

    it('throws InvalidTransitionError for invalid transitions', () => {
      expect(() => assertValidOrderTransition(
        EngineOrderStatus.COMPLETED,
        EngineOrderStatus.PREPARING
      )).toThrow(InvalidTransitionError);
    });

    it('throws with correct from/to in error', () => {
      try {
        assertValidOrderTransition(EngineOrderStatus.FAILED, EngineOrderStatus.ACCEPTED);
        expect.fail('Should have thrown');
      } catch (e) {
        const err = e as InvalidTransitionError;
        expect(err.from).toBe(EngineOrderStatus.FAILED);
        expect(err.to).toBe(EngineOrderStatus.ACCEPTED);
        expect(err.entityType).toBe('order');
      }
    });
  });

  describe('ALLOWED_ORDER_TRANSITIONS', () => {
    it('contains all lifecycle transitions', () => {
      const has = (from: string, to: string) =>
        ALLOWED_ORDER_TRANSITIONS.some(t => t.from === from && t.to === to);

      expect(has(EngineOrderStatus.DRAFT, EngineOrderStatus.CHECKOUT_PENDING)).toBe(true);
      expect(has(EngineOrderStatus.DELIVERED, EngineOrderStatus.COMPLETED)).toBe(true);
    });

    it('does not contain invalid transitions', () => {
      const has = (from: string, to: string) =>
        ALLOWED_ORDER_TRANSITIONS.some(t => t.from === from && t.to === to);

      expect(has(EngineOrderStatus.COMPLETED, EngineOrderStatus.DRAFT)).toBe(false);
    });
  });
});

describe('Delivery State Machine', () => {
  describe('isValidDeliveryTransition', () => {
    it('allows valid full delivery lifecycle', () => {
      const lifecycle = [
        [EngineDeliveryStatus.UNASSIGNED, EngineDeliveryStatus.OFFERED],
        [EngineDeliveryStatus.OFFERED, EngineDeliveryStatus.ACCEPTED],
        [EngineDeliveryStatus.ACCEPTED, EngineDeliveryStatus.EN_ROUTE_TO_PICKUP],
        [EngineDeliveryStatus.EN_ROUTE_TO_PICKUP, EngineDeliveryStatus.ARRIVED_AT_PICKUP],
        [EngineDeliveryStatus.ARRIVED_AT_PICKUP, EngineDeliveryStatus.PICKED_UP],
        [EngineDeliveryStatus.PICKED_UP, EngineDeliveryStatus.EN_ROUTE_TO_CUSTOMER],
        [EngineDeliveryStatus.EN_ROUTE_TO_CUSTOMER, EngineDeliveryStatus.ARRIVED_AT_CUSTOMER],
        [EngineDeliveryStatus.ARRIVED_AT_CUSTOMER, EngineDeliveryStatus.DELIVERED],
      ];

      for (const [from, to] of lifecycle) {
        expect(isValidDeliveryTransition(from, to)).toBe(true);
      }
    });

    it('rejects invalid skip UNASSIGNED -> DELIVERED', () => {
      expect(isValidDeliveryTransition(
        EngineDeliveryStatus.UNASSIGNED,
        EngineDeliveryStatus.DELIVERED
      )).toBe(false);
    });

    it('allows OFFERED -> UNASSIGNED (driver declined)', () => {
      expect(isValidDeliveryTransition(
        EngineDeliveryStatus.OFFERED,
        EngineDeliveryStatus.UNASSIGNED
      )).toBe(true);
    });
  });

  describe('terminal delivery statuses', () => {
    it('DELIVERED cannot transition', () => {
      expect(isTerminalDeliveryStatus(EngineDeliveryStatus.DELIVERED)).toBe(true);
      expect(isValidDeliveryTransition(EngineDeliveryStatus.DELIVERED, EngineDeliveryStatus.UNASSIGNED)).toBe(false);
    });

    it('FAILED cannot transition', () => {
      expect(isTerminalDeliveryStatus(EngineDeliveryStatus.FAILED)).toBe(true);
    });

    it('CANCELLED cannot transition', () => {
      expect(isTerminalDeliveryStatus(EngineDeliveryStatus.CANCELLED)).toBe(true);
    });
  });

  describe('assertValidDeliveryTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => assertValidDeliveryTransition(
        EngineDeliveryStatus.UNASSIGNED,
        EngineDeliveryStatus.OFFERED
      )).not.toThrow();
    });

    it('throws for invalid transitions', () => {
      expect(() => assertValidDeliveryTransition(
        EngineDeliveryStatus.DELIVERED,
        EngineDeliveryStatus.PICKED_UP
      )).toThrow(InvalidTransitionError);
    });
  });
});

describe('Payout State Machine', () => {
  describe('isValidPayoutTransition', () => {
    it('allows valid full lifecycle: NOT_ELIGIBLE -> ELIGIBLE -> PENDING -> PROCESSING -> PAID', () => {
      const lifecycle = [
        [CanonicalPayoutStatus.NOT_ELIGIBLE, CanonicalPayoutStatus.ELIGIBLE],
        [CanonicalPayoutStatus.ELIGIBLE, CanonicalPayoutStatus.PENDING],
        [CanonicalPayoutStatus.PENDING, CanonicalPayoutStatus.PROCESSING],
        [CanonicalPayoutStatus.PROCESSING, CanonicalPayoutStatus.PAID],
      ];

      for (const [from, to] of lifecycle) {
        expect(isValidPayoutTransition(from, to)).toBe(true);
      }
    });

    it('FAILED can retry to PENDING', () => {
      expect(isValidPayoutTransition(
        CanonicalPayoutStatus.FAILED,
        CanonicalPayoutStatus.PENDING
      )).toBe(true);
    });

    it('HELD can release to PENDING', () => {
      expect(isValidPayoutTransition(
        CanonicalPayoutStatus.HELD,
        CanonicalPayoutStatus.PENDING
      )).toBe(true);
    });

    it('rejects invalid skip NOT_ELIGIBLE -> PAID', () => {
      expect(isValidPayoutTransition(
        CanonicalPayoutStatus.NOT_ELIGIBLE,
        CanonicalPayoutStatus.PAID
      )).toBe(false);
    });

    it('rejects unknown from status', () => {
      expect(isValidPayoutTransition('unknown_status', CanonicalPayoutStatus.PAID)).toBe(false);
    });
  });

  describe('terminal payout status', () => {
    it('PAID is terminal', () => {
      expect(isTerminalPayoutStatus(CanonicalPayoutStatus.PAID)).toBe(true);
    });

    it('PAID cannot transition further', () => {
      const allStatuses = Object.values(CanonicalPayoutStatus);
      for (const status of allStatuses) {
        expect(isValidPayoutTransition(CanonicalPayoutStatus.PAID, status)).toBe(false);
      }
    });

    it('non-terminal statuses are not terminal', () => {
      expect(isTerminalPayoutStatus(CanonicalPayoutStatus.PENDING)).toBe(false);
      expect(isTerminalPayoutStatus(CanonicalPayoutStatus.PROCESSING)).toBe(false);
      expect(isTerminalPayoutStatus(CanonicalPayoutStatus.FAILED)).toBe(false);
      expect(isTerminalPayoutStatus(CanonicalPayoutStatus.HELD)).toBe(false);
      expect(isTerminalPayoutStatus(CanonicalPayoutStatus.ELIGIBLE)).toBe(false);
    });
  });

  describe('assertValidPayoutTransition', () => {
    it('does not throw for valid transitions', () => {
      expect(() => assertValidPayoutTransition(
        CanonicalPayoutStatus.ELIGIBLE,
        CanonicalPayoutStatus.PENDING
      )).not.toThrow();
    });

    it('throws InvalidTransitionError for invalid transitions', () => {
      expect(() => assertValidPayoutTransition(
        CanonicalPayoutStatus.NOT_ELIGIBLE,
        CanonicalPayoutStatus.PAID
      )).toThrow(InvalidTransitionError);
    });

    it('throws with correct entity type payout', () => {
      try {
        assertValidPayoutTransition(CanonicalPayoutStatus.PAID, CanonicalPayoutStatus.PENDING);
        expect.fail('Should have thrown');
      } catch (e) {
        const err = e as InvalidTransitionError;
        expect(err.entityType).toBe('payout');
        expect(err.from).toBe(CanonicalPayoutStatus.PAID);
        expect(err.to).toBe(CanonicalPayoutStatus.PENDING);
      }
    });
  });

  describe('ALLOWED_PAYOUT_TRANSITIONS', () => {
    it('contains valid transitions', () => {
      const has = (from: string, to: string) =>
        ALLOWED_PAYOUT_TRANSITIONS.some(t => t.from === from && t.to === to);

      expect(has(CanonicalPayoutStatus.NOT_ELIGIBLE, CanonicalPayoutStatus.ELIGIBLE)).toBe(true);
      expect(has(CanonicalPayoutStatus.PROCESSING, CanonicalPayoutStatus.PAID)).toBe(true);
      expect(has(CanonicalPayoutStatus.FAILED, CanonicalPayoutStatus.PENDING)).toBe(true);
    });

    it('does not contain invalid transitions', () => {
      const has = (from: string, to: string) =>
        ALLOWED_PAYOUT_TRANSITIONS.some(t => t.from === from && t.to === to);

      expect(has(CanonicalPayoutStatus.PAID, CanonicalPayoutStatus.PENDING)).toBe(false);
      expect(has(CanonicalPayoutStatus.NOT_ELIGIBLE, CanonicalPayoutStatus.PAID)).toBe(false);
    });
  });
});
