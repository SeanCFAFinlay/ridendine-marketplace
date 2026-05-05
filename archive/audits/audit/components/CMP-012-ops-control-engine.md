---
id: CMP-012
name: OpsControlEngine
layer: Service
subsystem: Ops
path: packages/engine/src/orchestrators/ops.engine.ts
language: TypeScript
loc: 368
---

# [[CMP-012]] OpsControlEngine

## Responsibility
Provides ops-level control plane operations including SLA processing, system alert management, and manual overrides.

## Public API
- `processSLATimers() -> Promise<void>` — processes expired SLA timers and fires breach events
- `getSystemAlerts(filters) -> Promise<SystemAlert[]>` — retrieves active system alerts
- `acknowledgeAlert(alertId, actorId) -> Promise<void>` — marks alert as acknowledged
- `getOpsMetrics(timeRange) -> Promise<OpsMetrics>` — retrieves platform KPIs

## Depends on (outbound)
- [[CMP-002]] DomainEventEmitter — emits ops events
- [[CMP-003]] AuditLogger — logs ops actions

## Depended on by (inbound)
- [[CMP-001]] EngineFactory — registered as ops domain handler

## Reads config
- None

## Side effects
- DB writes: system_alerts, order_exceptions, notifications

## Tests
- ❓ UNKNOWN

## Smells / notes
- processSLATimers must be manually triggered from ops dashboard — see [[FND-005]]

## Source
`packages/engine/src/orchestrators/ops.engine.ts` (lines 1–368)
