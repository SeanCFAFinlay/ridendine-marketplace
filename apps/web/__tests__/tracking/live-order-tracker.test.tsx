/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';

const mockUseOrderStream = jest.fn();

jest.mock('@/lib/orders/use-order-stream', () => ({
  useOrderStream: (...args: unknown[]) => mockUseOrderStream(...args),
}));

jest.mock('next/dynamic', () => ({
  __esModule: true,
  default: () => {
    function Dyn(props: Record<string, unknown>) {
      return (
        <div data-testid="order-tracking-map">
          <span data-testid="map-prop-keys">{Object.keys(props).sort().join(',')}</span>
        </div>
      );
    }
    return Dyn;
  },
}));

jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  ),
}));

import { LiveOrderTracker } from '../../src/components/tracking/live-order-tracker';

const streamBase = {
  stage: null as string | null,
  etaPickupAt: null as string | null,
  etaDropoffAt: null as string | null,
  progressPct: null as number | null,
  remainingSeconds: null as number | null,
  routePolyline: null as string | null,
  legacyStatus: null as string | null,
  isLive: true,
  error: null as string | null,
  refresh: jest.fn(),
};

const defaultProps = {
  orderId: 'order-123',
  orderNumber: 'RD-001',
  initialStatus: 'pending',
  initialPublicStage: 'placed' as string | null,
  deliveryId: 'delivery-456' as string | null,
  pickupAddress: '123 Chef St',
  dropoffAddress: '456 Customer Ave',
  estimatedDeliveryMinutes: 30,
  storefrontName: "Chef Mario's Kitchen",
};

beforeEach(() => {
  mockUseOrderStream.mockImplementation(() => ({ ...streamBase }));
});

describe('LiveOrderTracker', () => {
  it('renders order number and storefront name', () => {
    render(<LiveOrderTracker {...defaultProps} />);
    expect(screen.getByText(/RD-001/)).toBeInTheDocument();
    expect(screen.getByText(/Chef Mario's Kitchen/)).toBeInTheDocument();
  });

  it('does not pass driverLocation to map (polyline-based props only)', () => {
    mockUseOrderStream.mockImplementation(() => ({
      ...streamBase,
      stage: 'on_the_way',
      progressPct: 40,
      routePolyline: 'abc',
      etaDropoffAt: '2026-12-01T15:00:00.000Z',
    }));
    render(<LiveOrderTracker {...defaultProps} initialPublicStage="on_the_way" />);
    const keys = screen.getByTestId('map-prop-keys').textContent ?? '';
    expect(keys).not.toContain('driverLocation');
    expect(keys).toContain('polyline');
    expect(keys).toContain('progressPct');
    expect(keys).toContain('etaDropoffAt');
  });

  it('shows four-stage labels for public flow', () => {
    render(<LiveOrderTracker {...defaultProps} />);
    expect(screen.getAllByText('Order placed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Preparing').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('On the way').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Delivered').length).toBeGreaterThanOrEqual(1);
  });

  it('shows cancelled terminal copy', () => {
    mockUseOrderStream.mockImplementation(() => ({
      ...streamBase,
      stage: 'cancelled',
    }));
    render(<LiveOrderTracker {...defaultProps} initialPublicStage="cancelled" />);
    expect(screen.getByText('This order was cancelled.')).toBeInTheDocument();
  });
});
