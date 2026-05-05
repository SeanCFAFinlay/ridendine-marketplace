---
id: CMP-018
name: DispatchService
layer: Service
subsystem: Dispatch
path: packages/engine/src/services/dispatch.service.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-018]] DispatchService

## Responsibility
Legacy service providing dispatch and delivery query operations prior to the DispatchEngine orchestrator.

## Public API
- Various dispatch query/mutation methods (legacy interface)

## Depends on (outbound)
- [[CMP-027]] DeliveryRepository — data access

## Depended on by (inbound)
- Legacy API routes still referencing service layer

## Reads config
- None

## Side effects
- DB reads/writes via repository

## Tests
- Present (test file exists)

## Smells / notes
- Legacy service; functionality now covered by CMP-008 DispatchEngine

## Source
`packages/engine/src/services/dispatch.service.ts`
