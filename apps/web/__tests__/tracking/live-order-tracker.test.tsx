/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';

// --- Mocks ---

// Mock next/dynamic to render components synchronously in tests
jest.mock('next/dynamic', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (_fn: any, _opts: any) => {
    // Return the mocked OrderTrackingMap directly
    const MockMapWrapper = (props: any) => {
      const driverLocation = props?.driverLocation;
      return (
        <div data-testid="order-tracking-map">
          {driverLocation && (
            <span data-testid="driver-location">
              {driverLocation.lat},{driverLocation.lng}
            </span>
          )}
        </div>
      );
    };
    MockMapWrapper.displayName = 'DynamicComponent';
    return MockMapWrapper;
  };
});

// Mock the map component itself to avoid Leaflet DOM issues in JSDOM
jest.mock('../../src/components/tracking/order-tracking-map', () => {
  const MockMap = ({ driverLocation }: { driverLocation: { lat: number; lng: number } | null }) => (
    <div data-testid="order-tracking-map">
      {driverLocation && (
        <span data-testid="driver-location">
          {driverLocation.lat},{driverLocation.lng}
        </span>
      )}
    </div>
  );
  MockMap.displayName = 'OrderTrackingMap';
  return { default: MockMap };
});

// Channel mock helpers
type BroadcastCallback = (payload: unknown) => void;
interface MockChannel {
  on: jest.Mock;
  subscribe: jest.Mock;
  callbacks: Record<string, BroadcastCallback[]>;
}

const mockChannels: MockChannel[] = [];

const createMockChannel = (): MockChannel => {
  const channel: MockChannel = {
    callbacks: {},
    on: jest.fn(),
    subscribe: jest.fn(),
  };
  // Chain: channel.on(...).subscribe() works
  channel.on.mockImplementation((_type: string, opts: { event: string }, cb: BroadcastCallback) => {
    if (!channel.callbacks[opts.event]) channel.callbacks[opts.event] = [];
    channel.callbacks[opts.event].push(cb);
    return channel;
  });
  channel.subscribe.mockReturnValue(channel);
  mockChannels.push(channel);
  return channel;
};

const mockRemoveChannel = jest.fn();
const mockSupabase = {
  channel: jest.fn(() => createMockChannel()),
  removeChannel: mockRemoveChannel,
};

jest.mock('@ridendine/db', () => ({
  createBrowserClient: jest.fn(() => mockSupabase),
}));

// Mock @ridendine/ui
jest.mock('@ridendine/ui', () => ({
  Card: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="card" className={className}>{children}</div>
  ),
  Badge: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// --- Tests ---

import { LiveOrderTracker } from '../../src/components/tracking/live-order-tracker';

const defaultProps = {
  orderId: 'order-123',
  orderNumber: 'RD-001',
  initialStatus: 'pending',
  deliveryId: 'delivery-456',
  pickupAddress: '123 Chef St',
  dropoffAddress: '456 Customer Ave',
  estimatedDeliveryMinutes: 30,
  storefrontName: "Chef Mario's Kitchen",
};

beforeEach(() => {
  jest.useFakeTimers();
  mockChannels.length = 0;
  mockSupabase.channel.mockClear();
  mockRemoveChannel.mockClear();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('LiveOrderTracker', () => {
  it('renders order number and storefront name', () => {
    render(<LiveOrderTracker {...defaultProps} />);
    expect(screen.getByText(/RD-001/)).toBeInTheDocument();
    expect(screen.getByText(/Chef Mario's Kitchen/)).toBeInTheDocument();
  });

  it('renders step indicator with all status labels', () => {
    render(<LiveOrderTracker {...defaultProps} />);
    // Multiple elements with same text are fine - use getAllByText
    expect(screen.getAllByText('Confirmed').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Preparing')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
    expect(screen.getByText('Picked Up')).toBeInTheDocument();
    expect(screen.getByText('On the Way')).toBeInTheDocument();
    expect(screen.getByText('Delivered')).toBeInTheDocument();
  });

  it('shows estimated delivery time when not delivered', () => {
    render(<LiveOrderTracker {...defaultProps} />);
    expect(screen.getByText(/30 minutes/)).toBeInTheDocument();
  });

  it('hides estimated delivery time when order is delivered', () => {
    render(<LiveOrderTracker {...defaultProps} initialStatus="delivered" />);
    expect(screen.queryByText(/30 minutes/)).not.toBeInTheDocument();
  });

  it('shows "Delivered!" heading when status is delivered', () => {
    render(<LiveOrderTracker {...defaultProps} initialStatus="delivered" />);
    expect(screen.getByText('Delivered!')).toBeInTheDocument();
  });

  it('subscribes to the entity delivery channel on mount', () => {
    render(<LiveOrderTracker {...defaultProps} />);
    expect(mockSupabase.channel).toHaveBeenCalledWith(
      expect.stringContaining('delivery-456')
    );
  });

  it('does not subscribe when deliveryId is null', () => {
    render(<LiveOrderTracker {...defaultProps} deliveryId={null} />);
    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it('updates driver location when broadcast event fires', async () => {
    render(<LiveOrderTracker {...defaultProps} initialStatus="picked_up" />);

    // Find entity channel and fire location update
    const entityChannel = mockChannels.find((ch) =>
      mockSupabase.channel.mock.calls.some(
        (call: string[]) => call[0].includes('entity:delivery') && ch === mockSupabase.channel.mock.results[mockSupabase.channel.mock.calls.indexOf(call)]?.value
      )
    );

    // Directly fire the broadcast callback on any channel
    act(() => {
      for (const ch of mockChannels) {
        const broadcastCbs = ch.callbacks['broadcast'] || [];
        for (const cb of broadcastCbs) {
          cb({ payload: { lat: 37.7749, lng: -122.4194 } });
        }
      }
    });

    await waitFor(() => {
      expect(screen.queryByTestId('driver-location')).toBeInTheDocument();
    });
  });

  it('updates status when delivery_status_updated event fires', async () => {
    render(<LiveOrderTracker {...defaultProps} initialStatus="accepted" />);

    act(() => {
      for (const ch of mockChannels) {
        const cbs = ch.callbacks['delivery_status_updated'] || [];
        for (const cb of cbs) {
          cb({ payload: { status: 'ready_for_pickup' } });
        }
      }
    });

    // After status update the step for "Ready" should become current (active color)
    // The heading should now show "Ready"
    await waitFor(() => {
      // Step index for ready_for_pickup is 2, header would show "Ready"
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading.textContent).toBe('Ready');
    });
  });

  it('hides map when status is pending (before picked_up)', () => {
    render(<LiveOrderTracker {...defaultProps} initialStatus="pending" />);
    expect(screen.queryByText('Live Tracking')).not.toBeInTheDocument();
  });

  it('shows map when status is picked_up', () => {
    render(<LiveOrderTracker {...defaultProps} initialStatus="picked_up" />);
    expect(screen.getByText('Live Tracking')).toBeInTheDocument();
  });

  it('hides map when status is delivered', () => {
    render(<LiveOrderTracker {...defaultProps} initialStatus="delivered" />);
    expect(screen.queryByText('Live Tracking')).not.toBeInTheDocument();
  });

  it('shows pickup and dropoff address', () => {
    render(<LiveOrderTracker {...defaultProps} />);
    expect(screen.getByText('123 Chef St')).toBeInTheDocument();
    expect(screen.getByText('456 Customer Ave')).toBeInTheDocument();
  });

  it('cleans up channels on unmount', () => {
    const { unmount } = render(<LiveOrderTracker {...defaultProps} />);
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalled();
  });

  it('polls for status every 30 seconds as fallback', async () => {
    const mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: { status: 'in_transit' } }),
    });
    global.fetch = mockFetch;

    render(<LiveOrderTracker {...defaultProps} />);

    act(() => {
      jest.advanceTimersByTime(30000);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(`/api/orders/${defaultProps.orderId}`);
    });

    // Cleanup
    delete (global as typeof globalThis & { fetch?: unknown }).fetch;
  });
});
