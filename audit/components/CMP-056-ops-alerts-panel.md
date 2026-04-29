---
id: CMP-056
name: OpsAlertsPanel
layer: UI
subsystem: OpsAdmin
path: apps/ops-admin/src/components/dashboard/alerts-panel.tsx
language: TypeScript
loc: 225
---

# [[CMP-056]] OpsAlertsPanel

## Responsibility
Displays active system alerts with severity indicators and acknowledge actions for ops agents.

## Public API
- `<OpsAlertsPanel onAcknowledge?>` — renders alerts list with action buttons

## Depends on (outbound)
- [[CMP-021]] BrowserClient — realtime alert subscriptions
- [[CMP-066]] EngineOpsClient — alert acknowledgement

## Depended on by (inbound)
- Ops admin dashboard page

## Reads config
- None

## Side effects
- Calls engine to acknowledge alerts
- Realtime channel subscription

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`apps/ops-admin/src/components/dashboard/alerts-panel.tsx` (lines 1–225)
