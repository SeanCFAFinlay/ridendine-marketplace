'use client';

import { useEffect, useRef, useState } from 'react';
import type * as LeafletNS from 'leaflet';
import { decodePolyline } from '@ridendine/routing';
import { DEFAULT_SERVICE_REGION_CENTER } from '@ridendine/engine';

export interface RouteMapProps {
  pickupLat?: number | null;
  pickupLng?: number | null;
  pickupAddress?: string;
  dropoffLat?: number | null;
  dropoffLng?: number | null;
  dropoffAddress?: string;
  driverLat?: number | null;
  driverLng?: number | null;
  polyline?: string | null;
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
  polyline,
  className,
}: RouteMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const routeLayerRef = useRef<LeafletNS.Polyline | null>(null);
  const pickupMarkerRef = useRef<LeafletNS.Marker | null>(null);
  const dropoffMarkerRef = useRef<LeafletNS.Marker | null>(null);
  const driverMarkerRef = useRef<LeafletNS.Marker | null>(null);
  const [L, setL] = useState<typeof LeafletNS | null>(null);

  // Load Leaflet on client side only
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

  // Initialize Map
  useEffect(() => {
    if (!L || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(DEFAULT_SERVICE_REGION_CENTER, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Invalidate size once rendered in case container size shifted
    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      routeLayerRef.current = null;
      pickupMarkerRef.current = null;
      dropoffMarkerRef.current = null;
      driverMarkerRef.current = null;
    };
  }, [L]);

  // Update Markers, Route Polyline, and Fit Bounds
  useEffect(() => {
    const map = mapRef.current;
    if (!L || !map) return;

    // Clear existing layers
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
      routeLayerRef.current = null;
    }
    if (pickupMarkerRef.current) {
      map.removeLayer(pickupMarkerRef.current);
      pickupMarkerRef.current = null;
    }
    if (dropoffMarkerRef.current) {
      map.removeLayer(dropoffMarkerRef.current);
      dropoffMarkerRef.current = null;
    }
    if (driverMarkerRef.current) {
      map.removeLayer(driverMarkerRef.current);
      driverMarkerRef.current = null;
    }

    const boundsPoints: LeafletNS.LatLng[] = [];

    // Custom Icon Creators using DivIcons (CSS styled, zero external image assets required)
    const createPickupIcon = () =>
      L.divIcon({
        className: 'route-pickup-marker',
        html: `
          <div style="background:#16a34a;color:#fff;border-radius:20px;padding:4px 8px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;box-shadow:0 3px 6px rgba(0,0,0,0.3);border:2px solid #fff;white-space:nowrap;">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"/></svg>
            <span>Pickup</span>
          </div>
        `,
        iconSize: [68, 26],
        iconAnchor: [34, 13],
      });

    const createDropoffIcon = () =>
      L.divIcon({
        className: 'route-dropoff-marker',
        html: `
          <div style="background:#EA5B26;color:#fff;border-radius:20px;padding:4px 8px;font-size:11px;font-weight:700;display:flex;align-items:center;gap:4px;box-shadow:0 3px 6px rgba(0,0,0,0.3);border:2px solid #fff;white-space:nowrap;">
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            <span>Dropoff</span>
          </div>
        `,
        iconSize: [72, 26],
        iconAnchor: [36, 13],
      });

    const createDriverIcon = () =>
      L.divIcon({
        className: 'route-driver-marker',
        html: `
          <div style="position:relative;width:32px;height:32px;display:flex;align-items:center;justify-content:center;">
            <span style="position:absolute;width:32px;height:32px;border-radius:50%;background:rgba(37,99,235,0.3);animation:ping 1.8s cubic-bezier(0,0,0.2,1) infinite;"></span>
            <div style="background:#2563eb;color:#fff;border-radius:50%;width:22px;height:22px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.4);border:2.5px solid #fff;z-index:2;">
              <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

    // 1. Pickup Marker
    if (typeof pickupLat === 'number' && typeof pickupLng === 'number' && Number.isFinite(pickupLat) && Number.isFinite(pickupLng)) {
      const pickupPos = L.latLng(pickupLat, pickupLng);
      boundsPoints.push(pickupPos);
      const marker = L.marker(pickupPos, { icon: createPickupIcon() }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px;">
          <strong style="color: #16a34a;">Pickup Location</strong><br/>
          <span>${pickupAddress || 'Restaurant'}</span>
        </div>
      `);
      pickupMarkerRef.current = marker;
    }

    // 2. Dropoff Marker
    if (typeof dropoffLat === 'number' && typeof dropoffLng === 'number' && Number.isFinite(dropoffLat) && Number.isFinite(dropoffLng)) {
      const dropoffPos = L.latLng(dropoffLat, dropoffLng);
      boundsPoints.push(dropoffPos);
      const marker = L.marker(dropoffPos, { icon: createDropoffIcon() }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px;">
          <strong style="color: #EA5B26;">Dropoff Location</strong><br/>
          <span>${dropoffAddress || 'Customer Address'}</span>
        </div>
      `);
      dropoffMarkerRef.current = marker;
    }

    // 3. Driver GPS Marker
    if (typeof driverLat === 'number' && typeof driverLng === 'number' && Number.isFinite(driverLat) && Number.isFinite(driverLng)) {
      const driverPos = L.latLng(driverLat, driverLng);
      boundsPoints.push(driverPos);
      const marker = L.marker(driverPos, { icon: createDriverIcon() }).addTo(map);
      marker.bindPopup(`
        <div style="font-family: inherit; font-size: 13px;">
          <strong style="color: #2563eb;">Your Location (GPS)</strong><br/>
          <span style="font-size: 11px; color: #6b7280;">${driverLat.toFixed(5)}, ${driverLng.toFixed(5)}</span>
        </div>
      `);
      driverMarkerRef.current = marker;
    }

    // 4. Route Polyline
    if (polyline) {
      try {
        const decoded = decodePolyline(polyline);
        if (decoded.length >= 2) {
          const latLngs = decoded.map((p) => L.latLng(p.lat, p.lng));
          latLngs.forEach((pt) => boundsPoints.push(pt));
          const line = L.polyline(latLngs, {
            color: '#EA5B26',
            weight: 5,
            opacity: 0.9,
            lineJoin: 'round',
          }).addTo(map);
          routeLayerRef.current = line;
        }
      } catch {
        // Fall back to connecting available points if decoding fails
      }
    }

    // Fallback connecting polyline if decoded line wasn't drawn
    if (!routeLayerRef.current && boundsPoints.length >= 2) {
      const fallbackPoints: LeafletNS.LatLng[] = [];
      if (driverLat != null && driverLng != null) fallbackPoints.push(L.latLng(driverLat, driverLng));
      if (pickupLat != null && pickupLng != null) fallbackPoints.push(L.latLng(pickupLat, pickupLng));
      if (dropoffLat != null && dropoffLng != null) fallbackPoints.push(L.latLng(dropoffLat, dropoffLng));

      if (fallbackPoints.length >= 2) {
        const line = L.polyline(fallbackPoints, {
          color: '#EA5B26',
          weight: 4,
          opacity: 0.8,
          dashArray: '8, 8',
        }).addTo(map);
        routeLayerRef.current = line;
      }
    }

    // 5. Fit bounds smoothly
    if (boundsPoints.length >= 2) {
      map.fitBounds(L.latLngBounds(boundsPoints), {
        padding: [36, 36],
        maxZoom: 16,
      });
    } else if (boundsPoints.length === 1 && boundsPoints[0]) {
      map.setView(boundsPoints[0], 15);
    } else {
      map.setView(DEFAULT_SERVICE_REGION_CENTER, 13);
    }
  }, [L, pickupLat, pickupLng, pickupAddress, dropoffLat, dropoffLng, dropoffAddress, driverLat, driverLng, polyline]);

  return (
    <div className={`relative ${className || 'h-52 w-full'}`}>
      <link
        rel="stylesheet"
        href="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/leaflet.css"
      />
      {!L && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-surfaceMuted">
          <span className="text-xs text-textMuted">Loading map & GPS...</span>
        </div>
      )}
      <div
        ref={containerRef}
        className="h-full w-full rounded-inherit"
        style={{ minHeight: '180px' }}
      />
    </div>
  );
}
