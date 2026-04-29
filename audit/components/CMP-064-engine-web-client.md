---
id: CMP-064
name: EngineWebClient
layer: Adapter
subsystem: WebApp
path: apps/web/src/lib/engine.ts
language: TypeScript
loc: 95
---

# [[CMP-064]] EngineWebClient

## Responsibility
Singleton HTTP client wrapper for the web app to call engine server endpoints with typed request/response.

## Public API
- `engine.orders.create(params) -> Promise<Order>` — creates an order
- `engine.orders.cancel(orderId, reason) -> Promise<Order>` — cancels an order
- Various typed method wrappers for engine actions

## Depends on (outbound)
- [[CMP-001]] EngineFactory — connects to engine server instance
- [[CMP-047]] ApiHelpers — HTTP request utilities

## Depended on by (inbound)
- Web app API routes and client components

## Reads config
- `ENGINE_URL` or internal URL

## Side effects
- HTTP calls to engine server (all side effects in engine)

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🟡 Similar singleton pattern duplicated in CMP-065, CMP-066, CMP-067 — see [[FND-016]]

## Source
`apps/web/src/lib/engine.ts` (lines 1–95)
