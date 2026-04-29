---
id: CMP-041
name: UseAuth
layer: Util
subsystem: Auth
path: packages/auth/src/hooks/use-auth.ts
language: TypeScript
loc: 147
---

# [[CMP-041]] UseAuth

## Responsibility
React hook providing sign-in, sign-up, sign-out, and session management utilities built on Supabase Auth.

## Public API
- `useAuth() -> AuthHook` — returns auth methods and current user
- `signIn(email, password) -> Promise<void>` — authenticates user
- `signUp(email, password, metadata) -> Promise<void>` — registers new user
- `signOut() -> Promise<void>` — ends session
- `resetPassword(email) -> Promise<void>` — sends password reset email

## Depends on (outbound)
- [[CMP-021]] BrowserClient — auth operations

## Depended on by (inbound)
- [[CMP-040]] AuthProvider — uses auth utilities
- All app auth page components

## Reads config
- None

## Side effects
- Supabase Auth API calls (sign-in, sign-up, sign-out)

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/auth/src/hooks/use-auth.ts` (lines 1–147)
