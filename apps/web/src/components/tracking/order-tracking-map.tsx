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
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const defaultCenter = DEFAULT_SERVICE_REGION_CENTER;
    mapRef.current = L.map(containerRef.current).setView(defaultCenter, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(mapRef.current);

    markersLayerRef.current = L.layerGroup().addTo(mapRef.current);

    return () => {
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        markersLayerRef.current = null;
      }
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
    if (markersLayerRef.current) {
      markersLayerRef.current.clearLayers();
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
      const prog = L.polyline(progressPts, { color: '#EA5B26', weight: 6, opacity: 1 }).addTo(map);
      progressLayerRef.current = prog;
    }

    // Add markers for Pickup, Dropoff, and Courier progress
    if (markersLayerRef.current) {
      const pickupIcon = L.divIcon({
        className: 'custom-pickup-marker',
        html: `
          <div style="
            background-color: #1e293b;
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 9999px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25);
            font-size: 14px;
          ">
            🍳
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const dropoffIcon = L.divIcon({
        className: 'custom-dropoff-marker',
        html: `
          <div style="
            background-color: #10b981;
            color: #ffffff;
            border: 2px solid #ffffff;
            border-radius: 9999px;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 6px -1px rgba(0,0,0,0.25);
            font-size: 14px;
          ">
            📍
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const courierIcon = L.divIcon({
        className: 'custom-courier-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <span style="
              position: absolute;
              width: 36px;
              height: 36px;
              border-radius: 9999px;
              background-color: rgba(234, 91, 38, 0.4);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></span>
            <div style="
              position: relative;
              background-color: #EA5B26;
              color: #ffffff;
              border: 2px solid #ffffff;
              border-radius: 9999px;
              width: 28px;
              height: 28px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
              font-size: 13px;
            ">
              🛵
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      // Pickup marker
      const pickupPt = latLngs[0];
      if (pickupPt) {
        const pickupMarker = L.marker(pickupPt, { icon: pickupIcon, title: 'Store Pickup' }).bindPopup(
          '<b>Store / Kitchen</b>'
        );
        markersLayerRef.current.addLayer(pickupMarker);
      }

      // Dropoff marker
      const dropoffPt = latLngs[latLngs.length - 1];
      if (dropoffPt) {
        const dropoffMarker = L.marker(dropoffPt, {
          icon: dropoffIcon,
          title: 'Delivery Destination',
        }).bindPopup(
          dropoffAddress ? `<b>Destination:</b><br/>${dropoffAddress}` : '<b>Destination</b>'
        );
        markersLayerRef.current.addLayer(dropoffMarker);
      }

      // Courier progress marker
      const courierPt = progressPts.length > 0 ? progressPts[progressPts.length - 1] : pickupPt;
      if (courierPt) {
        const pctText = p > 0 ? `${p}% completed` : 'Courier en route';
        const courierMarker = L.marker(courierPt, { icon: courierIcon, title: 'Courier' }).bindPopup(
          `<b>Courier Progress</b><br/>${pctText}`
        );
        markersLayerRef.current.addLayer(courierMarker);
      }
    }

    map.fitBounds(full.getBounds(), { padding: [24, 24], maxZoom: 15 });
  }, [polyline, progressPct, etaDropoffAt, dropoffAddress]);

  return (
    <div className="space-y-2">
      {etaDropoffAt && (
        <p className="px-1 text-xs text-textMuted">
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
