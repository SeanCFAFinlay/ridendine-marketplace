---
name: gitnexus-area-scripts
description: "Skill for the Scripts area of ridendine-marketplace. 25 symbols across 8 files."
---

# Scripts

25 symbols | 8 files | Cohesion: 75%

## When to Use

- Working with code in `scripts/`
- Understanding how POST, checkChefAcceptanceTimeout, checkDeliveryDelay work
- Modifying scripts-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/engine/src/core/sla-checks.ts` | checkChefAcceptanceTimeout, checkDeliveryDelay, checkDriverAssignmentTimeout, checkPickupDelay, checkStalePreparingOrders (+2) |
| `scripts/bootstrap-super-admin.mjs` | ensureAuthUser, ensurePlatformUser, exitWithError, findUserByEmail, getRequiredArg |
| `scripts/sla-runner.ts` | handleChefAcceptanceTimeouts, handleStalePreparingOrders, main, runSLATimers |
| `packages/db/scripts/generate-types.mjs` | loadDatabaseUrlFromEnvFiles, loadDatabaseUrlFromFile |
| `scripts/db-audit.mjs` | run, section |
| `scripts/local-cron.mjs` | now, tick |
| `scripts/verify-prod-data-hygiene.mjs` | isSanctionedLocalStackWorkflow, main |
| `apps/ops-admin/src/app/api/engine/processors/sla/route.ts` | POST |

## Entry Points

Start here when exploring this area:

- **`POST`** (Function) — `apps/ops-admin/src/app/api/engine/processors/sla/route.ts:23`
- **`checkChefAcceptanceTimeout`** (Function) — `packages/engine/src/core/sla-checks.ts:38`
- **`checkDeliveryDelay`** (Function) — `packages/engine/src/core/sla-checks.ts:139`
- **`checkDriverAssignmentTimeout`** (Function) — `packages/engine/src/core/sla-checks.ts:63`
- **`checkPickupDelay`** (Function) — `packages/engine/src/core/sla-checks.ts:89`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `POST` | Function | `apps/ops-admin/src/app/api/engine/processors/sla/route.ts` | 23 |
| `checkChefAcceptanceTimeout` | Function | `packages/engine/src/core/sla-checks.ts` | 38 |
| `checkDeliveryDelay` | Function | `packages/engine/src/core/sla-checks.ts` | 139 |
| `checkDriverAssignmentTimeout` | Function | `packages/engine/src/core/sla-checks.ts` | 63 |
| `checkPickupDelay` | Function | `packages/engine/src/core/sla-checks.ts` | 89 |
| `checkStalePreparingOrders` | Function | `packages/engine/src/core/sla-checks.ts` | 114 |
| `cutoffISO` | Function | `packages/engine/src/core/sla-checks.ts` | 23 |
| `elapsedMinutes` | Function | `packages/engine/src/core/sla-checks.ts` | 19 |
| `handleChefAcceptanceTimeouts` | Function | `scripts/sla-runner.ts` | 43 |
| `handleStalePreparingOrders` | Function | `scripts/sla-runner.ts` | 95 |
| `main` | Function | `scripts/sla-runner.ts` | 118 |
| `runSLATimers` | Function | `scripts/sla-runner.ts` | 38 |
| `ensureAuthUser` | Function | `scripts/bootstrap-super-admin.mjs` | 61 |
| `ensurePlatformUser` | Function | `scripts/bootstrap-super-admin.mjs` | 111 |
| `exitWithError` | Function | `scripts/bootstrap-super-admin.mjs` | 212 |
| `findUserByEmail` | Function | `scripts/bootstrap-super-admin.mjs` | 128 |
| `getRequiredArg` | Function | `scripts/bootstrap-super-admin.mjs` | 177 |
| `loadDatabaseUrlFromEnvFiles` | Function | `packages/db/scripts/generate-types.mjs` | 34 |
| `loadDatabaseUrlFromFile` | Function | `packages/db/scripts/generate-types.mjs` | 13 |
| `run` | Function | `scripts/db-audit.mjs` | 72 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `POST → AuditLogger` | cross_community | 4 |
| `POST → DomainEventEmitter` | cross_community | 4 |
| `POST → IsAvailable` | cross_community | 4 |
| `POST → CutoffISO` | intra_community | 3 |
| `POST → ElapsedMinutes` | intra_community | 3 |
| `POST → FromMock` | cross_community | 3 |
| `POST → From` | cross_community | 3 |

## How to Explore

1. `context({name: "POST"})` — see callers and callees
2. `query({search_query: "scripts"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
