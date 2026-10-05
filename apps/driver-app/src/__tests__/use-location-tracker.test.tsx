/**
 * @jest-environment jsdom
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { useLocationTracker } from '@/hooks/use-location-tracker';

type MockPermissionStatus = Omit<PermissionStatus, 'onchange' | 'state'> & {
  state: PermissionState;
  onchange: ((event: Event) => void) | null;
};

const position = {
  coords: {
    latitude: 43.25,
    longitude: -79.87,
  },
} as GeolocationPosition;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });

  return { promise, resolve };
}

function installLocationMocks({
  permissionStatus = {
    state: 'granted',
    onchange: null,
  } as MockPermissionStatus,
  permissionsQuery = jest.fn().mockResolvedValue(permissionStatus),
}: {
  permissionStatus?: MockPermissionStatus;
  permissionsQuery?: jest.Mock;
} = {}) {

  const geolocation = {
    watchPosition: jest.fn((_success, _error) => 17),
    getCurrentPosition: jest.fn((success: PositionCallback) => success(position)),
    clearWatch: jest.fn(),
  };

  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: geolocation,
  });
  Object.defineProperty(navigator, 'permissions', {
    configurable: true,
    value: {
      query: permissionsQuery,
    },
  });

  return { geolocation, permissionStatus, permissionsQuery };
}

describe('useLocationTracker', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.restoreAllMocks();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    installLocationMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('keeps lastPostedAt empty and surfaces API errors when location POST is rejected', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'Too many location updates' } }),
    }) as jest.Mock;

    const { result } = renderHook(() =>
      useLocationTracker({
        driverId: 'driver-1',
        isOnline: true,
        updateInterval: 60_000,
      })
    );

    await waitFor(() => {
      expect(result.current.locationError).toBe('Too many location updates');
    });

    expect(result.current.lastPostedAt).toBeNull();
  });

  it('does not restart geolocation or post location when retry is called while offline', () => {
    const { geolocation } = installLocationMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as jest.Mock;

    const { result } = renderHook(() =>
      useLocationTracker({
        driverId: 'driver-1',
        isOnline: false,
        updateInterval: 60_000,
      })
    );

    act(() => {
      result.current.startTracking();
    });

    expect(geolocation.watchPosition).not.toHaveBeenCalled();
    expect(geolocation.getCurrentPosition).not.toHaveBeenCalled();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not let a stale permission query remove the active session onchange handler', async () => {
    const permissionStatus = {
      state: 'granted',
      onchange: null,
    } as MockPermissionStatus;
    const firstQuery = deferred<PermissionStatus>();
    const secondQuery = deferred<PermissionStatus>();
    const permissionsQuery = jest
      .fn()
      .mockReturnValueOnce(firstQuery.promise)
      .mockReturnValueOnce(secondQuery.promise);
    installLocationMocks({ permissionStatus, permissionsQuery });
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }) as jest.Mock;

    const { result, rerender } = renderHook(
      (props: { driverId: string; isOnline: boolean; updateInterval: number }) =>
        useLocationTracker(props),
      {
        initialProps: {
          driverId: 'driver-1',
          isOnline: true,
          updateInterval: 60_000,
        },
      }
    );

    rerender({ driverId: 'driver-1', isOnline: false, updateInterval: 60_000 });
    rerender({ driverId: 'driver-1', isOnline: true, updateInterval: 60_000 });

    await act(async () => {
      secondQuery.resolve(permissionStatus);
      await secondQuery.promise;
    });
    const activeOnChange = permissionStatus.onchange;
    expect(typeof activeOnChange).toBe('function');

    await act(async () => {
      firstQuery.resolve(permissionStatus);
      await firstQuery.promise;
    });

    expect(permissionStatus.onchange).toBe(activeOnChange);

    permissionStatus.state = 'denied';
    await act(async () => {
      permissionStatus.onchange?.(new Event('change'));
    });
    expect(result.current.permissionState).toBe('denied');
  });

  it('marks location as stale when lastPostedAt is older than 90 seconds', async () => {
    jest.useFakeTimers();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as jest.Mock;

    const { result } = renderHook(() =>
      useLocationTracker({
        driverId: 'driver-1',
        isOnline: true,
        updateInterval: 60_000,
      })
    );

    // Initial post succeeds - flush microtasks
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(result.current.lastPostedAt).toBeTruthy();
    expect(result.current.isLocationStale).toBe(false);

    // Fast-forward past 90s dispatch TTL + periodic check interval
    act(() => {
      jest.advanceTimersByTime(100_000);
    });

    expect(result.current.isLocationStale).toBe(true);
    jest.useRealTimers();
  });

  it('re-queries position and pings location when visibility returns to visible', async () => {
    const { geolocation } = installLocationMocks();
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as jest.Mock;

    renderHook(() =>
      useLocationTracker({
        driverId: 'driver-1',
        isOnline: true,
        updateInterval: 60_000,
      })
    );

    // Initial post
    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(1);

    // Simulate returning to foreground
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });

    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });

    expect(geolocation.getCurrentPosition).toHaveBeenCalledTimes(2);
  });
});
