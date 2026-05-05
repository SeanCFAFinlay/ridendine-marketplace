---
id: CMP-034
name: SupportRepository
layer: Repository
subsystem: Support
path: packages/db/src/repositories/support.repository.ts
language: TypeScript
loc: 108
---

# [[CMP-034]] SupportRepository

## Responsibility
Provides database read/write operations for order exceptions and support case records.

## Public API
- `createException(data) -> Promise<OrderException>` — inserts exception record
- `getExceptionById(id) -> Promise<OrderException>` — fetches exception details
- `updateException(id, data) -> Promise<OrderException>` — updates exception state
- `listExceptions(filters) -> Promise<OrderException[]>` — lists exceptions by filter

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-010]] SupportExceptionEngine — all support DB operations

## Reads config
- None

## Side effects
- DB writes: order_exceptions

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/repositories/support.repository.ts` (lines 1–108)
