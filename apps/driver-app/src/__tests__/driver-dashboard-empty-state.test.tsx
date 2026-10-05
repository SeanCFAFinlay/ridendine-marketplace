/**
 * @jest-environment jsdom
 */

import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import DriverDashboard from '../app/components/DriverDashboard';
import { useLocationTracker } from '@/hooks/use-location-tracker';

// Minimal driver fixture
const mockDriver = {
  id: 'driver-1',
  first_name: 'Jane',
  last_name: 'Doe',
  user_id: 'user-1',
  status: 'active' as const,
  email: 'jane@example.com',
  phone: '555-0100',
  vehicle_make: 'Toyota',
  vehicle_model: 'Corolla',
  vehicle_year: 2020,
  vehicle_color: 'white',
  vehicle_plate: 'ABC 123',
  license_number: 'DL123',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Mock next/link and next/image so they render in jsdom
jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

jest.mock('next/image', () => {
  const Img = ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />;
  Img.displayName = 'Image';
  return Img;
});

// Mock next/navigation since DriverDashboard now uses useRouter for sign-out.
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn(), back: jest.fn() }),
}));

// Mock @ridendine/auth since DriverDashboard now uses useAuthContext for sign-out.
jest.mock('@ridendine/auth', () => ({
  useAuthContext: () => ({ user: null, signOut: jest.fn().mockResolvedValue(undefined) }),
}));

// Mock OfferAlert so it doesn't make real network calls
jest.mock('@/components/offer-alert', () => ({
  OfferAlert: () => null,
}));

jest.mock('@/hooks/use-location-tracker', () => ({
  useLocationTracker: jest.fn(),
}));

jest.mock('@/components/map/route-map', () => ({
  RouteMap: () => <div data-testid="route-map" />,
}));

const mockUseLocationTracker = useLocationTracker as jest.Mock;

// Keep default hydration pending for assertions that do not care about async dashboard data.
beforeEach(() => {
  mockUseLocationTracker.mockReturnValue({
    lastLocation: null,
    lastPostedAt: null,
    permissionState: 'prompt',
    locationError: null,
    isPosting: false,
    startTracking: jest.fn(),
    stopTracking: jest.fn(),
  });

  global.fetch = jest.fn(() => new Promise<Response>(() => undefined)) as jest.Mock;
});

afterEach(() => {
  jest.restoreAllMocks();
});

function readinessSummary(overrides: Record<string, unknown> = {}) {
  return {
    driverId: 'driver-1',
    approvalStatus: 'approved',
    presenceStatus: 'online',
    readiness: {
      status: 'ready',
      label: 'Ready',
      detail: 'Driver is approved, online, and location is fresh for dispatch.',
      blocksDispatch: false,
      priority: 'success',
    },
    lastLocationAt: '2026-06-07T18:00:00.000Z',
    activeDeliveryCount: 0,
    availableBalanceCents: 0,
    instantPayoutsEnabled: true,
    complianceOpenItems: 0,
    ...overrides,
  };
}

function shiftSummary(overrides: Record<string, unknown> = {}) {
  return {
    driverId: 'driver-1',
    presenceStatus: 'offline',
    currentShiftId: null,
    isOnShift: false,
    shiftStartedAt: null,
    shiftEndedAt: null,
    lastLocationAt: null,
    activeDeliveryCount: 0,
    activeDeliveries: [],
    currentShift: null,
    today: {
      completedDeliveries: 0,
      earnings: 0,
    },
    ...overrides,
  };
}

function mockDashboardFetch(
  summary: Record<string, unknown>,
  shift: Record<string, unknown> = shiftSummary({ presenceStatus: summary.presenceStatus }),
  offers: Array<Record<string, unknown>> = []
) {
  global.fetch = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes('/api/offers')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { offers } }),
      });
    }

    if (url.includes('/api/driver/shift')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: shift }),
      });
    }

    if (url.includes('/api/driver/readiness')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: summary }),
      });
    }

    if (url.includes('/api/driver/presence')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ data: { presence: { status: summary.presenceStatus } } }),
      });
    }

    if (url.includes('/api/earnings')) {
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true, data: { today: { count: 0, earnings: 0 } } }),
      });
    }

    return Promise.resolve({
      ok: false,
      json: async () => ({}),
    });
  }) as jest.Mock;
}

function deferredResponse(body: unknown) {
  let resolve!: (value: Response) => void;
  const promise = new Promise<Response>((res) => {
    resolve = res;
  });

  return {
    promise,
    resolve: () =>
      resolve({
        ok: true,
        json: async () => body,
      } as Response),
  };
}

describe('DriverDashboard — no active deliveries empty state', () => {
  it('renders "No active deliveries" heading when activeDeliveries is empty', () => {
    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);
    expect(screen.getByText('No active deliveries')).toBeInTheDocument();
  });

  it('renders subtitle pointing to the offer queue', () => {
    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);
    const emptyState = screen.getByRole('heading', { name: 'No active deliveries' }).parentElement;
    expect(emptyState).not.toBeNull();
    expect(
      within(emptyState as HTMLElement).getByText(/go online when you are ready to receive offers/i)
    ).toBeInTheDocument();
  });

  it('does NOT render "No active deliveries" when a delivery is present', () => {
    const delivery = {
      id: 'del-1',
      pickup_address: '1 King St W',
      dropoff_address: '100 Queen St E',
      distance_km: 3.2,
      driver_payout: '8.50',
      status: 'assigned' as const,
    };
    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[delivery as any]} />);
    expect(screen.queryByText('No active deliveries')).not.toBeInTheDocument();
  });

  it('labels the active delivery workflow entry point', async () => {
    mockDashboardFetch(readinessSummary({ activeDeliveryCount: 1 }));
    const delivery = {
      id: 'del-1',
      pickup_address: '1 King St W',
      dropoff_address: '100 Queen St E',
      distance_km: 3.2,
      driver_payout: '8.50',
      status: 'en_route_to_pickup' as const,
    };

    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[delivery as any]} />);

    expect(await screen.findByText('En route to pickup')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /open delivery workflow/i })).toBeInTheDocument();
  });

  it('starts a driver shift from the primary work action', async () => {
    const startedShift = shiftSummary({
      presenceStatus: 'online',
      currentShiftId: 'shift-1',
      isOnShift: true,
      shiftStartedAt: '2026-06-08T18:15:00.000Z',
    });

    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/driver/shift') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: startedShift }),
        } as Response);
      }

      if (url.includes('/api/driver/shift')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: shiftSummary() }),
        } as Response);
      }

      if (url.includes('/api/driver/readiness')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: readinessSummary({ presenceStatus: 'online' }) }),
        } as Response);
      }

      if (url.includes('/api/driver/presence')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { presence: { status: 'offline' } } }),
        } as Response);
      }

      if (url.includes('/api/earnings')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { today: { count: 0, earnings: 0 } } }),
        } as Response);
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({}),
      } as Response);
    }) as jest.Mock;

    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);

    const startButtons = await screen.findAllByRole('button', { name: /start shift/i });
    fireEvent.click(startButtons[0]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/driver/shift',
        expect.objectContaining({ method: 'POST' })
      );
    });
    expect(await screen.findByRole('button', { name: /end shift/i })).toBeInTheDocument();
  });

  it('shows an end shift action when the driver is already on shift', async () => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date('2026-06-08T20:45:00.000Z').getTime());
    mockDashboardFetch(
      readinessSummary({ presenceStatus: 'online' }),
      shiftSummary({
        presenceStatus: 'online',
        currentShiftId: 'shift-1',
        isOnShift: true,
        shiftStartedAt: '2026-06-08T18:15:00.000Z',
      })
    );

    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);

    expect(await screen.findByRole('button', { name: /end shift/i })).toBeInTheDocument();
    expect(screen.getAllByText(/on shift/i).length).toBeGreaterThan(0);
    expect(screen.getByText('Shift duration')).toBeInTheDocument();
    expect(screen.getByText('2h 30m')).toBeInTheDocument();
  });

  it('renders pending offers from the durable offer queue', async () => {
    mockDashboardFetch(
      readinessSummary({ presenceStatus: 'online' }),
      shiftSummary({
        presenceStatus: 'online',
        currentShiftId: 'shift-1',
        isOnShift: true,
        shiftStartedAt: '2026-06-08T18:15:00.000Z',
      }),
      [
        {
          attemptId: 'attempt-1',
          deliveryId: 'delivery-1',
          pickupAddress: '1 King St W, Hamilton',
          dropoffAddress: '100 Queen St E, Hamilton',
          estimatedDistanceKm: 2.8,
          estimatedRouteSeconds: 900,
          estimatedPayout: 12.4,
          customerTip: 3,
          orderNumber: 'RD-100',
          storefrontName: 'Ridendine Kitchen',
          expiresAt: '2026-06-08T21:00:00.000Z',
        },
      ]
    );

    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);

    expect(await screen.findByText('Pending offers')).toBeInTheDocument();
    expect(screen.getByText('Order RD-100')).toBeInTheDocument();
    expect(screen.getByText('Ridendine Kitchen')).toBeInTheDocument();
    expect(screen.getByText('$12.40')).toBeInTheDocument();
    expect(screen.getByText('2.8 km')).toBeInTheDocument();
  });

  it('blocks ending a shift while an active delivery is in progress', async () => {
    mockDashboardFetch(
      readinessSummary({ presenceStatus: 'online', activeDeliveryCount: 1 }),
      shiftSummary({
        presenceStatus: 'online',
        currentShiftId: 'shift-1',
        isOnShift: true,
        shiftStartedAt: '2026-06-08T18:15:00.000Z',
        activeDeliveryCount: 1,
      })
    );
    const delivery = {
      id: 'del-1',
      pickup_address: '1 King St W',
      dropoff_address: '100 Queen St E',
      distance_km: 3.2,
      driver_payout: '8.50',
      status: 'en_route_to_pickup' as const,
    };

    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[delivery as any]} />);

    expect(
      await screen.findByText(/complete active deliveries before ending your shift/i)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /end shift/i })).toBeDisabled();
  });

  it('renders the ready-to-work panel with the exact dispatch blocker and retry location action', async () => {
    const startTracking = jest.fn();
    mockUseLocationTracker.mockReturnValue({
      lastLocation: null,
      lastPostedAt: null,
      permissionState: 'denied',
      locationError: 'Location permission denied',
      isPosting: false,
      startTracking,
      stopTracking: jest.fn(),
    });
    mockDashboardFetch(
      readinessSummary({
        readiness: {
          status: 'not_dispatchable',
          label: 'Not dispatchable',
          detail: 'Driver GPS is stale and must refresh before dispatch.',
          blocksDispatch: true,
          priority: 'danger',
        },
        lastLocationAt: '2026-06-07T17:55:00.000Z',
      })
    );

    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);

    expect(await screen.findByText('Ready to work')).toBeInTheDocument();
    expect(
      await screen.findByText('Driver GPS is stale and must refresh before dispatch.')
    ).toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
    expect(screen.getByText(/presence online/i)).toBeInTheDocument();

    const retryButton = screen.getByRole('button', { name: /retry location/i });
    fireEvent.click(retryButton);
    expect(startTracking).toHaveBeenCalledTimes(1);
  });

  it('does not offer location retry while the driver is offline', async () => {
    mockUseLocationTracker.mockReturnValue({
      lastLocation: null,
      lastPostedAt: null,
      permissionState: 'denied',
      locationError: 'Location permission denied',
      isPosting: false,
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
    });
    mockDashboardFetch(
      readinessSummary({
        presenceStatus: 'offline',
        readiness: {
          status: 'not_dispatchable',
          label: 'Not dispatchable',
          detail: 'Driver must be online to receive dispatch offers.',
          blocksDispatch: true,
          priority: 'danger',
        },
      })
    );

    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);

    expect(await screen.findByText('Ready to work')).toBeInTheDocument();
    expect(screen.getByText('Location permission denied')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry location/i })).not.toBeInTheDocument();
  });

  it('warns before the driver tries to go offline during an active delivery', async () => {
    mockDashboardFetch(
      readinessSummary({ presenceStatus: 'online', activeDeliveryCount: 1 }),
      shiftSummary({
        presenceStatus: 'online',
        currentShiftId: 'shift-1',
        isOnShift: true,
        shiftStartedAt: '2026-06-08T18:15:00.000Z',
        activeDeliveryCount: 1,
      })
    );
    const delivery = {
      id: 'del-1',
      pickup_address: '1 King St W',
      dropoff_address: '100 Queen St E',
      distance_km: 3.2,
      driver_payout: '8.50',
      status: 'en_route_to_pickup' as const,
    };

    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[delivery as any]} />);

    expect(
      await screen.findByText(/complete active deliveries before ending your shift/i)
    ).toBeInTheDocument();
  });

  it('shows a prominent warning banner when location permission is denied while on shift', async () => {
    mockUseLocationTracker.mockReturnValue({
      lastLocation: null,
      lastPostedAt: null,
      permissionState: 'denied',
      locationError: 'Location permission denied',
      isPosting: false,
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
    });
    mockDashboardFetch(
      readinessSummary({ presenceStatus: 'online' }),
      shiftSummary({
        presenceStatus: 'online',
        currentShiftId: 'shift-1',
        isOnShift: true,
        shiftStartedAt: '2026-06-08T18:15:00.000Z',
      })
    );

    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);

    const banner = await screen.findByRole('alert');
    expect(banner).toHaveTextContent(/location tracking is off/i);
    expect(banner).toHaveTextContent(/customers can.t see your position/i);
    expect(banner).toHaveTextContent(/enable location for this site/i);
  });

  it('does not show the location warning banner while the driver is off shift', () => {
    mockUseLocationTracker.mockReturnValue({
      lastLocation: null,
      lastPostedAt: null,
      permissionState: 'denied',
      locationError: 'Location permission denied',
      isPosting: false,
      startTracking: jest.fn(),
      stopTracking: jest.fn(),
    });
    // Default beforeEach fetch never resolves, so the driver stays off shift.
    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.queryByText(/location tracking is off/i)).not.toBeInTheDocument();
  });

  it('ignores stale initial readiness after a newer online toggle refresh resolves', async () => {
    const initialReadiness = deferredResponse({
      success: true,
      data: readinessSummary({
        presenceStatus: 'offline',
        readiness: {
          status: 'not_dispatchable',
          label: 'Not dispatchable',
          detail: 'Driver must be online to receive dispatch offers.',
          blocksDispatch: true,
          priority: 'danger',
        },
      }),
    });
    const toggleReadiness = deferredResponse({
      success: true,
      data: readinessSummary({ presenceStatus: 'online' }),
    });
    let readinessCalls = 0;

    global.fetch = jest.fn((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.includes('/api/driver/shift') && init?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: shiftSummary({
              presenceStatus: 'online',
              currentShiftId: 'shift-1',
              isOnShift: true,
              shiftStartedAt: '2026-06-08T18:15:00.000Z',
            }),
          }),
        } as Response);
      }

      if (url.includes('/api/driver/shift')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: shiftSummary() }),
        } as Response);
      }

      if (url.includes('/api/driver/presence')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ data: { presence: { status: 'offline' } } }),
        } as Response);
      }

      if (url.includes('/api/earnings')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, data: { today: { count: 0, earnings: 0 } } }),
        } as Response);
      }

      if (url.includes('/api/driver/readiness')) {
        readinessCalls += 1;
        return readinessCalls === 1 ? initialReadiness.promise : toggleReadiness.promise;
      }

      return Promise.resolve({
        ok: false,
        json: async () => ({}),
      } as Response);
    }) as jest.Mock;

    render(<DriverDashboard driver={mockDriver as any} activeDeliveries={[]} />);

    fireEvent.click(screen.getAllByTestId('driver-online-toggle')[0]);
    expect(await screen.findByRole('button', { name: 'End shift' })).toBeInTheDocument();

    await act(async () => {
      toggleReadiness.resolve();
      await toggleReadiness.promise;
    });

    expect(screen.getByRole('button', { name: 'End shift' })).toBeInTheDocument();

    await act(async () => {
      initialReadiness.resolve();
      await initialReadiness.promise;
    });

    expect(screen.getByRole('button', { name: 'End shift' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Dispatch ready' })).toBeInTheDocument();
  });
});
