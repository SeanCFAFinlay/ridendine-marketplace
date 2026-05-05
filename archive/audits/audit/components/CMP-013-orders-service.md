---
id: CMP-013
name: OrdersService
layer: Service
subsystem: Order
path: packages/engine/src/services/orders.service.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-013]] OrdersService

## Responsibility
Legacy service providing order query and data-access operations, predating the orchestrator layer.

## Public API
- Various order query/mutation methods (legacy interface)

## Depends on (outbound)
- [[CMP-024]] OrderRepository — data access

## Depended on by (inbound)
- Legacy API routes still referencing service layer

## Reads config
- None

## Side effects
- DB reads/writes via repository

## Tests
- Present (test file exists)

## Smells / notes
- Legacy service; functionality overlaps with CMP-006 OrderOrchestrator

## Source
`packages/engine/src/services/orders.service.ts`
