---
id: FLOW-005
name: Ops Override
entry_point: apps/ops-admin/src/app/api/engine/orders/[id]/route.ts
actors: Ops Manager, OpsAdmin App, OrderOrchestrator, Supabase
---

# [[FLOW-005]] Ops Override

## Summary
Ops manager forces an order status change bypassing normal state machine validation, with full audit trail.

## Steps
1. Ops manager triggers override → `PATCH /api/engine/orders/[id]` with force_status
2. [[CMP-006]] OrderOrchestrator.opsOverride() checks actor role
3. Only ops_manager and super_admin can override
4. Override logged to ops_override_logs BEFORE changes
5. Order status force-updated (both engine_status and legacy status)
6. Order status history record created with 'OPS OVERRIDE:' prefix
7. Domain event 'ops.override.executed' emitted
8. Audit log records full before/after state

## Sequence Diagram
See [[diagrams/flows/FLOW-005.mmd]]

## Key Components
- [[CMP-006]] OrderOrchestrator
- [[CMP-003]] AuditLogger
- [[CMP-012]] OpsControlEngine
