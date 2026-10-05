'use client';

import { useEffect, useRef, useState } from 'react';
import type * as LeafletNS from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { decodePolyline } from '@ridendine/routing';
import { DEFAULT_SERVICE_REGION_CENTER } from '@ridendine/engine';

export interface Delivery {
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
  route_polyline?: string | null;
}

export type OpsDriverPin = {
  id: string;
  lat: number;
  lng: number;
  label: string;
};

export interface DeliveryMapProps {
  deliveries: Delivery[];
  className?: string;
  driverPins?: OpsDriverPin[];
  highlightedDeliveryId?: string | null;
  onDeliveryClick?: (deliveryId: string) => void;
}

function formatCoord(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return 'No coordinates';
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function statusClass(status: string) {
  if (status === 'delivered' || status === 'completed') return 'border-success/40 bg-success/10 text-success';
  if (status.includes('route') || status.includes('picked')) return 'border-primary/40 bg-primary/10 text-primary';
  return 'border-border bg-text/60 text-textSubtle';
}

export function DeliveryMap({
  deliveries,
  className,
  driverPins = [],
  highlightedDeliveryId = null,
  onDeliveryClick,
}: DeliveryMapProps) {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [L, setL] = useState<typeof LeafletNS | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletNS.Map | null>(null);
  const markersLayerRef = useRef<LeafletNS.LayerGroup | null>(null);
  const routesLayerRef = useRef<LeafletNS.LayerGroup | null>(null);

  const hasPins = deliveries.length > 0 || driverPins.length > 0;

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
    if (!L || viewMode !== 'map' || !containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(DEFAULT_SERVICE_REGION_CENTER, 12);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(map);

    routesLayerRef.current = L.layerGroup().addTo(map);
    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      if (markersLayerRef.current) {
        markersLayerRef.current.clearLayers();
        markersLayerRef.current = null;
      }
      if (routesLayerRef.current) {
        routesLayerRef.current.clearLayers();
        routesLayerRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [L, viewMode]);

  // Update map contents
  useEffect(() => {
    if (!L || viewMode !== 'map') return;
    const map = mapRef.current;
    if (!map) return;

    if (markersLayerRef.current) markersLayerRef.current.clearLayers();
    if (routesLayerRef.current) routesLayerRef.current.clearLayers();

    const allPoints: LeafletNS.LatLng[] = [];

    // Render Deliveries
    deliveries.forEach((delivery) => {
      const isHighlighted = highlightedDeliveryId === delivery.id;

      // Pickup pin
      if (delivery.pickup_lat != null && delivery.pickup_lng != null) {
        const pickupPt = L.latLng(delivery.pickup_lat, delivery.pickup_lng);
        allPoints.push(pickupPt);

        const pickupIcon = L.divIcon({
          className: 'ops-pickup-pin',
          html: `
            <div style="
              background-color: ${isHighlighted ? '#f59e0b' : '#10b981'};
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
              cursor: pointer;
            ">
              🍳
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const pickupMarker = L.marker(pickupPt, { icon: pickupIcon, title: `Pickup: ${delivery.pickup_address}` });
        pickupMarker.bindPopup(`
          <div style="font-size: 12px; font-family: inherit;">
            <p style="font-weight: 700; color: #10b981; margin: 0 0 4px 0;">Pickup · ${delivery.order_number ?? delivery.id.slice(0, 8)}</p>
            <p style="margin: 0 0 2px 0;">${delivery.pickup_address}</p>
            <p style="margin: 0 0 2px 0;"><b>Status:</b> ${delivery.status}</p>
            <p style="margin: 0; font-family: monospace; color: #64748b;">${formatCoord(delivery.pickup_lat, delivery.pickup_lng)}</p>
          </div>
        `);
        pickupMarker.on('click', () => onDeliveryClick?.(delivery.id));
        markersLayerRef.current?.addLayer(pickupMarker);
      }

      // Dropoff pin
      if (delivery.dropoff_lat != null && delivery.dropoff_lng != null) {
        const dropoffPt = L.latLng(delivery.dropoff_lat, delivery.dropoff_lng);
        allPoints.push(dropoffPt);

        const dropoffIcon = L.divIcon({
          className: 'ops-dropoff-pin',
          html: `
            <div style="
              background-color: ${isHighlighted ? '#ea580c' : '#ef4444'};
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
              cursor: pointer;
            ">
              📍
            </div>
          `,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        });

        const dropoffMarker = L.marker(dropoffPt, { icon: dropoffIcon, title: `Dropoff: ${delivery.dropoff_address}` });
        dropoffMarker.bindPopup(`
          <div style="font-size: 12px; font-family: inherit;">
            <p style="font-weight: 700; color: #ef4444; margin: 0 0 4px 0;">Dropoff · ${delivery.order_number ?? delivery.id.slice(0, 8)}</p>
            <p style="margin: 0 0 2px 0;">${delivery.dropoff_address}</p>
            <p style="margin: 0 0 2px 0;"><b>Status:</b> ${delivery.status}</p>
            ${delivery.driver_name ? `<p style="margin: 0 0 2px 0;"><b>Driver:</b> ${delivery.driver_name}</p>` : ''}
            <p style="margin: 0; font-family: monospace; color: #64748b;">${formatCoord(delivery.dropoff_lat, delivery.dropoff_lng)}</p>
          </div>
        `);
        dropoffMarker.on('click', () => onDeliveryClick?.(delivery.id));
        markersLayerRef.current?.addLayer(dropoffMarker);
      }

      // Route polyline or direct connecting line
      if (delivery.route_polyline) {
        try {
          const decoded = decodePolyline(delivery.route_polyline);
          if (decoded.length > 0) {
            const polyLatLngs = decoded.map((p) => L.latLng(p.lat, p.lng));
            polyLatLngs.forEach((pt) => allPoints.push(pt));
            const routeLine = L.polyline(polyLatLngs, {
              color: isHighlighted ? '#ea580c' : '#3b82f6',
              weight: isHighlighted ? 6 : 4,
              opacity: isHighlighted ? 1 : 0.75,
              dashArray: isHighlighted ? undefined : '6, 6',
            });
            routesLayerRef.current?.addLayer(routeLine);
          }
        } catch {
          // Ignore invalid polylines
        }
      } else if (
        delivery.pickup_lat != null &&
        delivery.pickup_lng != null &&
        delivery.dropoff_lat != null &&
        delivery.dropoff_lng != null
      ) {
        const directLine = L.polyline(
          [
            [delivery.pickup_lat, delivery.pickup_lng],
            [delivery.dropoff_lat, delivery.dropoff_lng],
          ],
          {
            color: isHighlighted ? '#ea580c' : '#64748b',
            weight: 2,
            dashArray: '4, 4',
            opacity: 0.6,
          }
        );
        routesLayerRef.current?.addLayer(directLine);
      }
    });

    // Render Driver Pins
    driverPins.forEach((pin) => {
      const pinPt = L.latLng(pin.lat, pin.lng);
      allPoints.push(pinPt);

      const driverIcon = L.divIcon({
        className: 'ops-driver-pin',
        html: `
          <div style="position: relative; width: 34px; height: 34px; display: flex; align-items: center; justify-content: center;">
            <span style="
              position: absolute;
              width: 34px;
              height: 34px;
              border-radius: 9999px;
              background-color: rgba(59, 130, 246, 0.4);
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></span>
            <div style="
              position: relative;
              background-color: #2563eb;
              color: #ffffff;
              border: 2px solid #ffffff;
              border-radius: 9999px;
              width: 26px;
              height: 26px;
              display: flex;
              align-items: center;
              justify-content: center;
              box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3);
              font-size: 12px;
            ">
              🚗
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const driverMarker = L.marker(pinPt, { icon: driverIcon, title: `Driver: ${pin.label}` });
      driverMarker.bindPopup(`
        <div style="font-size: 12px; font-family: inherit;">
          <p style="font-weight: 700; color: #2563eb; margin: 0 0 4px 0;">Driver Location</p>
          <p style="margin: 0 0 2px 0;"><b>Name:</b> ${pin.label}</p>
          <p style="margin: 0; font-family: monospace; color: #64748b;">${formatCoord(pin.lat, pin.lng)}</p>
        </div>
      `);
      markersLayerRef.current?.addLayer(driverMarker);
    });

    // Auto-fit bounds
    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [32, 32], maxZoom: 15 });
    } else {
      map.setView(DEFAULT_SERVICE_REGION_CENTER, 12);
    }
  }, [L, deliveries, driverPins, highlightedDeliveryId, onDeliveryClick, viewMode]);

  return (
    <div className={`overflow-hidden rounded-lg border border-border bg-surface ${className ?? ''}`}>
      <div className="flex flex-wrap items-center justify-between border-b border-border px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-white">Live Coordinate & Route Map</p>
          <p className="text-xs text-textMuted">
            Service center {formatCoord(DEFAULT_SERVICE_REGION_CENTER[0], DEFAULT_SERVICE_REGION_CENTER[1])}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-surfaceMuted px-2.5 py-1 text-xs text-textSubtle">
            {deliveries.length} deliveries · {driverPins.length} drivers
          </span>
          <div className="flex rounded-md border border-border bg-surfaceMuted p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('map')}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                viewMode === 'map'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-textMuted hover:text-white'
              }`}
            >
              Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-textMuted hover:text-white'
              }`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {!hasPins ? (
        <div className="flex h-full min-h-64 items-center justify-center p-6 text-sm text-textMuted">
          No delivery or driver coordinates available.
        </div>
      ) : viewMode === 'map' ? (
        <div ref={containerRef} className="h-full min-h-[380px] w-full" />
      ) : (
        <div className="grid h-full min-h-64 gap-3 overflow-y-auto p-4 lg:grid-cols-2">
          {deliveries.map((delivery) => {
            const isHighlighted = highlightedDeliveryId === delivery.id;
            return (
              <button
                key={delivery.id}
                type="button"
                onClick={() => onDeliveryClick?.(delivery.id)}
                className={`rounded-lg border p-3 text-left transition-colors hover:border-primary/60 ${
                  isHighlighted ? 'border-primary bg-primary/10' : statusClass(delivery.status)
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-xs text-textMuted">
                    {delivery.order_number ?? delivery.id.slice(0, 8)}
                  </p>
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-[11px] uppercase tracking-wide">
                    {delivery.status}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-success">Pickup</p>
                    <p className="text-textSubtle">{delivery.pickup_address}</p>
                    <p className="font-mono text-textMuted">{formatCoord(delivery.pickup_lat, delivery.pickup_lng)}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-danger">Dropoff</p>
                    <p className="text-textSubtle">{delivery.dropoff_address}</p>
                    <p className="font-mono text-textMuted">{formatCoord(delivery.dropoff_lat, delivery.dropoff_lng)}</p>
                  </div>
                  {delivery.driver_name && (
                    <p className="text-textMuted">Driver: <span className="text-textSubtle">{delivery.driver_name}</span></p>
                  )}
                  {delivery.route_polyline && (
                    <p className="text-textMuted">Route polyline attached</p>
                  )}
                </div>
              </button>
            );
          })}

          {driverPins.map((pin) => (
            <div key={pin.id} className="rounded-lg border border-info/40 bg-info/10 p-3 text-xs">
              <p className="font-semibold text-info">{pin.label}</p>
              <p className="mt-1 font-mono text-info/70">{formatCoord(pin.lat, pin.lng)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
