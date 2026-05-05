---
id: CMP-030
name: MenuRepository
layer: Repository
subsystem: Catalog
path: packages/db/src/repositories/menu.repository.ts
language: TypeScript
loc: 169
---

# [[CMP-030]] MenuRepository

## Responsibility
Provides database read/write operations for menu categories and menu items.

## Public API
- `getMenuByStorefront(storefrontId) -> Promise<Menu>` — retrieves full menu with categories and items
- `createMenuItem(data) -> Promise<MenuItem>` — inserts new menu item
- `updateMenuItem(id, data) -> Promise<MenuItem>` — updates menu item
- `deleteMenuItem(id) -> Promise<void>` — removes menu item
- `updateItemAvailability(id, available) -> Promise<void>` — toggles item availability

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-007]] KitchenEngine — item availability management
- Chef admin menu management routes

## Reads config
- None

## Side effects
- DB writes: menu_categories, menu_items

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/repositories/menu.repository.ts` (lines 1–169)
