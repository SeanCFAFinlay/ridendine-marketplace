---
id: CMP-015
name: CustomersService
layer: Service
subsystem: Customer
path: packages/engine/src/services/customers.service.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-015]] CustomersService

## Responsibility
Legacy service providing customer profile and address query operations.

## Public API
- Various customer query/mutation methods (legacy interface)

## Depends on (outbound)
- [[CMP-026]] CustomerRepository — data access

## Depended on by (inbound)
- Legacy API routes still referencing service layer

## Reads config
- None

## Side effects
- DB reads/writes via repository

## Tests
- ❓ UNKNOWN

## Smells / notes
- Legacy service layer

## Source
`packages/engine/src/services/customers.service.ts`
