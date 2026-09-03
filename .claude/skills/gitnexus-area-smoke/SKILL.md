---
name: gitnexus-area-smoke
description: "Skill for the Smoke area of ridendine-marketplace. 218 symbols across 16 files."
---

# Smoke

218 symbols | 16 files | Cohesion: 86%

## When to Use

- Working with code in `scripts/`
- Understanding how checkAuthenticatedJsonApi, checkPageContract, checkProtectedJsonApi work
- Modifying smoke-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `scripts/smoke/runtime-proof-action-smoke.cjs` | applySamplesToAction, credentialsFromEnv, firstEnv, hasDynamicSegment, requiresSampleResolution (+20) |
| `scripts/smoke/runtime-coverage-audit.cjs` | addSource, apiProofActionSource, collectContractSources, addApiSource, addPageSource (+19) |
| `scripts/smoke/runtime-surface-classification.cjs` | apiRows, classifyPage, collectSurfaceClassifications, escapeCell, failureRows (+18) |
| `scripts/smoke/runtime-contract-smoke.cjs` | checkAuthenticatedJsonApi, checkPageContract, checkProtectedJsonApi, checkPublicJsonApi, contractUrl (+15) |
| `scripts/smoke/ops-export-audit-smoke.cjs` | buildExportUrl, credentialsFromEnv, defaultDateWindow, fetchAuditRecent, fetchWithTimeout (+15) |
| `scripts/smoke/non-admin-role-fixture-smoke.cjs` | checkRoleProbe, contractApp, contractUrl, fetchWithTimeout, isJson (+15) |
| `scripts/smoke/runtime-sample-fixtures.cjs` | createControlledSupportTicket, credentialsFromEnv, discoverSamplesFromRuntime, fetchJson, firstArrayItem (+12) |
| `scripts/smoke/live-role-fixture-smoke.cjs` | normalizeOptions, runLiveRoleFixtureSmoke, checkLiveJsonProbe, contractUrl, fetchWithTimeout (+9) |
| `scripts/smoke/driver-shift-mutation-smoke.cjs` | assertJsonSuccess, assertShiftBelongsToFixture, getPayload, normalizeOptions, result (+8) |
| `scripts/smoke/runtime-proof-disposition.cjs` | collectProofDisposition, dispositionTotals, hasDynamicSegment, indexClassifications, proofDisposition (+8) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `FakePage` | Class | `scripts/smoke/responsive-production-smoke.test.cjs` | 60 |
| `checkAuthenticatedJsonApi` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 249 |
| `checkPageContract` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 87 |
| `checkProtectedJsonApi` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 148 |
| `checkPublicJsonApi` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 127 |
| `contractUrl` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 21 |
| `fetchWithTimeout` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 77 |
| `isHtml` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 38 |
| `isJson` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 44 |
| `looksLikeLogin` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 50 |
| `matchesRedirectTarget` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 57 |
| `normalizeOptions` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 272 |
| `readText` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 30 |
| `responseHeader` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 25 |
| `result` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 65 |
| `runRuntimeContractSmoke` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 288 |
| `trimBaseUrl` | Function | `scripts/smoke/runtime-contract-smoke.cjs` | 11 |
| `buildExportUrl` | Function | `scripts/smoke/ops-export-audit-smoke.cjs` | 20 |
| `credentialsFromEnv` | Function | `scripts/smoke/ops-export-audit-smoke.cjs` | 84 |
| `defaultDateWindow` | Function | `scripts/smoke/ops-export-audit-smoke.cjs` | 91 |

## How to Explore

1. `context({name: "checkAuthenticatedJsonApi"})` — see callers and callees
2. `query({search_query: "smoke"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
