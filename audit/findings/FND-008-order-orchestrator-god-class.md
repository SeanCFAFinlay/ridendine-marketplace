---
id: FND-008
title: OrderOrchestrator is a 1348-LOC god class
category: Smell
severity: Medium
effort: L
status: Open
components: CMP-006
---

# [[FND-008]] OrderOrchestrator God Class

## Summary
[[CMP-006]] OrderOrchestrator at 1348 LOC handles the entire order lifecycle from creation through completion. It mixes order creation logic, payment orchestration, status state-machine transitions, and completion finalization in a single class, making it difficult to test, extend, or reason about independently.

## Evidence
- `order.orchestrator.ts`: 1348 LOC
- Methods span creation (createOrder), authorization (authorizePayment), kitchen submission (submitToKitchen), chef actions (acceptOrder, rejectOrder, startPreparing, markReady), lifecycle (cancelOrder, completeOrder), and ops (opsOverride)

## Impact
- Single large file is hard to navigate and review
- All order tests are concentrated in one test file; test isolation is weak
- Adding a new order state or modifying one phase risks regressions in unrelated phases
- Onboarding new engineers is harder

## Recommendation
Split into three focused orchestrators:
1. `OrderCreationOrchestrator` — createOrder, authorizePayment, submitToKitchen
2. `OrderStatusMachine` — acceptOrder, rejectOrder, startPreparing, markReady, cancelOrder
3. `OrderCompletionOrchestrator` — completeOrder, opsOverride, post-completion ledger/notification

Each should be individually tested and wired via [[CMP-001]] EngineFactory.

## Fix Effort
L — significant refactor; existing tests must be maintained throughout.
