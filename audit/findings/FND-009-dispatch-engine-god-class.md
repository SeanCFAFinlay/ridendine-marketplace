---
id: FND-009
category: Smell
severity: Medium
effort: L
---

# [[FND-009]] DispatchEngine god class (1310 LOC)

## Summary
The DispatchEngine at 1310 LOC handles dispatch requests, driver matching with complex scoring algorithm, offer management, delivery status updates, manual assignment, reassignment, dispatch board queries, and expired offer processing.

## Affected components
- [[CMP-008]] DispatchEngine

## Evidence
- `packages/engine/src/orchestrators/dispatch.engine.ts` (1310 lines)

## Why this matters
Large classes are harder to test, review, and modify. The driver scoring algorithm is tightly coupled with the dispatch flow, making it impossible to test or tune independently.

## Proposed fix
Extract into DriverMatchingService (scoring + selection), OfferManagementService (accept/decline/expire), and a thin DispatchOrchestrator coordinator.
