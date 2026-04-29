---
id: CMP-017
name: StorageService
layer: Service
subsystem: Platform
path: packages/engine/src/services/storage.service.ts
language: TypeScript
loc: ❓ UNKNOWN
---

# [[CMP-017]] StorageService

## Responsibility
Manages file upload and retrieval via Supabase Storage for menu images, chef profile photos, and documents.

## Public API
- `uploadFile(bucket, path, file) -> Promise<string>` — uploads file and returns public URL
- `deleteFile(bucket, path) -> Promise<void>` — deletes a stored file
- `getPublicUrl(bucket, path) -> string` — returns public URL for a file

## Depends on (outbound)
- [[CMP-023]] AdminClient — storage operations require admin client

## Depended on by (inbound)
- Chef admin upload handlers

## Reads config
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (via admin client)

## Side effects
- Supabase Storage reads/writes

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/engine/src/services/storage.service.ts`
