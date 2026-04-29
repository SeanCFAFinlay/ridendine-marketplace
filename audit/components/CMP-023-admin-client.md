---
id: CMP-023
name: AdminClient
layer: Adapter
subsystem: Database
path: packages/db/src/client/admin.ts
language: TypeScript
loc: 32
---

# [[CMP-023]] AdminClient

## Responsibility
Creates a Supabase client using the service role key to bypass RLS for administrative and engine-level operations.

## Public API
- `createAdminClient() -> SupabaseClient` — returns service-role Supabase client
- `getAdminClient() -> SupabaseClient` — singleton accessor

## Depends on (outbound)
- @supabase/supabase-js — admin client creation

## Depended on by (inbound)
- [[CMP-001]] EngineFactory — all orchestrators use admin client
- All API routes requiring elevated DB access

## Reads config
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Side effects
- None (client creation only)

## Tests
- ❓ UNKNOWN

## Smells / notes
- Service role key must never be exposed to browser; server-only usage enforced

## Source
`packages/db/src/client/admin.ts` (lines 1–32)
