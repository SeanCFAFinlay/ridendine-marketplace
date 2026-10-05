'use client';

import { useEffect, useRef, useState } from 'react';
import type * as LeafletNS from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decodePolyline } from '@ridendine/routing';
import { DEFAULT_SERVICE_REGION_CENTER } from '@ridendine/engine';

export interface DeliveryDetailMapProps {
  pickup: {
    address: string;
    lat?: number | null;
    lng?: number | null;
  };
  dropoff: {
    address: string;
    lat?: number | null;
    lng?: number | null;
  };
  trackingBreadcrumbs?: Array<{
    id: string;
    lat: number;
    lng: number;
    recordedAt: string;
  }>;
  routePolyline?: string | null;
  driverName?: string | null;
  status?: string;
  className?: string;
}

export function DeliveryDetailMap({
  pickup,
  dropoff,
  trackingBreadcrumbs = [],
  routePolyline,
  driverName,
  status,
  className,
}: DeliveryDetailMapProps) {
  const [L, setL] = useState<typeof LeafletNS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markersLayerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const pathsLayerRef = useRef<LeafletNS.LayerGroup | null>(null);

  // Load Leaflet on client-side only
  useEffect(() => {
    let active = true;
    import('leaflet').then((leaflet) => {
      if (!active) return;
      setL(leaflet.default);
    });
    return () => {
      active = false;
    };
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(DEFAULT_SERVICE_REGION_CENTER, 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    pathsLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        markersLayerRef.current = null;
      }
      if (pathsLayerRef.current) {
        pathsLayerRef.current.clearLayers();
        pathsLayerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [L]);

  // Update markers, route polyline, and breadcrumbs trail
  useEffect(() => {
    if (!L) return;
    const map = mapRef.current;
    if (!map) return;

    if (markersLayerRef.current) markersLayerRef.current.clearLayers();
    if (pathsLayerRef.current) pathsLayerRef.current.clearLayers();

    const boundsPoints: LeafletNS.LatLng[] = [];

    // 1. Planned Route Polyline
    if (routePolyline) {
      try {
        const decoded = decodePolyline(routePolyline);
        if (decoded.length > 0) {
          const polylineLatLngs = decoded.map((p) => L.latLng(p.lat, p.lng));
          polylineLatLngs.forEach((pt) => boundsPoints.push(pt));
          const routeLine = L.polyline(polylineLatLngs, {
            color: '#64748b',
            weight: 4,
            dashArray: '6, 8',
            opacity: 0.75,
          });
          pathsLayerRef.current?.addLayer(routeLine);
        }
      } catch (err) {
        console.warn('Failed to decode route polyline:', err);
      }
    }

    // 2. Traveled Breadcrumb Trail
    if (trackingBreadcrumbs.length > 0) {
      const sortedCrumbs = [...trackingBreadcrumbs].sort(
        (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );

      const trailLatLngs = sortedCrumbs.map((c) => L.latLng(c.lat, c.lng));
      trailLatLngs.forEach((pt) => boundsPoints.push(pt));

      if (trailLatLngs.length >= 2) {
        const trailLine = L.polyline(trailLatLngs, {
          color: '#3b82f6',
          weight: 5,
          opacity: 0.9,
        });
        pathsLayerRef.current?.addLayer(trailLine);
      }

      // Small circular dots for historical breadcrumbs
      sortedCrumbs.slice(0, sortedCrumbs.length - 1).forEach((crumb, idx) => {
        const circle = L.circleMarker([crumb.lat, crumb.lng], {
          radius: 4,
          color: '#2563eb',
          fillColor: '#93c5fd',
          fillOpacity: 0.8,
          weight: 1,
        }).bindPopup(
          `<b>Breadcrumb #${idx + 1}</b><br/>Time: ${new Date(crumb.recordedAt).toLocaleTimeString()}<br/>Coords: ${crumb.lat.toFixed(5)}, ${crumb.lng.toFixed(5)}`
        );
        markersLayerRef.current?.addLayer(circle);
      });

      // Latest / Current Driver Position Marker
      const latestCrumb = sortedCrumbs[sortedCrumbs.length - 1];
      if (latestCrumb) {
        const latestIcon = L.divIcon({
          className: 'custom-driver-latest-marker',
          html: `
            <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
              <span style="
                position: absolute;
                width: 36px;
                height: 36px;
                border-radius: 9999px;
                background-color: rgba(59, 130, 246, 0.45);
                animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
              "></span>
              <div style="
                position: relative;
                background-color: #2563eb;
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

        const latestMarker = L.marker([latestCrumb.lat, latestCrumb.lng], {
          icon: latestIcon,
          title: `Latest: ${driverName ?? 'Driver'}`,
        }).bindPopup(`
          <div style="font-family: inherit; font-size: 12px;">
            <p style="font-weight: 700; color: #2563eb; margin: 0 0 4px 0;">Latest Driver GPS</p>
            <p style="margin: 0 0 2px 0;"><b>Driver:</b> ${driverName ?? 'Assigned Driver'}</p>
            <p style="margin: 0 0 2px 0;"><b>Recorded:</b> ${new Date(latestCrumb.recordedAt).toLocaleTimeString()}</p>
            <p style="margin: 0; font-family: monospace; color: #64748b;">${latestCrumb.lat.toFixed(5)}, ${latestCrumb.lng.toFixed(5)}</p>
          </div>
        `);
        markersLayerRef.current?.addLayer(latestMarker);
      }
    }

    // 3. Pickup Marker
    if (pickup.lat != null && pickup.lng != null) {
      const pickupPt = L.latLng(pickup.lat, pickup.lng);
      boundsPoints.push(pickupPt);

      const pickupIcon = L.divIcon({
        className: 'custom-ops-pickup-marker',
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
            🍳
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const pickupMarker = L.marker(pickupPt, {
        icon: pickupIcon,
        title: 'Pickup Location',
      }).bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <p style="font-weight: 700; color: #10b981; margin: 0 0 4px 0;">Pickup Location</p>
          <p style="margin: 0 0 2px 0;">${pickup.address}</p>
          <p style="margin: 0; font-family: monospace; color: #64748b;">${pickup.lat.toFixed(5)}, ${pickup.lng.toFixed(5)}</p>
        </div>
      `);
      markersLayerRef.current?.addLayer(pickupMarker);
    }

    // 4. Dropoff Marker
    if (dropoff.lat != null && dropoff.lng != null) {
      const dropoffPt = L.latLng(dropoff.lat, dropoff.lng);
      boundsPoints.push(dropoffPt);

      const dropoffIcon = L.divIcon({
        className: 'custom-ops-dropoff-marker',
        html: `
          <div style="
            background-color: #ef4444;
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

      const dropoffMarker = L.marker(dropoffPt, {
        icon: dropoffIcon,
        title: 'Dropoff Location',
      }).bindPopup(`
        <div style="font-family: inherit; font-size: 12px;">
          <p style="font-weight: 700; color: #ef4444; margin: 0 0 4px 0;">Dropoff Destination</p>
          <p style="margin: 0 0 2px 0;">${dropoff.address}</p>
          <p style="margin: 0; font-family: monospace; color: #64748b;">${dropoff.lat.toFixed(5)}, ${dropoff.lng.toFixed(5)}</p>
        </div>
      `);
      markersLayerRef.current?.addLayer(dropoffMarker);
    }

    // Auto-fit bounds if points exist
    if (boundsPoints.length > 0) {
      const bounds = L.latLngBounds(boundsPoints);
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    } else {
      map.setView(DEFAULT_SERVICE_REGION_CENTER, 13);
    }
  }, [L, pickup, dropoff, trackingBreadcrumbs, routePolyline, driverName]);

  const hasCoords =
    (pickup.lat != null && pickup.lng != null) ||
    (dropoff.lat != null && dropoff.lng != null) ||
    trackingBreadcrumbs.length > 0;

  const latestPing =
    trackingBreadcrumbs.length > 0
      ? trackingBreadcrumbs[trackingBreadcrumbs.length - 1]?.recordedAt
      : null;

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-surface ${className ?? ''}`}>
      <div className="flex flex-wrap items-center justify-between border-b border-border px-4 py-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white">Route & Driver GPS Trail</p>
            {status && (
              <span className="rounded-full bg-surfaceMuted px-2 py-0.5 text-[11px] uppercase tracking-wide text-textSubtle">
                {status}
              </span>
            )}
          </div>
          <p className="text-xs text-textMuted">
            {latestPing
              ? `Latest GPS ping ${new Date(latestPing).toLocaleTimeString()}`
              : trackingBreadcrumbs.length === 0
                ? 'Awaiting live driver GPS breadcrumbs'
                : 'GPS breadcrumb telemetry active'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-info/10 px-2.5 py-1 text-xs font-medium text-info">
            {trackingBreadcrumbs.length} breadcrumb pings
          </span>
          {driverName && (
            <span className="rounded-full bg-surfaceMuted px-2.5 py-1 text-xs text-textSubtle">
              Driver: {driverName}
            </span>
          )}
        </div>
      </div>

      {!hasCoords ? (
        <div className="flex min-h-[300px] items-center justify-center p-6 text-sm text-textMuted">
          No GPS coordinates or route available for this delivery yet.
        </div>
      ) : (
        <div ref={containerRef} className="h-[360px] w-full" />
      )}
    </div>
  );
}
