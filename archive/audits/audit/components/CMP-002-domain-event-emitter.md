---
id: CMP-002
name: DomainEventEmitter
layer: Service
subsystem: Engine
path: packages/engine/src/core/event-emitter.ts
language: TypeScript
loc: 100
---

# [[CMP-002]] DomainEventEmitter

## Responsibility
Provides typed domain event pub/sub within the engine layer, decoupling orchestrators from each other.

## Public API
- `emit(event: DomainEvent) -> void` — publishes a domain event
- `on(eventType: string, handler: Handler) -> void` — subscribes to an event type
- `off(eventType: string, handler: Handler) -> void` — removes a subscription

## Depends on (outbound)
- None

## Depended on by (inbound)
- [[CMP-006]] OrderOrchestrator — emits order lifecycle events
- [[CMP-007]] KitchenEngine — emits kitchen queue events
- [[CMP-008]] DispatchEngine — emits dispatch/delivery events
- [[CMP-009]] CommerceLedgerEngine — emits financial events
- [[CMP-010]] SupportExceptionEngine — emits support events
- [[CMP-011]] PlatformWorkflowEngine — emits platform workflow events
- [[CMP-012]] OpsControlEngine — emits ops control events

## Reads config
- None

## Side effects
- In-memory event dispatch only; no DB writes

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/engine/src/core/event-emitter.ts` (lines 1–100)
