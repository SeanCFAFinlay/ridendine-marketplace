---
id: CMP-043
name: ButtonComponent
layer: UI
subsystem: SharedUI
path: packages/ui/src/components/button.tsx
language: TypeScript
loc: 77
---

# [[CMP-043]] ButtonComponent

## Responsibility
Shared button component with variant, size, and loading state support used across all apps.

## Public API
- `<Button variant? size? loading? disabled? onClick? className?>` — renders styled button
- Variants: primary, secondary, ghost, destructive
- Sizes: sm, md, lg

## Depends on (outbound)
- None

## Depended on by (inbound)
- All app UI components across web, chef-admin, ops-admin, driver-app

## Reads config
- None

## Side effects
- None

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/ui/src/components/button.tsx` (lines 1–77)
