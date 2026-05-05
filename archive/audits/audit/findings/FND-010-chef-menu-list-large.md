---
id: FND-010
category: Smell
severity: Low
effort: S
---

# [[FND-010]] ChefMenuList 496 LOC with embedded modals

## Summary
The menu-list.tsx component contains 496 lines including two embedded modal sub-components (CategoryModal and ItemModal) that should be separate files.

## Affected components
- [[CMP-054]] ChefMenuList

## Evidence
- `apps/chef-admin/src/components/menu/menu-list.tsx` (496 lines)

## Why this matters
Embedded sub-components make the file hard to navigate and prevent reuse of the modal components.

## Proposed fix
Extract CategoryModal and ItemModal into separate files under `apps/chef-admin/src/components/menu/`.
