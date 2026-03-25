'use client';

import { useEffect, useRef, useCallback, useMemo } from 'react';
import { createBrowserClient } from '@ridendine/db';

interface UseLocationTrackerProps {
  driverId: string | null;
  isOnline: boolean;
  updateInterval?: number; // milliseconds
}

export function useLocationTracker({
  driverId,
  isOnline,
  updateInterval = 15000,
}: UseLocationTrackerProps) {
  const watchIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  const supabase = useMemo(() => createBrowserClient(), []);

  const updateLocation = useCallback(
    async (lat: number, lng: number) => {
      if (!driverId || !supabase) return;

      try {
        // Update driver_presence table
        await (supabase as any)
          .from('driver_presence')
          .upsert({
            driver_id: driverId,
            current_lat: lat,
            current_lng: lng,
            last_location_update: new Date().toISOString(),
          });

        // Also insert into driver_locations for history
        await (supabase as any).from('driver_locations').insert({
          driver_id: driverId,
          lat,
          lng,
          recorded_at: new Date().toISOString(),
        });

        lastLocationRef.current = { lat, lng };
      } catch (error) {
        console.error('Failed to update location:', error);
      }
    },
    [driverId, supabase]
  );

  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      console.error('Geolocation is not supported');
      return;
    }

    // Clear any existing watchers
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Watch position continuously
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

    // Update server at regular intervals
    intervalRef.current = setInterval(() => {
      if (lastLocationRef.current) {
        updateLocation(lastLocationRef.current.lat, lastLocationRef.current.lng);
      }
    }, updateInterval);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        updateLocation(latitude, longitude);
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
