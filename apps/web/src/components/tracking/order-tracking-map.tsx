'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decodePolyline } from '@ridendine/routing';
import { DEFAULT_SERVICE_REGION_CENTER } from '@ridendine/engine';

export interface OrderTrackingMapProps {
  /** Encoded polyline (Google/OSRM); route only, no live GPS */
  polyline: string | null;
  /** 0–100 along the dropoff route */
  progressPct: number | null;
  etaDropoffAt: string | null;
  dropoffAddress: string;
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

export default function OrderTrackingMap({
  polyline,
  progressPct,
  etaDropoffAt,
  dropoffAddress,
}: OrderTrackingMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const progressLayerRef = useRef<L.Polyline | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter = DEFAULT_SERVICE_REGION_CENTER;
    mapRef.current = L.map(containerRef.current).setView(defaultCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      routeLayerRef.current = null;
      progressLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const pts = polyline ? decodePolyline(polyline) : [];
    const latLngs = pts.map((p) => L.latLng(p.lat, p.lng));

    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (progressLayerRef.current) {
      map.removeLayer(progressLayerRef.current);
      progressLayerRef.current = null;
    }

    if (latLngs.length < 2) {
      map.setView(DEFAULT_SERVICE_REGION_CENTER, 13);
      return;
    }

    const full = L.polyline(latLngs, { color: '#d1d5db', weight: 5, opacity: 0.9 }).addTo(map);
    routeLayerRef.current = full;

    const p = clampPct(progressPct ?? 0);
    const cut = Math.max(1, Math.ceil((latLngs.length - 1) * (p / 100)) + 1);
    const progressPts = latLngs.slice(0, Math.min(cut, latLngs.length));
    if (progressPts.length >= 2) {
      const prog = L.polyline(progressPts, { color: '#E85D26', weight: 6, opacity: 1 }).addTo(map);
      progressLayerRef.current = prog;
    }

    map.fitBounds(full.getBounds(), { padding: [24, 24], maxZoom: 15 });
  }, [polyline, progressPct, etaDropoffAt, dropoffAddress]);

  return (
    <div className="space-y-2">
      {etaDropoffAt && (
        <p className="px-1 text-xs text-gray-600">
          ETA:{' '}
          <time dateTime={etaDropoffAt}>
            {new Date(etaDropoffAt).toLocaleString(undefined, {
              hour: 'numeric',
              minute: '2-digit',
              month: 'short',
              day: 'numeric',
            })}
          </time>
        </p>
      )}
      <p className="sr-only">Deliver to {dropoffAddress}</p>
      <div
        ref={containerRef}
        className="h-full w-full rounded-lg"
        style={{ minHeight: '256px' }}
      />
    </div>
  );
}
