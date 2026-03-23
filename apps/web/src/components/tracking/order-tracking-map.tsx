'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface OrderTrackingMapProps {
  driverLocation: { lat: number; lng: number } | null;
  dropoffAddress: string;
}

export default function OrderTrackingMap({
  driverLocation,
  dropoffAddress,
}: OrderTrackingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const driverMarkerRef = useRef<L.Marker | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center: Hamilton, ON
    const defaultCenter: [number, number] = [43.2557, -79.8711];

    mapRef.current = L.map(containerRef.current).setView(
      driverLocation ? [driverLocation.lat, driverLocation.lng] : defaultCenter,
      14
    );

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
    if (!mapRef.current || !driverLocation) return;

    // Create or update driver marker
    const driverIcon = L.divIcon({
      className: 'driver-marker',
      html: `
        <div style="
          background: #E85D26;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          font-size: 20px;
        ">
          🚗
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setLatLng([driverLocation.lat, driverLocation.lng]);
    } else {
      driverMarkerRef.current = L.marker([driverLocation.lat, driverLocation.lng], {
        icon: driverIcon,
      }).addTo(mapRef.current);
    }

    // Pan to driver location
    mapRef.current.panTo([driverLocation.lat, driverLocation.lng]);
  }, [driverLocation]);

  return (
    <div
      ref={containerRef}
      className="h-full w-full rounded-lg"
      style={{ minHeight: '256px' }}
    />
  );
}
