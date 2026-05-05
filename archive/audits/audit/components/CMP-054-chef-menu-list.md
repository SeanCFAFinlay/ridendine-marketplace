---
id: CMP-054
name: ChefMenuList
layer: UI
subsystem: ChefAdmin
path: apps/chef-admin/src/components/menu/menu-list.tsx
language: TypeScript
loc: 496
---

# [[CMP-054]] ChefMenuList

## Responsibility
Displays and manages the chef's full menu with category and item CRUD operations, including two embedded modal sub-components.

## Public API
- `<ChefMenuList storefrontId>` — renders menu management interface

## Depends on (outbound)
- [[CMP-064]] EngineChefClient — menu item CRUD operations
- [[CMP-046]] ModalComponent — should use shared modal (currently inline)

## Depended on by (inbound)
- Chef admin menu management page

## Reads config
- None

## Side effects
- Creates, updates, and deletes menu items and categories via engine

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🟡 SMELL: 496 LOC with CategoryModal and ItemModal as embedded sub-components; both should be extracted to separate files — see [[FND-010]]

## Source
`apps/chef-admin/src/components/menu/menu-list.tsx` (lines 1–496)
