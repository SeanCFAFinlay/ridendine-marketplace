---
id: CMP-007
name: KitchenEngine
layer: Service
subsystem: Kitchen
path: packages/engine/src/orchestrators/kitchen.engine.ts
language: TypeScript
loc: 665
---

# [[CMP-007]] KitchenEngine

## Responsibility
Manages the kitchen queue, storefront availability, and item inventory state for chef operations.

## Public API
- `getKitchenQueue(storefrontId) -> Promise<KitchenQueueEntry[]>` — retrieves active queue
- `reorderQueue(storefrontId, orderedIds) -> Promise<void>` — reorders queue entries
- `updatePrepTime(entryId, minutes) -> Promise<void>` — updates estimated prep time
- `pauseStorefront(storefrontId, reason) -> Promise<void>` — pauses order acceptance
- `unpauseStorefront(storefrontId) -> Promise<void>` — resumes order acceptance
- `markItemSoldOut(itemId) -> Promise<void>` — marks menu item as unavailable
- `restockItem(itemId) -> Promise<void>` — marks menu item as available
- `checkOverloadStatus(storefrontId) -> Promise<OverloadStatus>` — checks queue overload
- `getStorefrontAvailability(storefrontId) -> Promise<Availability>` — checks if accepting orders
- `getKitchenStats(storefrontId) -> Promise<KitchenStats>` — retrieves kitchen metrics

## Depends on (outbound)
- [[CMP-002]] DomainEventEmitter — emits kitchen events
- [[CMP-003]] AuditLogger — logs kitchen actions

## Depended on by (inbound)
- [[CMP-001]] EngineFactory — registered as kitchen domain handler

## Reads config
- None

## Side effects
- DB writes: kitchen_queue_entries, chef_storefronts, menu_items, storefront_state_changes, order_exceptions

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/engine/src/orchestrators/kitchen.engine.ts` (lines 1–665)
