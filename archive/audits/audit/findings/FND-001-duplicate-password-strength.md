---
id: FND-001
title: Duplicate PasswordStrength component across web and chef-admin
category: Duplicate
severity: Medium
effort: S
status: Open
components: CMP-058, CMP-059
---

# [[FND-001]] Duplicate PasswordStrength Component

## Summary
[[CMP-058]] WebPasswordStrength and [[CMP-059]] ChefPasswordStrength are identical 90-LOC React components copied across two apps. Any change must be made twice and kept in sync manually.

## Evidence
- `apps/web/src/components/auth/password-strength.tsx` — 90 LOC
- `apps/chef-admin/src/components/auth/password-strength.tsx` — 90 LOC
- Visual and functional output are identical

## Impact
- Maintenance burden: bug fixes and design changes require two edits
- Risk of the two copies diverging over time
- Violates the project's own DRY principle (package boundary design decision)

## Recommendation
Move `PasswordStrength` to `packages/ui/src/components/password-strength.tsx` and import from `@ridendine/ui` in both apps.

## Fix Effort
S — copy file, update two import sites, remove originals.
