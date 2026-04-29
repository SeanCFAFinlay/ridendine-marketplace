---
id: FND-015
category: Duplicate
severity: Low
effort: S
---

# [[FND-015]] Similar AuthLayout components

## Summary
AuthLayout components in web and chef-admin are structurally identical with only 6 LOC difference (gradient color and "Chef Portal" badge).

## Affected components
- apps/web/src/components/auth/auth-layout.tsx
- apps/chef-admin/src/components/auth/auth-layout.tsx

## Evidence
- Both files ~50 LOC, same Card-based centered layout

## Why this matters
Minor duplication. Low priority but could share a parameterized base.

## Proposed fix
Optional: extract to @ridendine/ui with a `variant` prop.
