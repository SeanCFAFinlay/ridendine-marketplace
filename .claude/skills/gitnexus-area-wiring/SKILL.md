---
name: gitnexus-area-wiring
description: "Skill for the Wiring area of ridendine-marketplace. 147 symbols across 3 files."
---

# Wiring

147 symbols | 3 files | Cohesion: 81%

## When to Use

- Working with code in `scripts/`
- Understanding how appStatusSummary, generateActionMap, generateApiCallMatrix work
- Modifying wiring-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `scripts/wiring/generate-wiring-docs.cjs` | appStatusSummary, generateActionMap, generateApiCallMatrix, generateApiInventory, generateAppPagesDocument (+73) |
| `scripts/wiring/generate-supabase-diagrams.cjs` | allRelationships, appToTableDiagram, columnRows, entityName, erDiagramForTables (+40) |
| `scripts/wiring/verify-known-wiring-fixes.cjs` | exists, pass, pass, pass, pass (+19) |

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `appStatusSummary` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1286 |
| `generateActionMap` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 798 |
| `generateApiCallMatrix` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1252 |
| `generateApiInventory` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 555 |
| `generateAppPagesDocument` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1594 |
| `generateArchitectureDocs` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1988 |
| `generateArchitectureReadme` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1606 |
| `generateCompleteReview` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1677 |
| `generateCompletion` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1009 |
| `generateDataEngineMap` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 576 |
| `generateEnvMatrix` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1269 |
| `generateEveryPageDocument` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1550 |
| `generateHtml` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 957 |
| `generateLinkMatrix` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1224 |
| `generateMaster` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 858 |
| `generateMissing` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 820 |
| `section` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 845 |
| `generateObsidian` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1907 |
| `generatePageDetail` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 1465 |
| `generatePageMatrix` | Function | `scripts/wiring/generate-wiring-docs.cjs` | 780 |

## How to Explore

1. `context({name: "appStatusSummary"})` — see callers and callees
2. `query({search_query: "wiring"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
