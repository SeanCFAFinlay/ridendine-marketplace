---
id: CMP-011
name: PlatformWorkflowEngine
layer: Service
subsystem: Platform
path: packages/engine/src/orchestrators/platform.engine.ts
language: TypeScript
loc: 670
---

# [[CMP-011]] PlatformWorkflowEngine

## Responsibility
Manages platform-level workflows including chef onboarding approval, driver onboarding, and platform setting changes.

## Public API
- `approveChef(chefId, approverId) -> Promise<void>` — approves chef application
- `rejectChef(chefId, reason, approverId) -> Promise<void>` — rejects chef application
- `approveDriver(driverId, approverId) -> Promise<void>` — approves driver application
- `rejectDriver(driverId, reason, approverId) -> Promise<void>` — rejects driver application
- `updatePlatformSetting(key, value, actorId) -> Promise<void>` — updates a platform configuration value

## Depends on (outbound)
- [[CMP-002]] DomainEventEmitter — emits platform workflow events
- [[CMP-003]] AuditLogger — logs platform changes

## Depended on by (inbound)
- [[CMP-001]] EngineFactory — registered as platform domain handler

## Reads config
- None

## Side effects
- DB writes: platform_users, chef_storefronts, platform_settings, notifications

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/engine/src/orchestrators/platform.engine.ts` (lines 1–670)
