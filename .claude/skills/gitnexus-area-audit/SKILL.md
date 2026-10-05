---
name: gitnexus-area-audit
description: "Skill for the Audit area of ridendine-marketplace. 87 symbols across 8 files."
---

# Audit

87 symbols | 8 files | Cohesion: 92%

## When to Use

- Working with code in `scripts/`
- Understanding how abs, acceptanceCriteria, actionsFor work
- Modifying audit-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `scripts/audit/generate-production-readiness-audit.cjs` | abs, acceptanceCriteria, actionsFor, apiRisk, capabilityReport (+47) |
| `scripts/audit/high-risk-ops-negative-authz.cjs` | denialSummary, escapeCell, generateMarkdown, keyFor, phase11MethodRows (+4) |
| `scripts/audit/sean-super-admin-fixture.cjs` | escapeCell, generateMarkdown, normalized, read, validateFixtureContracts (+3) |
| `scripts/audit/high-risk-ops-authz-contracts.cjs` | escapeCell, generateMarkdown, writeDocs, writeFileEnsured, methodBody (+3) |
| `scripts/audit/verify-db-hardening.mjs` | fail, isAllowlistedDefiner, pass, run |
| `scripts/wiring/verify-known-wiring-fixes.cjs` | pass, pass |
| `scripts/audit/check-api-route-guards.mjs` | findApiRoutes, walkRouteFiles |
| `scripts/audit/db-boundary-ratchet.mjs` | countWarningsForApp, main |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `abs` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 17 |
| `acceptanceCriteria` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 482 |
| `actionsFor` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 307 |
| `apiRisk` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 310 |
| `capabilityReport` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 320 |
| `classifyEntity` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 136 |
| `commandCenterReport` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 384 |
| `deploymentReport` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 421 |
| `evidence` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 115 |
| `executiveReport` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 494 |
| `exists` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 18 |
| `externalFor` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 309 |
| `financeReport` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 328 |
| `first30Tasks` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 477 |
| `fixFor` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 308 |
| `flowReport` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 311 |
| `gapMatrix` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 450 |
| `generateReports` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 146 |
| `hasRole` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 73 |
| `ledgerReport` | Function | `scripts/audit/generate-production-readiness-audit.cjs` | 345 |

## How to Explore

1. `context({name: "abs"})` — see callers and callees
2. `query({search_query: "audit"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
