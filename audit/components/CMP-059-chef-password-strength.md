---
id: CMP-059
name: ChefPasswordStrength
layer: UI
subsystem: ChefAdmin
path: apps/chef-admin/src/components/auth/password-strength.tsx
language: TypeScript
loc: 90
---

# [[CMP-059]] ChefPasswordStrength

## Responsibility
Displays a password strength meter with colour-coded feedback during sign-up for the chef admin app.

## Public API
- `<PasswordStrength password>` — renders strength indicator with label

## Depends on (outbound)
- None

## Depended on by (inbound)
- Chef admin sign-up form

## Reads config
- None

## Side effects
- None

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🔴 DUPLICATE of [[CMP-058]] WebPasswordStrength; identical implementation copied across apps; should be consolidated into @ridendine/ui — see [[FND-001]]

## Source
`apps/chef-admin/src/components/auth/password-strength.tsx` (lines 1–90)
