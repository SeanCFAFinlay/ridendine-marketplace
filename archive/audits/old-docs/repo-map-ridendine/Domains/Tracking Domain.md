# Tracking Domain

> Real-time delivery tracking, driver location, and map display.

## Architecture

```
Driver device (GPS) → useLocationTracker hook → POST /api/location
  → driver_presence (current position)
  → driver_locations (history)
  → delivery_tracking_events (if active delivery)
  → engine.events.emit('driver_location_updated')

Customer view → Order confirmation page → polls driver_presence every 15s
  → OrderTrackingMap (Leaflet) → shows driver marker
```

## Driver-Side (driver-app)

### Location Tracking Hook
**File**: `driver-app/src/hooks/use-location-tracker.ts`
- `navigator.geolocation.watchPosition()` with high accuracy
- Update interval: 15 seconds (configurable)
- Writes directly to Supabase via `createBrowserClient()`
- Upserts `driver_presence` (current lat/lng)
- Inserts `driver_locations` (GPS history)

### Location API
**File**: `driver-app/src/app/api/location/route.ts`
- Rate limited: 5 seconds per driver (in-memory map)
- Validates: `locationUpdateSchema` (lat, lng, accuracy, heading, speed, deliveryId)
- If deliveryId: inserts `delivery_tracking_events` + emits engine event
- Used when `useLocationTracker` calls API instead of direct DB

### Delivery Status Updates
Driver progresses through 6 statuses, each with navigation option:
1. `en_route_to_pickup` — Opens Google Maps to pickup address
2. `arrived_at_pickup`
3. `picked_up`
4. `en_route_to_dropoff` — Opens Google Maps to dropoff address
5. `arrived_at_dropoff`
6. `delivered` — Photo + signature capture → completion

### Maps (driver-app)
**File**: `driver-app/src/components/map/route-map.tsx`
- Leaflet + react-leaflet
- Green marker (pickup), Red marker (dropoff), Blue marker (driver)
- Dashed orange polyline connecting points
- **No routing API** — straight lines, not road paths

## Customer-Side (web)

### Order Tracking
**File**: `web/src/app/order-confirmation/[orderId]/page.tsx`
- Supabase Realtime subscription for order UPDATE events
- Polls `driver_presence` every 15 seconds for driver location
- Displays when delivery status includes 'picked_up' or driver assigned

### Tracking Map
**File**: `web/src/components/tracking/order-tracking-map.tsx`
- Leaflet (dynamic import, SSR disabled)
- Default center: Hamilton, ON
- Custom driver marker (orange circle with car emoji)
- `panTo()` on driver location change

## Ops-Side (ops-admin)

### Live Map
**File**: `ops-admin/src/app/dashboard/map/page.tsx`
- Dynamic Leaflet import (SSR disabled)
- Shows all driver presence and delivery geography
- Part of dispatch monitoring

### Dispatch Command Center
- Shows driver supply snapshot with coverage gaps
- Driver assignment scoring uses distance from pickup

## DB Tables

| Table | Writer | Reader | Purpose |
|-------|--------|--------|---------|
| `driver_presence` | Driver (location hook/API) | Web (polling), Ops (map/dispatch) | Current driver position + status |
| `driver_locations` | Driver (location hook/API) | — (history only) | Full GPS history |
| `delivery_tracking_events` | Driver (location API) | — | Delivery-specific GPS breadcrumbs |
| `delivery_events` | Engine | Ops (delivery detail) | Status change events |

## Gaps

1. **No road routing** — Maps show straight lines, not actual road paths (would need OSRM or Google Directions API)
2. **Polling instead of push** — Customer tracking uses 15s polling, not Supabase Realtime subscription on driver_presence
3. **No ETA calculation** — No estimated time of arrival shown to customer
4. **No geofencing** — No auto-detection of arrival at pickup/dropoff based on GPS proximity
5. **Rate limit is in-memory** — Doesn't survive server restart, won't work across multiple server instances
