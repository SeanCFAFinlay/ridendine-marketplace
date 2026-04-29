---
id: CMP-022
name: ServerClient
layer: Adapter
subsystem: Database
path: packages/db/src/client/server.ts
language: TypeScript
loc: 46
---

# [[CMP-022]] ServerClient

## Responsibility
Creates a Supabase client configured for server-side (Next.js Server Components/Route Handlers) usage with cookie-based auth.

## Public API
- `createServerClient() -> SupabaseClient` — returns configured server Supabase client
- `createServerActionClient() -> SupabaseClient` — returns client for Server Actions

## Depends on (outbound)
- @supabase/ssr — server client creation
- next/headers — reads cookies for auth context

## Depended on by (inbound)
- All app server components and API route handlers

## Reads config
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Side effects
- None (client creation only)

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/client/server.ts` (lines 1–46)
