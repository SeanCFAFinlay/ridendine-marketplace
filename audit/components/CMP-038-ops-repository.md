---
id: CMP-038
name: OpsRepository
layer: Repository
subsystem: Ops
path: packages/db/src/repositories/ops.repository.ts
language: TypeScript
loc: 616
---

# [[CMP-038]] OpsRepository

## Responsibility
Provides data access for ops dashboard including system alerts, driver scoring, and coverage gap analysis — but improperly embeds orchestration logic.

## Public API
- `getSystemAlerts(filters) -> Promise<SystemAlert[]>` — retrieves active alerts
- `getDispatchQueue(filters) -> Promise<DispatchQueueEntry[]>` — ops dispatch board data
- `getDriverScores(bounds) -> Promise<DriverScore[]>` — scores drivers for dispatch (misplaced logic)
- `getCoverageGaps(bounds) -> Promise<CoverageGap[]>` — calculates coverage gaps (misplaced logic)
- `getDashboardMetrics(timeRange) -> Promise<DashboardMetrics>` — aggregated ops KPIs

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-012]] OpsControlEngine — ops data access
- Ops admin API routes

## Reads config
- None

## Side effects
- DB reads only (metrics/queries); some writes for alert acknowledgement

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🟡 SMELL: 616 LOC with driver scoring and coverage gap algorithms that belong in engine layer — see [[FND-007]]

## Source
`packages/db/src/repositories/ops.repository.ts` (lines 1–616)
