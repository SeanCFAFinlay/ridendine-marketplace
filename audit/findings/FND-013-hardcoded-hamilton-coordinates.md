---
id: FND-013
category: Smell
severity: Low
effort: S
---

# [[FND-013]] Hardcoded Hamilton coordinates

## Summary
Multiple map components hardcode Hamilton, ON coordinates [43.2557, -79.8711] as the default map center instead of using a shared constant.

## Affected components
- [[CMP-055]] OpsLiveMap
- [[CMP-062]] OrderTrackingMap

## Evidence
- `apps/ops-admin/src/components/map/live-map.tsx`
- `apps/ops-admin/src/components/map/delivery-map.tsx`
- `apps/driver-app/src/components/map/route-map.tsx`
- `apps/web/src/components/tracking/order-tracking-map.tsx`

## Why this matters
If the service area changes, 4 files need manual updates. Easy to miss one.

## Proposed fix
Create DEFAULT_MAP_CENTER in packages/engine/src/constants.ts or packages/utils.
