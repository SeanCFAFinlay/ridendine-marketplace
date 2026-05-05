---
id: CMP-040
name: AuthProvider
layer: Adapter
subsystem: Auth
path: packages/auth/src/components/auth-provider.tsx
language: TypeScript
loc: 79
---

# [[CMP-040]] AuthProvider

## Responsibility
React context provider that manages Supabase auth session state and exposes it to child components.

## Public API
- `<AuthProvider>` — wraps app to provide auth context
- `useAuthContext() -> AuthContext` — hook to consume auth state

## Depends on (outbound)
- [[CMP-021]] BrowserClient — subscribes to auth state changes
- [[CMP-041]] UseAuth — auth utilities

## Depended on by (inbound)
- All 4 app root layouts — wrap application with auth context

## Reads config
- None

## Side effects
- Supabase auth state subscription (cleanup on unmount)

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/auth/src/components/auth-provider.tsx` (lines 1–79)
