---
id: CMP-021
name: BrowserClient
layer: Adapter
subsystem: Database
path: packages/db/src/client/browser.ts
language: TypeScript
loc: 28
---

# [[CMP-021]] BrowserClient

## Responsibility
Creates a Supabase client configured for browser/client-side usage with the anon key.

## Public API
- `createBrowserClient() -> SupabaseClient` — returns configured browser Supabase client
- `getBrowserClient() -> SupabaseClient` — singleton accessor

## Depends on (outbound)
- @supabase/ssr — client creation

## Depended on by (inbound)
- [[CMP-039]] RealtimeHook — subscribes to realtime channels
- [[CMP-040]] AuthProvider — auth state management
- [[CMP-052]] WebCartContext — cart operations from browser
- [[CMP-053]] ChefOrdersList — reads orders in browser
- [[CMP-055]] OpsLiveMap — reads map data in browser
- [[CMP-056]] OpsAlertsPanel — reads alerts in browser
- [[CMP-061]] NotificationBell — reads notifications in browser

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
`packages/db/src/client/browser.ts` (lines 1–28)
