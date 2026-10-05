---
name: gitnexus-area-orchestrators
description: "Skill for the Orchestrators area of ridendine-marketplace. 182 symbols across 50 files."
---

# Orchestrators

182 symbols | 50 files | Cohesion: 72%

## When to Use

- Working with code in `packages/`
- Understanding how getAdminEngine, createAuditLogger, createBusinessRulesEngine work
- Modifying orchestrators-related functionality

## Key Files

| File | Symbols |
|------|---------|
| `packages/engine/src/orchestrators/master-order-engine.ts` | MasterOrderEngine, createMasterOrderEngine, acceptOrder, authorizePayment, chefAccept (+14) |
| `packages/engine/src/orchestrators/platform.engine.ts` | PlatformWorkflowEngine, createPlatformWorkflowEngine, getChefGovernanceMessage, getChefGovernanceTitle, insertNotification (+12) |
| `packages/engine/src/orchestrators/delivery-engine.ts` | DeliveryEngine, createDeliveryEngine, cancelDelivery, driverAcceptDelivery, driverRejectDelivery (+10) |
| `packages/engine/src/orchestrators/operations-command.gateway.ts` | OperationsCommandGateway, createOperationsCommandGateway, fail, normalizeServiceResult, ok (+6) |
| `packages/engine/src/orchestrators/driver-matching.service.ts` | DriverMatchingService, createDriverMatchingService, computeDriverScores, getDriverScores, calculateDriverAssignmentScore (+5) |
| `packages/engine/src/orchestrators/payout-engine.ts` | PayoutEngine, createPayoutEngine, driverPayoutCents, makeActor, platformFeeCents (+5) |
| `packages/engine/src/orchestrators/order-state-machine.ts` | InvalidTransitionError, assertValidDeliveryTransition, assertValidOrderTransition, assertValidPayoutTransition, isValidDeliveryTransition (+2) |
| `packages/engine/src/orchestrators/risk.engine.ts` | evaluateCheckoutRisk, evaluateCustomerRisk, evaluateOrderRisk, evaluatePaymentRisk, finalizeResult (+2) |
| `packages/engine/src/orchestrators/dispatch-orchestrator.ts` | DispatchOrchestrator, createDispatchOrchestrator, updateDeliveryStatus, haversineKm, toRad (+1) |
| `packages/engine/src/orchestrators/kitchen-ticket-state.ts` | assertValidKitchenTicketTransition, isKitchenTicketStatus, isTerminalKitchenTicketStatus, isValidKitchenTicketTransition, kitchenStatusForOrderStatus (+1) |

## Entry Points

Start here when exploring this area:

- **`getAdminEngine`** (Function) — `packages/engine/src/client-helpers.ts:26`
- **`createAuditLogger`** (Function) — `packages/engine/src/core/audit-logger.ts:193`
- **`createBusinessRulesEngine`** (Function) — `packages/engine/src/core/business-rules-engine.ts:350`
- **`createResendProvider`** (Function) — `packages/engine/src/core/email-provider.ts:79`
- **`createCentralEngine`** (Function) — `packages/engine/src/core/engine.factory.ts:92`

## Key Symbols

| Symbol | Type | File | Line |
|--------|------|------|------|
| `AuditLogger` | Class | `packages/engine/src/core/audit-logger.ts` | 28 |
| `BusinessRulesEngine` | Class | `packages/engine/src/core/business-rules-engine.ts` | 39 |
| `DomainEventEmitter` | Class | `packages/engine/src/core/event-emitter.ts` | 75 |
| `NotificationSender` | Class | `packages/engine/src/core/notification-sender.ts` | 32 |
| `NotificationTriggers` | Class | `packages/engine/src/core/notification-triggers.ts` | 66 |
| `SLAManager` | Class | `packages/engine/src/core/sla-manager.ts` | 11 |
| `CommerceLedgerEngine` | Class | `packages/engine/src/orchestrators/commerce.engine.ts` | 105 |
| `DeliveryEngine` | Class | `packages/engine/src/orchestrators/delivery-engine.ts` | 141 |
| `DispatchOrchestrator` | Class | `packages/engine/src/orchestrators/dispatch-orchestrator.ts` | 46 |
| `DriverMatchingService` | Class | `packages/engine/src/orchestrators/driver-matching.service.ts` | 81 |
| `KitchenEngine` | Class | `packages/engine/src/orchestrators/kitchen.engine.ts` | 49 |
| `MasterOrderEngine` | Class | `packages/engine/src/orchestrators/master-order-engine.ts` | 209 |
| `OperationsCommandGateway` | Class | `packages/engine/src/orchestrators/operations-command.gateway.ts` | 88 |
| `OpsControlEngine` | Class | `packages/engine/src/orchestrators/ops.engine.ts` | 39 |
| `OrderCreationService` | Class | `packages/engine/src/orchestrators/order-creation.service.ts` | 85 |
| `PayoutEngine` | Class | `packages/engine/src/orchestrators/payout-engine.ts` | 90 |
| `PlatformWorkflowEngine` | Class | `packages/engine/src/orchestrators/platform.engine.ts` | 35 |
| `SupportExceptionEngine` | Class | `packages/engine/src/orchestrators/support.engine.ts` | 41 |
| `PayoutService` | Class | `packages/engine/src/services/payout.service.ts` | 37 |
| `ReconciliationService` | Class | `packages/engine/src/services/reconciliation.service.ts` | 21 |

## Execution Flows

| Flow | Type | Steps |
|------|------|-------|
| `GET → HoursBetween` | cross_community | 4 |
| `POST → AuditLogger` | cross_community | 4 |
| `POST → DomainEventEmitter` | cross_community | 4 |
| `POST → IsAvailable` | cross_community | 4 |
| `RunCheckout → FinalizeResult` | cross_community | 4 |
| `RunCheckout → IsAllowedCurrency` | cross_community | 4 |
| `RunCheckout → NormalizeCurrency` | cross_community | 4 |
| `GET → HoursBetween` | cross_community | 4 |
| `POST → HoursBetween` | cross_community | 4 |
| `GET → HoursBetween` | cross_community | 4 |

## How to Explore

1. `context({name: "getAdminEngine"})` — see callers and callees
2. `query({search_query: "orchestrators"})` — find related execution flows
3. Read key files listed above for implementation details
4. `explain({target: "<file or symbol>"})` — persisted taint findings (source→sink data flows), when indexed with `--pdg`
