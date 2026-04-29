---
id: CMP-062
name: OrderTrackingMap
layer: UI
subsystem: WebApp
path: apps/web/src/components/tracking/order-tracking-map.tsx
language: TypeScript
loc: 89
---

# [[CMP-062]] OrderTrackingMap

## Responsibility
Displays a customer-facing map showing the driver's live location during active delivery.

## Public API
- `<OrderTrackingMap orderId deliveryId>` — renders live driver location on map

## Depends on (outbound)
- [[CMP-039]] RealtimeHook — subscribes to driver_presence updates
- Map library (Leaflet/Mapbox)

## Depended on by (inbound)
- Web app order tracking page

## Reads config
- Hardcoded Hamilton, ON default coordinates — see [[FND-013]]

## Side effects
- Realtime channel subscription for driver location

## Tests
- ❓ UNKNOWN

## Smells / notes
- Hardcoded default map coordinates — see [[FND-013]]

## Source
`apps/web/src/components/tracking/order-tracking-map.tsx` (lines 1–89)
