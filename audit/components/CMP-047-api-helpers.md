---
id: CMP-047
name: ApiHelpers
layer: Util
subsystem: Utils
path: packages/utils/src/api.ts
language: TypeScript
loc: 143
---

# [[CMP-047]] ApiHelpers

## Responsibility
Provides typed fetch wrappers, error parsing, and response normalisation for API calls from all apps.

## Public API
- `apiGet<T>(url, options?) -> Promise<T>` — typed GET request
- `apiPost<T>(url, body, options?) -> Promise<T>` — typed POST request
- `apiPut<T>(url, body, options?) -> Promise<T>` — typed PUT request
- `apiDelete(url, options?) -> Promise<void>` — typed DELETE request
- `parseApiError(error) -> ApiError` — normalises error responses

## Depends on (outbound)
- None

## Depended on by (inbound)
- All app client-side data fetching
- [[CMP-064]] EngineWebClient — HTTP calls to engine server

## Reads config
- None

## Side effects
- HTTP requests (external)

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/utils/src/api.ts` (lines 1–143)
