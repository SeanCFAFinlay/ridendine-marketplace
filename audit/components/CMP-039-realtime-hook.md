---
id: CMP-039
name: RealtimeHook
layer: Util
subsystem: Database
path: packages/db/src/hooks/use-realtime.ts
language: TypeScript
loc: 49
---

# [[CMP-039]] RealtimeHook

## Responsibility
Provides a React hook for subscribing to Supabase realtime channel updates in client components.

## Public API
- `useRealtime(channel, table, filter, callback) -> void` — subscribes to realtime events and calls callback on change

## Depends on (outbound)
- [[CMP-021]] BrowserClient — realtime subscription requires browser client

## Depended on by (inbound)
- Order tracking components
- Kitchen queue live updates
- Driver location updates

## Reads config
- None

## Side effects
- Supabase realtime channel subscription (cleanup on unmount)

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/hooks/use-realtime.ts` (lines 1–49)
