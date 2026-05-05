---
id: CMP-001
name: EngineFactory
layer: Service
subsystem: Engine
path: packages/engine/src/core/engine.factory.ts
language: TypeScript
loc: 92
---

# [[CMP-001]] EngineFactory

## Responsibility
Instantiates and wires together all engine orchestrators and services into a single cohesive engine instance.

## Public API
- `createEngine(config) -> Engine` — builds and returns the configured engine instance
- `getEngine() -> Engine` — returns singleton engine instance

## Depends on (outbound)
- [[CMP-006]] OrderOrchestrator — wired in as order domain handler
- [[CMP-007]] KitchenEngine — wired in as kitchen domain handler
- [[CMP-008]] DispatchEngine — wired in as dispatch domain handler
- [[CMP-009]] CommerceLedgerEngine — wired in as commerce domain handler
- [[CMP-010]] SupportExceptionEngine — wired in as support domain handler
- [[CMP-011]] PlatformWorkflowEngine — wired in as platform domain handler
- [[CMP-012]] OpsControlEngine — wired in as ops domain handler
- [[CMP-023]] AdminClient — provides DB admin access to all orchestrators

## Depended on by (inbound)
- [[CMP-064]] EngineWebClient — instantiates engine for web app
- [[CMP-065]] EngineChefClient — instantiates engine for chef-admin app
- [[CMP-066]] EngineOpsClient — instantiates engine for ops-admin app
- [[CMP-067]] EngineDriverClient — instantiates engine for driver app

## Reads config
- All orchestrator-level env vars (passed through)

## Side effects
- None (pure wiring / factory)

## Tests
- ❓ UNKNOWN

## Smells / notes
- Central wiring point; changes here affect all apps

## Source
`packages/engine/src/core/engine.factory.ts` (lines 1–92)
