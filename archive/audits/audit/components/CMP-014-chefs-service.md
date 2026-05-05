---
id: CMP-014
name: ChefsService
layer: Service
subsystem: Chef
path: packages/engine/src/services/chefs.service.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-014]] ChefsService

## Responsibility
Legacy service providing chef profile and storefront query operations.

## Public API
- Various chef query/mutation methods (legacy interface)

## Depends on (outbound)
- [[CMP-025]] ChefRepository — data access

## Depended on by (inbound)
- Legacy API routes still referencing service layer

## Reads config
- None

## Side effects
- DB reads/writes via repository

## Tests
- ❓ UNKNOWN

## Smells / notes
- Legacy service layer; may overlap with orchestrator responsibilities

## Source
`packages/engine/src/services/chefs.service.ts`
