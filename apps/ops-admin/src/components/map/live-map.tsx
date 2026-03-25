'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { createBrowserClient } from '@ridendine/db';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  active_delivery_id: string | null;
}

interface Delivery {
  id: string;
  order_number: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  status: string;
  driver_id: string | null;
}

export default function LiveMap() {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [filter, setFilter] = useState<'all' | 'online' | 'busy' | 'offline'>('all');

  const supabase = useMemo(() => createBrowserClient(), []);

  const fetchData = useCallback(async () => {
    if (!supabase) return;

    const db = supabase;

    // Fetch drivers with presence data
    const { data: driverData } = await db
      .from('driver_profiles')
      .select(`
        id,
        first_name,
        last_name,
        status,
        driver_presence (
          status,
          current_lat,
          current_lng
        )
      `)
      .eq('status', 'approved');

    if (driverData) {
      const mappedDrivers = driverData.map((d: any) => ({
        id: d.id,
        first_name: d.first_name,
        last_name: d.last_name,
        status: d.driver_presence?.[0]?.status || 'offline',
        current_lat: d.driver_presence?.[0]?.current_lat,
        current_lng: d.driver_presence?.[0]?.current_lng,
        active_delivery_id: null,
      }));
      setDrivers(mappedDrivers);
    }

    // Fetch active deliveries
    const { data: deliveryData } = await db
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
      .in('status', ['assigned', 'accepted', 'en_route_to_pickup', 'picked_up', 'en_route_to_dropoff']);

    if (deliveryData) {
      const mappedDeliveries = deliveryData.map((d: any) => ({
        id: d.id,
        order_number: d.orders?.order_number || 'Unknown',
        pickup_lat: d.pickup_lat,
        pickup_lng: d.pickup_lng,
        dropoff_lat: d.dropoff_lat,
        dropoff_lng: d.dropoff_lng,
        status: d.status,
        driver_id: d.driver_id,
      }));
      setDeliveries(mappedDeliveries);
    }
  }, [supabase]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Hamilton, ON center
    mapRef.current = L.map(containerRef.current).setView([43.2557, -79.8711], 12);

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

  // Subscribe to real-time updates
  useEffect(() => {
    if (!supabase) return;

    const db = supabase;
    fetchData();

    const channel = db
      .channel('live-map')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'driver_presence' },
        () => fetchData()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'deliveries' },
        () => fetchData()
      )
      .subscribe();

    const interval = setInterval(fetchData, 30000);

    return () => {
      db.removeChannel(channel);
      clearInterval(interval);
    };
  }, [fetchData, supabase]);

  // Update markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Filter drivers
    const filteredDrivers = drivers.filter((d) => {
      if (filter === 'all') return true;
      if (filter === 'online') return d.status === 'online';
      if (filter === 'busy') return d.status === 'busy';
      if (filter === 'offline') return d.status === 'offline';
      return true;
    });

    // Add driver markers
    filteredDrivers.forEach((driver) => {
      if (!driver.current_lat || !driver.current_lng) return;

      const color = driver.status === 'online' ? '#22c55e' : driver.status === 'busy' ? '#f97316' : '#64748b';

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
        .addTo(mapRef.current!)
        .bindPopup(`
          <div style="min-width: 150px;">
            <strong>${driver.first_name} ${driver.last_name}</strong>
            <br/>
            <span style="color: ${color}; font-weight: 500;">${driver.status.toUpperCase()}</span>
          </div>
        `);

      markersRef.current.set(`driver-${driver.id}`, marker);
    });

    // Add delivery markers (restaurants and drop-offs)
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

        const marker = L.marker([delivery.pickup_lat, delivery.pickup_lng], { icon: pickupIcon })
          .addTo(mapRef.current!)
          .bindPopup(`Pickup: ${delivery.order_number}`);

        markersRef.current.set(`pickup-${delivery.id}`, marker);
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

        const marker = L.marker([delivery.dropoff_lat, delivery.dropoff_lng], { icon: dropoffIcon })
          .addTo(mapRef.current!)
          .bindPopup(`Dropoff: ${delivery.order_number}`);

        markersRef.current.set(`dropoff-${delivery.id}`, marker);
      }
    });
  }, [drivers, deliveries, filter]);

  const counts = {
    online: drivers.filter((d) => d.status === 'online').length,
    busy: drivers.filter((d) => d.status === 'busy').length,
    offline: drivers.filter((d) => d.status === 'offline').length,
  };

  return (
    <div className="h-full flex flex-col">
      {/* Filter buttons */}
      <div className="flex gap-2 p-4 bg-[#1a1a2e]">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-[#E85D26] text-white' : 'bg-[#16213e] text-gray-300 hover:bg-[#1a1a2e]'
          }`}
        >
          All ({drivers.length})
        </button>
        <button
          onClick={() => setFilter('online')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'online' ? 'bg-green-600 text-white' : 'bg-[#16213e] text-gray-300 hover:bg-[#1a1a2e]'
          }`}
        >
          Online ({counts.online})
        </button>
        <button
          onClick={() => setFilter('busy')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'busy' ? 'bg-orange-600 text-white' : 'bg-[#16213e] text-gray-300 hover:bg-[#1a1a2e]'
          }`}
        >
          Busy ({counts.busy})
        </button>
        <button
          onClick={() => setFilter('offline')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            filter === 'offline' ? 'bg-gray-600 text-white' : 'bg-[#16213e] text-gray-300 hover:bg-[#1a1a2e]'
          }`}
        >
          Offline ({counts.offline})
        </button>
      </div>

      {/* Map container */}
      <div ref={containerRef} className="flex-1" style={{ minHeight: '400px' }} />

      {/* Stats sidebar */}
      <div className="p-4 bg-[#16213e] border-t border-gray-800">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-400">{counts.online}</p>
            <p className="text-xs text-gray-400">Drivers Online</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-400">{deliveries.length}</p>
            <p className="text-xs text-gray-400">Active Deliveries</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">
              {deliveries.filter((d) => !d.driver_id).length}
            </p>
            <p className="text-xs text-gray-400">Unassigned</p>
          </div>
        </div>
      </div>
    </div>
  );
}
