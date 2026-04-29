---
id: CMP-003
name: AuditLogger
layer: Service
subsystem: Engine
path: packages/engine/src/core/audit-logger.ts
language: TypeScript
loc: 100
---

# [[CMP-003]] AuditLogger

## Responsibility
Records structured audit trail entries for all significant engine actions to enable compliance and debugging.

## Public API
- `log(entry: AuditEntry) -> Promise<void>` — writes an audit log entry
- `query(filter: AuditFilter) -> Promise<AuditEntry[]>` — retrieves audit entries

## Depends on (outbound)
- None (writes directly to DB or log sink)

## Depended on by (inbound)
- [[CMP-006]] OrderOrchestrator — logs order state transitions
- [[CMP-007]] KitchenEngine — logs kitchen actions
- [[CMP-008]] DispatchEngine — logs dispatch decisions
- [[CMP-009]] CommerceLedgerEngine — logs financial operations
- [[CMP-010]] SupportExceptionEngine — logs support actions
- [[CMP-011]] PlatformWorkflowEngine — logs platform changes
- [[CMP-012]] OpsControlEngine — logs ops overrides

## Reads config
- None

## Side effects
- DB writes to audit log table

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/engine/src/core/audit-logger.ts` (lines 1–100)
