---
id: CMP-010
name: SupportExceptionEngine
layer: Service
subsystem: Support
path: packages/engine/src/orchestrators/support.engine.ts
language: TypeScript
loc: 699
---

# [[CMP-010]] SupportExceptionEngine

## Responsibility
Handles order exception lifecycle including filing, investigation, resolution, and escalation of support cases.

## Public API
- `fileException(params) -> Promise<OrderException>` — creates a new support exception
- `assignException(exceptionId, agentId) -> Promise<OrderException>` — assigns to support agent
- `resolveException(exceptionId, resolution, agentId) -> Promise<OrderException>` — resolves exception
- `escalateException(exceptionId, reason, agentId) -> Promise<OrderException>` — escalates to ops
- `getExceptions(filters) -> Promise<OrderException[]>` — lists exceptions by filter

## Depends on (outbound)
- [[CMP-002]] DomainEventEmitter — emits support events
- [[CMP-003]] AuditLogger — logs support actions

## Depended on by (inbound)
- [[CMP-001]] EngineFactory — registered as support domain handler

## Reads config
- None

## Side effects
- DB writes: order_exceptions, notifications

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/engine/src/orchestrators/support.engine.ts` (lines 1–699)
