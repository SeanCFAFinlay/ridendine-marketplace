---
id: CMP-016
name: PermissionsService
layer: Service
subsystem: Auth
path: packages/engine/src/services/permissions.service.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-016]] PermissionsService

## Responsibility
Evaluates actor permissions and role-based access control for engine operations.

## Public API
- `canPerformAction(actor: Actor, action: string) -> boolean` — checks if actor can perform action
- `assertPermission(actor: Actor, action: string) -> void` — throws if actor lacks permission

## Depends on (outbound)
- None

## Depended on by (inbound)
- Orchestrators (permission guards on sensitive operations)

## Reads config
- None

## Side effects
- None (read-only evaluation)

## Tests
- Present (test file exists)

## Smells / notes
- Role enum mismatch between platform_users CHECK and ActorRole — see [[FND-020]]

## Source
`packages/engine/src/services/permissions.service.ts`
