'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createBrowserClient, opsLiveMapChannel } from '@ridendine/db';
import { DEFAULT_SERVICE_REGION_CENTER, DEFAULT_MAP_ZOOM } from '@ridendine/engine';
import { getLocationHealth, locationHealthClass } from '@/lib/location-health';

type DriverMapRow = {
  id: string;
  first_name: string;
  last_name: string;
  driver_presence:
    | {
        status: string;
        last_location_lat: number | null;
        last_location_lng: number | null;
        last_location_at?: string | null;
        last_location_update?: string | null;
        updated_at?: string | null;
      }
    | {
        status: string;
        last_location_lat: number | null;
        last_location_lng: number | null;
        last_location_at?: string | null;
        last_location_update?: string | null;
        updated_at?: string | null;
      }[]
    | null;
};

type DeliveryMapRow = {
  id: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  status: string;
  driver_id: string | null;
  orders:
    | {
        order_number: string;
      }
    | {
        order_number: string;
      }[]
    | null;
};

type DriverMarkerData = {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  last_seen_at: string | null;
};

type DeliveryMarkerData = {
  id: string;
  order_number: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  status: string;
  driver_id: string | null;
};

type BrowserSupabaseClient = NonNullable<ReturnType<typeof createBrowserClient>>;

function normalizePresence(row: DriverMapRow['driver_presence']) {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

function normalizeOrder(row: DeliveryMapRow['orders']) {
  if (!row) return null;
  return Array.isArray(row) ? row[0] ?? null : row;
}

export default function LiveMap() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const supabaseRef = useRef<BrowserSupabaseClient | null>(createBrowserClient());

  const [drivers, setDrivers] = useState<DriverMarkerData[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryMarkerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'online' | 'busy' | 'offline'>(
    'all'
  );

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = L.map(containerRef.current).setView(DEFAULT_SERVICE_REGION_CENTER, DEFAULT_MAP_ZOOM);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const db = supabaseRef.current;
    if (!db) return;
    const client = db;

    async function fetchData() {
      try {
        setLoadError(null);
        const { data: driverData } = await client
          .from('drivers')
          .select(`
          id,
          first_name,
          last_name,
          driver_presence (
            status,
            last_location_lat,
            last_location_lng,
            last_location_at,
            last_location_update,
            updated_at
          )
        `)
          .eq('status', 'approved');

        if (driverData) {
          const mappedDrivers = (driverData as unknown as DriverMapRow[]).map(
            (driver) => {
              const presence = normalizePresence(driver.driver_presence);
              return {
                id: driver.id,
                first_name: driver.first_name,
                last_name: driver.last_name,
                status: presence?.status || 'offline',
                current_lat: presence?.last_location_lat ?? null,
                current_lng: presence?.last_location_lng ?? null,
                last_seen_at:
                  presence?.last_location_update ??
                  presence?.last_location_at ??
                  presence?.updated_at ??
                  null,
              };
            }
          );
          setDrivers(mappedDrivers);
        }

        const { data: deliveryData } = await client
          .from('deliveries')
          .select(`
          id,
          pickup_lat,
          pickup_lng,
          dropoff_lat,
          dropoff_lng,
          status,
          driver_id,
          orders (order_number)
        `)
          .in('status', [
          'assigned',
          'accepted',
          'en_route_to_pickup',
          'picked_up',
          'en_route_to_dropoff',
          ]);

        if (deliveryData) {
          const mappedDeliveries = (deliveryData as unknown as DeliveryMapRow[]).map(
            (delivery) => ({
              id: delivery.id,
              order_number: normalizeOrder(delivery.orders)?.order_number || 'Unknown',
              pickup_lat: delivery.pickup_lat,
              pickup_lng: delivery.pickup_lng,
              dropoff_lat: delivery.dropoff_lat,
              dropoff_lng: delivery.dropoff_lng,
              status: delivery.status,
              driver_id: delivery.driver_id,
            })
          );
          setDeliveries(mappedDeliveries);
        }
      } catch {
        setLoadError('Unable to load live map data right now.');
      } finally {
        setLoading(false);
      }
    }

    void fetchData();

    const channel = client
      .channel(opsLiveMapChannel())
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_presence' },
        () => {
          void fetchData();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => {
          void fetchData();
        }
      )
      .subscribe();

    const interval = setInterval(() => {
      void fetchData();
    }, 30000);

    return () => {
      client.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    const filteredDrivers = drivers.filter((driver) => {
      if (filter === 'all') return true;
      const health = getLocationHealth(driver.last_seen_at, driver.status);
      if (filter === 'offline') return health.status === 'offline' || health.status === 'unknown';
      return driver.status === filter && health.status !== 'offline';
    });

    filteredDrivers.forEach((driver) => {
      if (!driver.current_lat || !driver.current_lng) return;

      const health = getLocationHealth(driver.last_seen_at, driver.status);
      const color =
        health.status === 'live' && driver.status === 'online'
          ? '#22c55e'
          : health.status === 'live' && driver.status === 'busy'
            ? '#f97316'
            : health.status === 'stale'
              ? '#facc15'
            : '#64748b';

      const icon = L.divIcon({
        className: 'driver-marker',
        html: `
          <div style="
            background: ${color};
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 18px;
          ">
            🚗
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker([driver.current_lat, driver.current_lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div style="min-width: 150px;">
            <strong>${driver.first_name} ${driver.last_name}</strong>
            <br/>
            <span style="color: ${color}; font-weight: 500;">${driver.status.toUpperCase()}</span>
            <br/>
            <span>${health.detail}</span>
          </div>
        `);

      markersRef.current.set(`driver-${driver.id}`, marker);
    });

    deliveries.forEach((delivery) => {
      if (delivery.pickup_lat && delivery.pickup_lng) {
        const pickupIcon = L.divIcon({
          className: 'pickup-marker',
          html: `
            <div style="
              background: #EA5B26;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              font-size: 14px;
            ">
              🍽️
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const pickupMarker = L.marker([delivery.pickup_lat, delivery.pickup_lng], {
          icon: pickupIcon,
        })
          .addTo(map)
          .bindPopup(`Pickup: ${delivery.order_number}`);

        markersRef.current.set(`pickup-${delivery.id}`, pickupMarker);
      }

      if (delivery.dropoff_lat && delivery.dropoff_lng) {
        const dropoffIcon = L.divIcon({
          className: 'dropoff-marker',
          html: `
            <div style="
              background: #3b82f6;
              width: 30px;
              height: 30px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              border: 2px solid white;
              box-shadow: 0 2px 6px rgba(0,0,0,0.3);
              font-size: 14px;
            ">
              📍
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const dropoffMarker = L.marker(
          [delivery.dropoff_lat, delivery.dropoff_lng],
          { icon: dropoffIcon }
        )
          .addTo(map)
          .bindPopup(`Dropoff: ${delivery.order_number}`);

        markersRef.current.set(`dropoff-${delivery.id}`, dropoffMarker);
      }
    });
  }, [deliveries, drivers, filter]);

  const counts = {
    online: drivers.filter((driver) => driver.status === 'online' && getLocationHealth(driver.last_seen_at, driver.status).status === 'live').length,
    busy: drivers.filter((driver) => driver.status === 'busy' && getLocationHealth(driver.last_seen_at, driver.status).status === 'live').length,
    stale: drivers.filter((driver) => getLocationHealth(driver.last_seen_at, driver.status).status === 'stale').length,
    offline: drivers.filter((driver) => {
      const health = getLocationHealth(driver.last_seen_at, driver.status);
      return health.status === 'offline' || health.status === 'unknown';
    }).length,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 bg-surface p-4">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-primary text-white'
              : 'bg-surface text-textSubtle hover:bg-surface'
          }`}
        >
          All ({drivers.length})
        </button>
        <button
          onClick={() => setFilter('online')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'online'
              ? 'bg-success text-white'
              : 'bg-surface text-textSubtle hover:bg-surface'
          }`}
        >
          Online ({counts.online})
        </button>
        <button
          onClick={() => setFilter('busy')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'busy'
              ? 'bg-primary text-white'
              : 'bg-surface text-textSubtle hover:bg-surface'
          }`}
        >
          Busy ({counts.busy})
        </button>
        <button
          onClick={() => setFilter('offline')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'offline'
              ? 'bg-surfaceMuted text-white'
              : 'bg-surface text-textSubtle hover:bg-surface'
          }`}
        >
          Offline ({counts.offline})
        </button>
      </div>

      <div ref={containerRef} className="flex-1" style={{ minHeight: '400px' }} />
      {!loading && drivers.length > 0 && (
        <div className="border-t border-border bg-surface px-4 py-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {drivers.slice(0, 8).map((driver) => {
              const health = getLocationHealth(driver.last_seen_at, driver.status);
              return (
                <span key={driver.id} className={`rounded-full px-2 py-1 ${locationHealthClass(health.status)}`}>
                  {driver.first_name} {driver.last_name}: {health.detail}
                </span>
              );
            })}
          </div>
        </div>
      )}
      {(loading || loadError || (drivers.length === 0 && deliveries.length === 0)) && (
        <div className="border-t border-border bg-surface px-4 py-3 text-sm">
          {loading && <p className="text-textMuted">Loading live map data...</p>}
          {loadError && <p className="text-danger">{loadError}</p>}
          {!loading && !loadError && drivers.length === 0 && deliveries.length === 0 && (
            <p className="text-textMuted">No live driver or delivery locations are currently available.</p>
          )}
        </div>
      )}

      <div className="border-t border-border bg-surface p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-success">{counts.online}</p>
            <p className="text-xs text-textMuted">Drivers Online</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">
              {deliveries.length}
            </p>
            <p className="text-xs text-textMuted">Active Deliveries</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-warning">{counts.stale}</p>
            <p className="text-xs text-textMuted">Stale GPS</p>
          </div>
        </div>
      </div>
    </div>
  );
}
