'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import type * as LeafletNS from 'leaflet';
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

interface RouteMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupAddress?: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  dropoffAddress?: string;
  driverLat?: number | null;
  driverLng?: number | null;
  className?: string;
}


export function RouteMap({
  pickupLat,
  pickupLng,
  pickupAddress,
  dropoffLat,
  dropoffLng,
  dropoffAddress,
  driverLat,
  driverLng,
  className,
}: RouteMapProps) {
  const [isMounted, setIsMounted] = useState(false);
  const [L, setL] = useState<typeof LeafletNS | null>(null);

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
      <div className={`bg-gray-100 rounded-lg flex items-center justify-center ${className}`}>
        <span className="text-gray-500">Loading map...</span>
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

  const driverIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  // Calculate center based on available coordinates
  const getCenter = (): [number, number] => {
    if (pickupLat && pickupLng) {
      return [pickupLat, pickupLng];
    }
    if (dropoffLat && dropoffLng) {
      return [dropoffLat, dropoffLng];
    }
    if (driverLat && driverLng) {
      return [driverLat, driverLng];
    }
    return DEFAULT_SERVICE_REGION_CENTER;
  };

  const hasPickup = pickupLat && pickupLng;
  const hasDropoff = dropoffLat && dropoffLng;
  const hasDriver = driverLat && driverLng;

  // Build route line
  const routePoints: [number, number][] = [];
  if (hasDriver) routePoints.push([driverLat!, driverLng!]);
  if (hasPickup) routePoints.push([pickupLat!, pickupLng!]);
  if (hasDropoff) routePoints.push([dropoffLat!, dropoffLng!]);

  return (
    <div className={className}>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css"
      />
      <MapContainer
        center={getCenter()}
        zoom={14}
        style={{ height: '100%', width: '100%', borderRadius: '0.5rem' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {hasPickup && (
          <Marker position={[pickupLat!, pickupLng!]} icon={pickupIcon}>
            <Popup>
              <div className="text-sm">
                <strong className="text-green-600">Pickup</strong>
                <br />
                {pickupAddress || 'Restaurant'}
              </div>
            </Popup>
          </Marker>
        )}

        {hasDropoff && (
          <Marker position={[dropoffLat!, dropoffLng!]} icon={dropoffIcon}>
            <Popup>
              <div className="text-sm">
                <strong className="text-red-600">Dropoff</strong>
                <br />
                {dropoffAddress || 'Customer'}
              </div>
            </Popup>
          </Marker>
        )}

        {hasDriver && (
          <Marker position={[driverLat!, driverLng!]} icon={driverIcon}>
            <Popup>
              <div className="text-sm">
                <strong className="text-blue-600">Your Location</strong>
              </div>
            </Popup>
          </Marker>
        )}

        {routePoints.length >= 2 && (
          <Polyline
            positions={routePoints}
            color="#E85D26"
            weight={4}
            opacity={0.8}
            dashArray="10, 10"
          />
        )}
      </MapContainer>
    </div>
  );
}
