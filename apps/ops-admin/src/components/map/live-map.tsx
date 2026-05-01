'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createBrowserClient, opsLiveMapChannel } from '@ridendine/db';
import { DEFAULT_SERVICE_REGION_CENTER, DEFAULT_MAP_ZOOM } from '@ridendine/engine';

type DriverMapRow = {
  id: string;
  first_name: string;
  last_name: string;
  driver_presence:
    | {
        status: string;
        last_location_lat: number | null;
        last_location_lng: number | null;
      }
    | {
        status: string;
        last_location_lat: number | null;
        last_location_lng: number | null;
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
      const { data: driverData } = await client
        .from('drivers')
        .select(`
          id,
          first_name,
          last_name,
          driver_presence (
            status,
            last_location_lat,
            last_location_lng
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
      return driver.status === filter;
    });

    filteredDrivers.forEach((driver) => {
      if (!driver.current_lat || !driver.current_lng) return;

      const color =
        driver.status === 'online'
          ? '#22c55e'
          : driver.status === 'busy'
            ? '#f97316'
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
              background: #E85D26;
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
    online: drivers.filter((driver) => driver.status === 'online').length,
    busy: drivers.filter((driver) => driver.status === 'busy').length,
    offline: drivers.filter((driver) => driver.status === 'offline').length,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 bg-[#1a1a2e] p-4">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-[#E85D26] text-white'
              : 'bg-[#16213e] text-gray-300 hover:bg-[#1a1a2e]'
          }`}
        >
          All ({drivers.length})
        </button>
        <button
          onClick={() => setFilter('online')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'online'
              ? 'bg-green-600 text-white'
              : 'bg-[#16213e] text-gray-300 hover:bg-[#1a1a2e]'
          }`}
        >
          Online ({counts.online})
        </button>
        <button
          onClick={() => setFilter('busy')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'busy'
              ? 'bg-orange-600 text-white'
              : 'bg-[#16213e] text-gray-300 hover:bg-[#1a1a2e]'
          }`}
        >
          Busy ({counts.busy})
        </button>
        <button
          onClick={() => setFilter('offline')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'offline'
              ? 'bg-gray-600 text-white'
              : 'bg-[#16213e] text-gray-300 hover:bg-[#1a1a2e]'
          }`}
        >
          Offline ({counts.offline})
        </button>
      </div>

      <div ref={containerRef} className="flex-1" style={{ minHeight: '400px' }} />

      <div className="border-t border-gray-800 bg-[#16213e] p-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-400">{counts.online}</p>
            <p className="text-xs text-gray-400">Drivers Online</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">
              {deliveries.length}
            </p>
            <p className="text-xs text-gray-400">Active Deliveries</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">
              {deliveries.filter((delivery) => !delivery.driver_id).length}
            </p>
            <p className="text-xs text-gray-400">Unassigned</p>
          </div>
        </div>
      </div>
    </div>
  );
}
