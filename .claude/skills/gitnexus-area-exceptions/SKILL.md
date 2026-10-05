---
name: gitnexus-area-exceptions
description: "Skill for the Exceptions area of ridendine-marketplace. 39 symbols across 4 files."
---

# Exceptions

39 symbols | 4 files | Cohesion: 77%

## When to Use

- Working with code in `apps/`
- Understanding how formatExceptionLabel, formatExceptionStatus, getAge work
- Modifying exceptions-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | formatExceptionLabel, formatExceptionStatus, getAge, getExceptionSlaState, getPrimaryAction (+8) |
| `apps/ops-admin/src/app/dashboard/exceptions/page.tsx` | AlertRail, ExceptionsPage, SummaryCard, filterItems, formatDate (+8) |
| `apps/ops-admin/src/app/dashboard/exceptions/exception-actions.tsx` | submitAction, ExceptionActions, draftForMode, actionFromMode, modeLabel (+2) |
| `apps/ops-admin/src/app/dashboard/exceptions/exception-actions-model.ts` | buildExceptionActionPayload, cleanText, getExceptionActionError, getExceptionActionAvailability, isTerminalExceptionStatus (+1) |

## Entry Points

Start here when exploring this area:

- **`formatExceptionLabel`** (Function) — `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts:109`
- **`formatExceptionStatus`** (Function) — `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts:117`
- **`getAge`** (Function) — `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts:173`
- **`getExceptionSlaState`** (Function) — `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts:142`
- **`getPrimaryAction`** (Function) — `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts:194`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `formatExceptionLabel` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 109 |
| `formatExceptionStatus` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 117 |
| `getAge` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 173 |
| `getExceptionSlaState` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 142 |
| `getPrimaryAction` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 194 |
| `getWaitingOn` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 187 |
| `mapQueueItem` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 211 |
| `ExceptionsPage` | Function | `apps/ops-admin/src/app/dashboard/exceptions/page.tsx` | 300 |
| `getExceptionTone` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 121 |
| `getSlaTone` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 135 |
| `getStatusTone` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 127 |
| `buildExceptionActionPayload` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-actions-model.ts` | 96 |
| `getExceptionActionError` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-actions-model.ts` | 80 |
| `submitAction` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-actions.tsx` | 63 |
| `ExceptionActions` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-actions.tsx` | 37 |
| `draftForMode` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-actions.tsx` | 99 |
| `buildExceptionQueue` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 275 |
| `getPriorityScore` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 253 |
| `isOpen` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-queue-model.ts` | 271 |
| `getExceptionActionAvailability` | Function | `apps/ops-admin/src/app/dashboard/exceptions/exception-actions-model.ts` | 64 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `ExceptionsPage → FromMock` | cross_community | 4 |
| `ExceptionsPage → FromMock` | cross_community | 4 |
| `ExceptionsPage → From` | cross_community | 4 |
| `ExceptionsPage → From` | cross_community | 4 |
| `ExceptionsPage → CreateAdminClient` | cross_community | 3 |

## How to Explore

1. `context({name: "formatExceptionLabel"})` — see callers and callees
2. `query({search_query: "exceptions"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
