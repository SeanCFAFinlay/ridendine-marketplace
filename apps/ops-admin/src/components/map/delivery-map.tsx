'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { DEFAULT_SERVICE_REGION_CENTER } from '@ridendine/engine';

// Dynamically import Leaflet components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);
const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);
const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

interface Delivery {
  id: string;
  order_number?: string;
  status: string;
  pickup_lat: number | null;
  pickup_lng: number | null;
  pickup_address: string;
  dropoff_lat: number | null;
  dropoff_lng: number | null;
  dropoff_address: string;
  driver_name?: string;
}

interface DeliveryMapProps {
  deliveries: Delivery[];
  className?: string;
}


export function DeliveryMap({ deliveries, className }: DeliveryMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [L, setL] = useState<typeof import('leaflet') | null>(null);

  useEffect(() => {
    setIsMounted(true);
    // Import Leaflet only on client
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
      // Fix default marker icons
      delete (leaflet.default.Icon.Default.prototype as any)._getIconUrl;
      leaflet.default.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
    });
  }, []);

  if (!isMounted || !L) {
    return (
      <div className={`bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-gray-400">Loading map...</span>
      </div>
    );
  }

  // Create custom icons
  const pickupIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const dropoffIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const inTransitIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return '#22c55e'; // green
      case 'en_route_to_pickup':
      case 'en_route_to_dropoff':
      case 'picked_up':
        return '#f97316'; // orange
      default:
        return '#ef4444'; // red
    }
  };

  return (
    <div className={className}>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css"
      />
      <MapContainer
        center={DEFAULT_SERVICE_REGION_CENTER}
        zoom={13}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {deliveries.map((delivery) => {
          const hasPickup = delivery.pickup_lat && delivery.pickup_lng;
          const hasDropoff = delivery.dropoff_lat && delivery.dropoff_lng;

          return (
            <div key={delivery.id}>
              {hasPickup && (
                <Marker
                  position={[delivery.pickup_lat!, delivery.pickup_lng!]}
                  icon={pickupIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>Pickup</strong>
                      <br />
                      {delivery.pickup_address}
                      {delivery.order_number && (
                        <>
                          <br />
                          Order: {delivery.order_number}
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
              {hasDropoff && (
                <Marker
                  position={[delivery.dropoff_lat!, delivery.dropoff_lng!]}
                  icon={dropoffIcon}
                >
                  <Popup>
                    <div className="text-sm">
                      <strong>Dropoff</strong>
                      <br />
                      {delivery.dropoff_address}
                      {delivery.driver_name && (
                        <>
                          <br />
                          Driver: {delivery.driver_name}
                        </>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
              {hasPickup && hasDropoff && (
                <Polyline
                  positions={[
                    [delivery.pickup_lat!, delivery.pickup_lng!],
                    [delivery.dropoff_lat!, delivery.dropoff_lng!],
                  ]}
                  color={getStatusColor(delivery.status)}
                  weight={3}
                  opacity={0.7}
                  dashArray="10, 10"
                />
              )}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
