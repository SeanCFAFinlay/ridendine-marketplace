---
id: CMP-025
name: ChefRepository
layer: Repository
subsystem: Chef
path: packages/db/src/repositories/chef.repository.ts
language: TypeScript
loc: 250
---

# [[CMP-025]] ChefRepository

## Responsibility
Provides database read/write operations for chef profiles and storefront aggregates.

## Public API
- `getChefById(id) -> Promise<Chef>` — fetches chef profile
- `getChefByUserId(userId) -> Promise<Chef>` — fetches chef by auth user
- `updateChefProfile(id, data) -> Promise<Chef>` — updates chef profile
- `getChefWithStorefront(chefId) -> Promise<ChefWithStorefront>` — aggregated chef+storefront

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-007]] KitchenEngine — chef lookups
- [[CMP-011]] PlatformWorkflowEngine — chef approval
- [[CMP-014]] ChefsService — legacy service

## Reads config
- None

## Side effects
- DB writes: chef_profiles, chef_storefronts

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🟡 Manual aggregation logic for chef+storefront join; consider DB view

## Source
`packages/db/src/repositories/chef.repository.ts` (lines 1–250)
