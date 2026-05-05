---
id: CMP-046
name: ModalComponent
layer: UI
subsystem: SharedUI
path: packages/ui/src/components/modal.tsx
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-046]] ModalComponent

## Responsibility
Shared modal dialog component with accessible overlay, title, and action slot used across all apps.

## Public API
- `<Modal open onClose title? className?>` — modal container with overlay
- `<ModalBody>` — modal content slot
- `<ModalFooter>` — modal action slot

## Depends on (outbound)
- None

## Depended on by (inbound)
- All app UI components across web, chef-admin, ops-admin, driver-app
- [[CMP-054]] ChefMenuList — embedded modals should migrate here — see [[FND-010]]

## Reads config
- None

## Side effects
- None

## Tests
- ❓ UNKNOWN

## Smells / notes
- CMP-054 embeds CategoryModal and ItemModal inline instead of using this shared component

## Source
`packages/ui/src/components/modal.tsx`
