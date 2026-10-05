---
name: gitnexus-area-health
description: "Skill for the Health area of ridendine-marketplace. 27 symbols across 10 files."
---

# Health

27 symbols | 10 files | Cohesion: 63%

## When to Use

- Working with code in `apps/`
- Understanding how GET, GET, GET work
- Modifying health-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/engine/src/core/health-checks.ts` | checkDatabaseHealth, checkDispatchHealth, checkEngineHealth, checkPaymentHealth, checkSystemHealth (+2) |
| `apps/ops-admin/src/app/dashboard/health/page.tsx` | HealthPage, formatDetailValue, formatTimestamp, getBaseUrl, loadEngineHealth (+2) |
| `packages/utils/src/api-response.ts` | healthPayload, ok, operationalHealthPayload |
| `apps/ops-admin/src/app/api/engine/health/route.ts` | GET, envReadiness, processorRunsReadiness |
| `packages/db/src/repositories/ops.repository.ts` | getOpsAdminHealthProbes, toProbe |
| `apps/chef-admin/src/app/api/health/route.ts` | GET |
| `apps/driver-app/src/app/api/health/route.ts` | GET |
| `apps/ops-admin/src/app/api/health/route.ts` | GET |
| `apps/web/src/app/api/health/route.ts` | GET |
| `packages/utils/src/api.ts` | apiSuccess |

## Entry Points

Start here when exploring this area:

- **`GET`** (Function) — `apps/chef-admin/src/app/api/health/route.ts:9`
- **`GET`** (Function) — `apps/driver-app/src/app/api/health/route.ts:9`
- **`GET`** (Function) — `apps/ops-admin/src/app/api/health/route.ts:9`
- **`GET`** (Function) — `apps/web/src/app/api/health/route.ts:9`
- **`getOpsAdminHealthProbes`** (Function) — `packages/db/src/repositories/ops.repository.ts:861`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `GET` | Function | `apps/chef-admin/src/app/api/health/route.ts` | 9 |
| `GET` | Function | `apps/driver-app/src/app/api/health/route.ts` | 9 |
| `GET` | Function | `apps/ops-admin/src/app/api/health/route.ts` | 9 |
| `GET` | Function | `apps/web/src/app/api/health/route.ts` | 9 |
| `getOpsAdminHealthProbes` | Function | `packages/db/src/repositories/ops.repository.ts` | 861 |
| `toProbe` | Function | `packages/db/src/repositories/ops.repository.ts` | 882 |
| `healthPayload` | Function | `packages/utils/src/api-response.ts` | 73 |
| `ok` | Function | `packages/utils/src/api-response.ts` | 8 |
| `operationalHealthPayload` | Function | `packages/utils/src/api-response.ts` | 85 |
| `apiSuccess` | Function | `packages/utils/src/api.ts` | 27 |
| `GET` | Function | `apps/ops-admin/src/app/api/engine/health/route.ts` | 60 |
| `checkDatabaseHealth` | Function | `packages/engine/src/core/health-checks.ts` | 23 |
| `checkDispatchHealth` | Function | `packages/engine/src/core/health-checks.ts` | 71 |
| `checkEngineHealth` | Function | `packages/engine/src/core/health-checks.ts` | 33 |
| `checkPaymentHealth` | Function | `packages/engine/src/core/health-checks.ts` | 104 |
| `checkSystemHealth` | Function | `packages/engine/src/core/health-checks.ts` | 139 |
| `HealthPage` | Function | `apps/ops-admin/src/app/dashboard/health/page.tsx` | 81 |
| `envReadiness` | Function | `apps/ops-admin/src/app/api/engine/health/route.ts` | 19 |
| `processorRunsReadiness` | Function | `apps/ops-admin/src/app/api/engine/health/route.ts` | 35 |
| `now` | Function | `packages/engine/src/core/health-checks.ts` | 13 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GET → UpstashRateLimitStore` | cross_community | 4 |
| `GET → HasUpstashConfig` | cross_community | 4 |
| `GET → UpstashRateLimitStore` | cross_community | 4 |
| `GET → HasUpstashConfig` | cross_community | 4 |
| `GET → UpstashRateLimitStore` | cross_community | 4 |
| `GET → HasUpstashConfig` | cross_community | 4 |
| `GET → HealthPayload` | intra_community | 3 |
| `GET → Status` | cross_community | 3 |
| `GET → Status` | cross_community | 3 |
| `GET → HealthPayload` | intra_community | 3 |

## How to Explore

1. `context({name: "GET"})` — see callers and callees
2. `query({search_query: "health"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
