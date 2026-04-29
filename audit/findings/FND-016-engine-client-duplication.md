---
id: FND-016
category: Duplicate
severity: Medium
effort: S
---

# [[FND-016]] Duplicate engine client wrappers

## Summary
All 4 apps have nearly identical `src/lib/engine.ts` files implementing the same singleton getEngine() pattern with app-specific actor context getters.

## Affected components
- [[CMP-064]] EngineWebClient
- [[CMP-065]] EngineChefClient
- [[CMP-066]] EngineOpsClient
- [[CMP-067]] EngineDriverClient

## Evidence
- `apps/web/src/lib/engine.ts`
- `apps/chef-admin/src/lib/engine.ts`
- `apps/ops-admin/src/lib/engine.ts`
- `apps/driver-app/src/lib/engine.ts`

## Why this matters
Changes to engine initialization must be replicated in 4 places.

## Proposed fix
Move singleton pattern to `packages/engine/src/client.ts`. Each app imports and configures with its actor context getter.
