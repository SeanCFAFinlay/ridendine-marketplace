---
id: FND-018
category: BrokenWire
severity: Medium
effort: S
---

# [[FND-018]] Notification insert with null user_id

## Summary
OrderOrchestrator.submitToKitchen() inserts a notification with chefUserId which may be null if the storefront or chef profile lookup fails. The notifications.user_id column has a NOT NULL constraint.

## Affected components
- [[CMP-006]] OrderOrchestrator

## Evidence
- `packages/engine/src/orchestrators/order.orchestrator.ts` lines 395-419

## Why this matters
If chef lookup fails (e.g., storefront has no chef profile linked), the notification INSERT throws a DB constraint violation error, potentially leaving the order in an inconsistent state.

## Proposed fix
Wrap the notification insert in `if (chefUserId)` guard.
