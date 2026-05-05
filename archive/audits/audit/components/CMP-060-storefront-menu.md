---
id: CMP-060
name: StorefrontMenu
layer: UI
subsystem: WebApp
path: apps/web/src/components/storefront/storefront-menu.tsx
language: TypeScript
loc: 322
---

# [[CMP-060]] StorefrontMenu

## Responsibility
Renders the public-facing storefront menu with categories, items, and add-to-cart actions for customers.

## Public API
- `<StorefrontMenu storefrontId>` — renders browsable menu with cart integration

## Depends on (outbound)
- [[CMP-052]] WebCartContext — add to cart actions
- [[CMP-030]] MenuRepository — menu data (or via server component prop)

## Depended on by (inbound)
- Web app storefront detail page

## Reads config
- None

## Side effects
- Cart mutations via WebCartContext

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`apps/web/src/components/storefront/storefront-menu.tsx` (lines 1–322)
