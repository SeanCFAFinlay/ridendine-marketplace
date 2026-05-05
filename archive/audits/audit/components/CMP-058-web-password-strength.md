---
id: CMP-058
name: WebPasswordStrength
layer: UI
subsystem: WebApp
path: apps/web/src/components/auth/password-strength.tsx
language: TypeScript
loc: 90
---

# [[CMP-058]] WebPasswordStrength

## Responsibility
Displays a password strength meter with colour-coded feedback during sign-up for the web app.

## Public API
- `<PasswordStrength password>` — renders strength indicator with label

## Depends on (outbound)
- None

## Depended on by (inbound)
- Web app sign-up form

## Reads config
- None

## Side effects
- None

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🔴 DUPLICATE of [[CMP-059]] ChefPasswordStrength; both should be moved to @ridendine/ui — see [[FND-001]]

## Source
`apps/web/src/components/auth/password-strength.tsx` (lines 1–90)
