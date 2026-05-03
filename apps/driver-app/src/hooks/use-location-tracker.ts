'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseLocationTrackerProps {
  driverId: string | null;
  isOnline: boolean;
  /** When set (active delivery to customer), included in POST for ETA + customer broadcast */
  deliveryId?: string | null;
  updateInterval?: number;
}

async function postLocation(
  lat: number,
  lng: number,
  deliveryId: string | null | undefined
): Promise<void> {
  await fetch('/api/location', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      lat,
      lng,
      ...(deliveryId ? { deliveryId } : {}),
    }),
  });
}

export function useLocationTracker({
  driverId,
  isOnline,
  deliveryId = null,
  updateInterval = 15000,
}: UseLocationTrackerProps) {
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const deliveryIdRef = useRef(deliveryId);
  deliveryIdRef.current = deliveryId;

  const updateLocation = useCallback(async (lat: number, lng: number) => {
    if (!driverId) return;
    try {
      await postLocation(lat, lng, deliveryIdRef.current);
    } catch (error) {
      console.error('Failed to update location:', error);
    }
  }, [driverId]);

  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      console.error('Geolocation is not supported');
      return;
    }

    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        lastLocationRef.current = { lat: latitude, lng: longitude };
      },
      (error) => {
        console.error('Geolocation error:', error);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
      }
    );

    intervalRef.current = setInterval(() => {
      if (lastLocationRef.current) {
        void updateLocation(lastLocationRef.current.lat, lastLocationRef.current.lng);
      }
    }, updateInterval);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        void updateLocation(latitude, longitude);
      },
      (error) => {
        console.error('Initial position error:', error);
      },
      { enableHighAccuracy: true }
    );
  }, [updateInterval, updateLocation]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

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

  return {
    lastLocation: lastLocationRef.current,
    startTracking,
    stopTracking,
  };
}
