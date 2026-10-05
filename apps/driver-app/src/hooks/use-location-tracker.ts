'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { DRIVER_DISPATCH_LOCATION_TTL_MS } from '@/lib/driver-readiness';

interface UseLocationTrackerProps {
  driverId: string | null;
  isOnline: boolean;
  /** When set (active delivery to customer), included in POST for ETA + customer broadcast */
  deliveryId?: string | null;
  updateInterval?: number;
}

type TrackedLocation = { lat: number; lng: number };
type LocationPermissionState = PermissionState | 'unknown' | 'unsupported';

function extractApiErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;

  const body = payload as Record<string, unknown>;
  if (typeof body.message === 'string') return body.message;
  if (typeof body.error === 'string') return body.error;

  if (body.error && typeof body.error === 'object') {
    const error = body.error as Record<string, unknown>;
    if (typeof error.message === 'string') return error.message;
    if (typeof error.code === 'string') return error.code;
  }

  return null;
}

async function readRejectedLocationMessage(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    const message = extractApiErrorMessage(payload);
    if (message) return message;
  } catch {
    // Fall through to status-based message.
  }

  return `Location update failed (${response.status})`;
}

async function postLocation(
  lat: number,
  lng: number,
  deliveryId: string | null | undefined
): Promise<void> {
  const response = await fetch('/api/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      lat,
      lng,
      ...(deliveryId ? { deliveryId } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(await readRejectedLocationMessage(response));
  }
}

function locationErrorMessage(error: GeolocationPositionError): string {
  if (error.code === error.PERMISSION_DENIED) {
    return 'Location permission denied';
  }
  if (error.code === error.POSITION_UNAVAILABLE) {
    return 'Location unavailable';
  }
  if (error.code === error.TIMEOUT) {
    return 'Location request timed out';
  }
  return error.message || 'Unable to read location';
}

export function useLocationTracker({
  driverId,
  isOnline,
  deliveryId = null,
  updateInterval = 15000,
}: UseLocationTrackerProps) {
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLocationRef = useRef<TrackedLocation | null>(null);
  const deliveryIdRef = useRef(deliveryId);
  const activeRef = useRef(false);
  const mountedRef = useRef(true);
  const permissionStatusRef = useRef<PermissionStatus | null>(null);
  const sessionRef = useRef(0);
  const postCountsRef = useRef<Map<number, number>>(new Map());
  const [lastLocation, setLastLocation] = useState<TrackedLocation | null>(null);
  const [lastPostedAt, setLastPostedAt] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermissionState>('unknown');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  const [isLocationStale, setIsLocationStale] = useState(false);
  deliveryIdRef.current = deliveryId;

  const isActiveSession = useCallback((session: number) => {
    return mountedRef.current && activeRef.current && sessionRef.current === session;
  }, []);

  const activePostCount = useCallback((session: number) => {
    return postCountsRef.current.get(session) ?? 0;
  }, []);

  const beginPost = useCallback((session: number) => {
    postCountsRef.current.set(session, activePostCount(session) + 1);
    if (isActiveSession(session)) {
      setIsPosting(true);
    }
  }, [activePostCount, isActiveSession]);

  const finishPost = useCallback((session: number) => {
    const nextCount = Math.max(0, activePostCount(session) - 1);
    if (nextCount === 0) {
      postCountsRef.current.delete(session);
    } else {
      postCountsRef.current.set(session, nextCount);
    }

    if (isActiveSession(session)) {
      setIsPosting(nextCount > 0);
    }
  }, [activePostCount, isActiveSession]);

  const updateLocation = useCallback(
    async (lat: number, lng: number, session: number) => {
      if (!driverId) return;
      if (!isActiveSession(session)) return;
      if (activePostCount(session) > 0) return;

      beginPost(session);
      try {
        await postLocation(lat, lng, deliveryIdRef.current);
        if (!isActiveSession(session)) return;

        setLastPostedAt(new Date().toISOString());
        setLocationError(null);
      } catch (error) {
        console.error('Failed to update location:', error);
        if (isActiveSession(session)) {
          setLocationError(error instanceof Error ? error.message : 'Unable to update location');
        }
      } finally {
        finishPost(session);
      }
    },
    [activePostCount, beginPost, driverId, finishPost, isActiveSession]
  );

  const clearPermissionListener = useCallback(() => {
    if (permissionStatusRef.current) {
      permissionStatusRef.current.onchange = null;
      permissionStatusRef.current = null;
    }
  }, []);

  const startTracking = useCallback(() => {
    if (!isOnline || !driverId) {
      return;
    }

    const session = sessionRef.current + 1;
    sessionRef.current = session;
    activeRef.current = true;

    if (!('geolocation' in navigator)) {
      console.error('Geolocation is not supported');
      if (isActiveSession(session)) {
        setPermissionState('unsupported');
        setLocationError('Geolocation is not supported');
      }
      return;
    }

    clearPermissionListener();

    if ('permissions' in navigator) {
      void navigator.permissions
        .query({ name: 'geolocation' as PermissionName })
        .then((permission) => {
          if (!isActiveSession(session)) {
            return;
          }

          permissionStatusRef.current = permission;
          setPermissionState(permission.state);
          permission.onchange = () => {
            if (isActiveSession(session)) {
              setPermissionState(permission.state);
            }
          };
        })
        .catch(() => {
          if (isActiveSession(session)) {
            setPermissionState('unknown');
          }
        });
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!isActiveSession(session)) return;

        const { latitude, longitude } = position.coords;
        lastLocationRef.current = { lat: latitude, lng: longitude };
        setLastLocation(lastLocationRef.current);
        setLocationError(null);
      },
      (error) => {
        console.error('Geolocation error:', error);
        if (isActiveSession(session)) {
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionState('denied');
          }
          setLocationError(locationErrorMessage(error));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    intervalRef.current = setInterval(() => {
      if (isActiveSession(session) && lastLocationRef.current && activePostCount(session) === 0) {
        void updateLocation(lastLocationRef.current.lat, lastLocationRef.current.lng, session);
      }
    }, updateInterval);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!isActiveSession(session)) return;

        const { latitude, longitude } = position.coords;
        lastLocationRef.current = { lat: latitude, lng: longitude };
        setLastLocation(lastLocationRef.current);
        setLocationError(null);
        void updateLocation(latitude, longitude, session);
      },
      (error) => {
        console.error('Initial position error:', error);
        if (isActiveSession(session)) {
          if (error.code === error.PERMISSION_DENIED) {
            setPermissionState('denied');
          }
          setLocationError(locationErrorMessage(error));
        }
      },
      { enableHighAccuracy: true }
    );
  }, [
    activePostCount,
    clearPermissionListener,
    driverId,
    isOnline,
    isActiveSession,
    updateInterval,
    updateLocation,
  ]);

  const stopTracking = useCallback(() => {
    activeRef.current = false;
    const stoppedSession = sessionRef.current;
    sessionRef.current += 1;
    postCountsRef.current.delete(stoppedSession);
    clearPermissionListener();

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (mountedRef.current) {
      setIsPosting(false);
    }
  }, [clearPermissionListener]);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      stopTracking();
    };
  }, [stopTracking]);

  useEffect(() => {
    if (isOnline && driverId) {
      startTracking();
    } else {
      stopTracking();
    }

    return () => {
      stopTracking();
    };
  }, [isOnline, driverId, startTracking, stopTracking]);

  // Track location staleness against dispatch TTL (90s)
  useEffect(() => {
    if (!isOnline) {
      setIsLocationStale(false);
      return;
    }

    const checkStaleness = () => {
      if (!lastPostedAt) {
        setIsLocationStale(false);
        return;
      }
      const ageMs = Date.now() - new Date(lastPostedAt).getTime();
      setIsLocationStale(ageMs > DRIVER_DISPATCH_LOCATION_TTL_MS);
    };

    checkStaleness();
    const interval = setInterval(checkStaleness, 10_000);
    return () => clearInterval(interval);
  }, [isOnline, lastPostedAt]);

  // Immediate foreground GPS re-sync when returning from background
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && isOnline && driverId && activeRef.current) {
        if (typeof navigator !== 'undefined' && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              if (!mountedRef.current || !activeRef.current) return;
              const { latitude, longitude } = position.coords;
              lastLocationRef.current = { lat: latitude, lng: longitude };
              setLastLocation(lastLocationRef.current);
              setLocationError(null);
              void updateLocation(latitude, longitude, sessionRef.current);
            },
            (error) => {
              if (!mountedRef.current || !activeRef.current) return;
              console.warn('Foreground restore location query failed:', error);
            },
            { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
          );
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [driverId, isOnline, updateLocation]);

  return {
    lastLocation,
    lastPostedAt,
    permissionState,
    locationError,
    isPosting,
    isLocationStale,
    startTracking,
    stopTracking,
  };
}
