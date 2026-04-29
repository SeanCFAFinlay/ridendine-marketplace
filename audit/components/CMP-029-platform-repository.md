---
id: CMP-029
name: PlatformRepository
layer: Repository
subsystem: Platform
path: packages/db/src/repositories/platform.repository.ts
language: TypeScript
loc: 211
---

# [[CMP-029]] PlatformRepository

## Responsibility
Provides database read/write operations for platform settings and configuration values.

## Public API
- `getPlatformSettings() -> Promise<PlatformSettings>` — retrieves all platform settings
- `getSetting(key) -> Promise<string | null>` — retrieves a single setting value
- `updateSetting(key, value) -> Promise<void>` — updates a setting value

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-008]] DispatchEngine — reads dispatch configuration
- [[CMP-011]] PlatformWorkflowEngine — reads/writes platform settings

## Reads config
- None (is the source of platform config)

## Side effects
- DB reads/writes: platform_settings

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🟡 SMELL: Sophisticated fallback logic for missing settings; unclear what defaults apply when settings row absent — related to [[FND-003]]

## Source
`packages/db/src/repositories/platform.repository.ts` (lines 1–211)
