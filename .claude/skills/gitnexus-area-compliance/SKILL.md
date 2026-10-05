---
name: gitnexus-area-compliance
description: "Skill for the Compliance area of ridendine-marketplace. 30 symbols across 8 files."
---

# Compliance

30 symbols | 8 files | Cohesion: 76%

## When to Use

- Working with code in `apps/`
- Understanding how cell, getComplianceTone, getDocumentTone work
- Modifying compliance-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts` | getComplianceTone, getDocumentTone, buildComplianceQueue, buildComplianceSubject, calculateRiskLevel (+9) |
| `apps/ops-admin/src/app/dashboard/compliance/page.tsx` | CompactSubjectRow, CompliancePage, SubjectTable, SummaryCard, loadComplianceSubjects |
| `apps/ops-admin/src/app/dashboard/compliance/compliance-panel.tsx` | CompliancePanel, DocumentRow, formatDate |
| `apps/ops-admin/src/app/dashboard/chefs/page.tsx` | cell, statusToVariant |
| `apps/ops-admin/src/app/dashboard/drivers/page.tsx` | cell, statusToVariant |
| `packages/ui/src/components/status-badge.tsx` | StatusBadge, resolveStatus |
| `apps/ops-admin/src/app/dashboard/dispatch/page.tsx` | cell |
| `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx` | getChefComplianceSubject |

## Entry Points

Start here when exploring this area:

- **`cell`** (Function) — `apps/ops-admin/src/app/dashboard/chefs/page.tsx:148`
- **`getComplianceTone`** (Function) — `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts:125`
- **`getDocumentTone`** (Function) — `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts:132`
- **`CompliancePanel`** (Function) — `apps/ops-admin/src/app/dashboard/compliance/compliance-panel.tsx:49`
- **`CompliancePage`** (Function) — `apps/ops-admin/src/app/dashboard/compliance/page.tsx:160`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `cell` | Function | `apps/ops-admin/src/app/dashboard/chefs/page.tsx` | 148 |
| `getComplianceTone` | Function | `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts` | 125 |
| `getDocumentTone` | Function | `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts` | 132 |
| `CompliancePanel` | Function | `apps/ops-admin/src/app/dashboard/compliance/compliance-panel.tsx` | 49 |
| `CompliancePage` | Function | `apps/ops-admin/src/app/dashboard/compliance/page.tsx` | 160 |
| `cell` | Function | `apps/ops-admin/src/app/dashboard/dispatch/page.tsx` | 150 |
| `cell` | Function | `apps/ops-admin/src/app/dashboard/drivers/page.tsx` | 203 |
| `StatusBadge` | Function | `packages/ui/src/components/status-badge.tsx` | 47 |
| `buildComplianceQueue` | Function | `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts` | 294 |
| `buildComplianceSubject` | Function | `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts` | 237 |
| `getRequiredDocumentTypes` | Function | `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts` | 119 |
| `formatComplianceDocumentType` | Function | `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts` | 103 |
| `formatComplianceStatus` | Function | `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts` | 111 |
| `ComplianceDocumentRow` | Interface | `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts` | 7 |
| `ComplianceDocumentView` | Interface | `apps/ops-admin/src/app/dashboard/compliance/compliance-model.ts` | 20 |
| `statusToVariant` | Function | `apps/ops-admin/src/app/dashboard/chefs/page.tsx` | 40 |
| `DocumentRow` | Function | `apps/ops-admin/src/app/dashboard/compliance/compliance-panel.tsx` | 24 |
| `formatDate` | Function | `apps/ops-admin/src/app/dashboard/compliance/compliance-panel.tsx` | 17 |
| `CompactSubjectRow` | Function | `apps/ops-admin/src/app/dashboard/compliance/page.tsx` | 100 |
| `SubjectTable` | Function | `apps/ops-admin/src/app/dashboard/compliance/page.tsx` | 132 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `CompliancePage → FormatComplianceDocumentType` | cross_community | 5 |
| `CompliancePage → FormatComplianceStatus` | cross_community | 5 |
| `CompliancePage → GetExpiryState` | cross_community | 5 |
| `DriverDetailPage → FormatComplianceDocumentType` | cross_community | 5 |
| `DriverDetailPage → GetExpiryState` | cross_community | 5 |
| `ChefDetailPage → FromMock` | cross_community | 4 |
| `CompliancePage → FromMock` | cross_community | 4 |
| `CompliancePage → FromMock` | cross_community | 4 |
| `CompliancePage → From` | cross_community | 4 |
| `CompliancePage → From` | cross_community | 4 |

## How to Explore

1. `context({name: "cell"})` — see callers and callees
2. `query({search_query: "compliance"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
