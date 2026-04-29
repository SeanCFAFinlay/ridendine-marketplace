---
id: CMP-055
name: OpsLiveMap
layer: UI
subsystem: OpsAdmin
path: apps/ops-admin/src/components/map/live-map.tsx
language: TypeScript
loc: 410
---

# [[CMP-055]] OpsLiveMap

## Responsibility
Displays a real-time map of active drivers, orders in transit, and storefront locations for ops oversight.

## Public API
- `<OpsLiveMap bounds? onDriverClick? onOrderClick?>` — renders live dispatch map

## Depends on (outbound)
- [[CMP-021]] BrowserClient — realtime driver/order subscriptions
- Map library (Leaflet/Mapbox)
- [[CMP-066]] EngineOpsClient — dispatch board data

## Depended on by (inbound)
- Ops admin dashboard page

## Reads config
- Hardcoded Hamilton, ON coordinates as default center — see [[FND-013]]

## Side effects
- Realtime channel subscriptions

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🟡 SMELL: 410 LOC; hardcoded default map coordinates — see [[FND-013]]

## Source
`apps/ops-admin/src/components/map/live-map.tsx` (lines 1–410)
