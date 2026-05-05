---
id: CMP-065
name: EngineChefClient
layer: Adapter
subsystem: ChefAdmin
path: apps/chef-admin/src/lib/engine.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-065]] EngineChefClient

## Responsibility
Singleton HTTP client wrapper for the chef admin app to call engine server endpoints with typed request/response.

## Public API
- `engine.orders.accept(orderId) -> Promise<Order>` — accepts an order
- `engine.orders.reject(orderId, reason) -> Promise<Order>` — rejects an order
- `engine.kitchen.*` — kitchen management methods
- Various typed method wrappers for chef-relevant engine actions

## Depends on (outbound)
- [[CMP-001]] EngineFactory — connects to engine server instance
- [[CMP-047]] ApiHelpers — HTTP request utilities

## Depended on by (inbound)
- Chef admin API routes and client components

## Reads config
- `ENGINE_URL` or internal URL

## Side effects
- HTTP calls to engine server

## Tests
- ❓ UNKNOWN

## Smells / notes
- ⚠️ INFERRED: similar structure to CMP-064; duplication confirmed — see [[FND-016]]

## Source
`apps/chef-admin/src/lib/engine.ts`
