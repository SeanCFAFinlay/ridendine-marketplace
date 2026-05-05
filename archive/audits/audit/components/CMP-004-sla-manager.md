---
id: CMP-004
name: SLAManager
layer: Service
subsystem: Engine
path: packages/engine/src/core/sla-manager.ts
language: TypeScript
loc: 100
---

# [[CMP-004]] SLAManager

## Responsibility
Creates and tracks SLA timer records with deadline timestamps for order and dispatch time-bound obligations.

## Public API
- `createTimer(params: SLATimerParams) -> Promise<SLATimer>` — registers a new SLA deadline
- `cancelTimer(timerId: string) -> Promise<void>` — cancels an active timer
- `getActiveTimers(entityId: string) -> Promise<SLATimer[]>` — retrieves active timers for an entity

## Depends on (outbound)
- None

## Depended on by (inbound)
- [[CMP-006]] OrderOrchestrator — creates timers for order acceptance and prep deadlines
- [[CMP-008]] DispatchEngine — creates timers for driver offer expiry

## Reads config
- None directly; deadline durations passed by callers

## Side effects
- DB writes to SLA timer records table
- 🔴 No scheduled processor — see [[FND-005]]

## Tests
- ❓ UNKNOWN

## Smells / notes
- Timers are written to DB but never automatically processed — SLA breaches go undetected without manual ops trigger (FND-005)

## Source
`packages/engine/src/core/sla-manager.ts` (lines 1–100)
