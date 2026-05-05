---
id: CMP-032
name: StorefrontRepository
layer: Repository
subsystem: Chef
path: packages/db/src/repositories/storefront.repository.ts
language: TypeScript
loc: 181
---

# [[CMP-032]] StorefrontRepository

## Responsibility
Provides database read/write operations for chef storefronts including availability and operational state.

## Public API
- `getStorefrontById(id) -> Promise<Storefront>` — fetches storefront details
- `getStorefrontByChef(chefId) -> Promise<Storefront>` — fetches chef's storefront
- `listActiveStorefronts(filters) -> Promise<Storefront[]>` — lists open storefronts
- `updateStorefrontStatus(id, status) -> Promise<Storefront>` — updates operational status

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-007]] KitchenEngine — storefront pause/unpause
- [[CMP-011]] PlatformWorkflowEngine — storefront approval
- Web storefront listing routes

## Reads config
- None

## Side effects
- DB writes: chef_storefronts, storefront_state_changes

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/repositories/storefront.repository.ts` (lines 1–181)
