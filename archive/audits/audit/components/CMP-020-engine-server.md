---
id: CMP-020
name: EngineServer
layer: Adapter
subsystem: Engine
path: packages/engine/src/server.ts
language: TypeScript
loc: 205
---

# [[CMP-020]] EngineServer

## Responsibility
Exposes the engine as an HTTP server for inter-app communication, routing requests to the appropriate orchestrator method.

## Public API
- HTTP POST endpoints mapping to engine orchestrator actions
- `startServer(port) -> void` — starts HTTP listener

## Depends on (outbound)
- [[CMP-001]] EngineFactory — gets engine instance
- All orchestrators (indirectly via engine)

## Depended on by (inbound)
- [[CMP-064]] EngineWebClient — HTTP client to this server
- [[CMP-065]] EngineChefClient — HTTP client
- [[CMP-066]] EngineOpsClient — HTTP client
- [[CMP-067]] EngineDriverClient — HTTP client

## Reads config
- `ENGINE_PORT` or default port

## Side effects
- Opens HTTP listener
- All side effects are delegated to orchestrators

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/engine/src/server.ts` (lines 1–205)
