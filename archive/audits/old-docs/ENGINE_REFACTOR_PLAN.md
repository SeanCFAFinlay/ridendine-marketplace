# Engine Refactor Plan

This document outlines future refactoring for FND-008 (OrderOrchestrator god class) and FND-009 (DispatchEngine god class). These are **deferred** from the current repair sprint due to high risk of regressions.

## FND-008: OrderOrchestrator (1348 LOC)

### Current State
`packages/engine/src/orchestrators/order.orchestrator.ts` handles:
- Order creation and validation
- Payment authorization
- Kitchen submission
- Order acceptance/rejection
- Preparation lifecycle
- Order readiness
- Cancellation
- Completion with ledger entries
- Ops override

### Proposed Split

| Module | Responsibility | Methods |
|--------|---------------|---------|
| `OrderCreationService` | Create orders, validate items, calculate totals | `createOrder` |
| `OrderPaymentService` | Payment auth, void, capture coordination | `authorizePayment`, payment void logic |
| `OrderStatusMachine` | Accept, reject, prepare, ready transitions | `acceptOrder`, `rejectOrder`, `startPreparing`, `markReady` |
| `OrderCompletionService` | Complete, cancel, ledger entries | `completeOrder`, `cancelOrder` |
| `OrderOpsService` | Override, allowed actions | `opsOverride`, `getAllowedActions` |

### Prerequisites
- All existing engine tests must pass before and after split
- Each new module needs its own test file
- The `OrderOrchestrator` class can remain as a facade that delegates to sub-modules

## FND-009: DispatchEngine (1310 LOC)

### Proposed Split

| Module | Responsibility | Methods |
|--------|---------------|---------|
| `DriverMatchingService` | Find eligible drivers, score and rank | `findEligibleDrivers`, `selectBestDriver`, `calculateDriverAssignmentScore` |
| `OfferManagementService` | Create, accept, decline, expire offers | `acceptOffer`, `declineOffer`, `processExpiredOffers` |
| `DispatchOrchestrator` | Thin coordinator | `requestDispatch`, `getDispatchBoard` |
| `DeliveryStatusService` | Status updates, proof handling | `updateDeliveryStatus` |
| `DispatchOpsService` | Manual assign, reassign | `manualAssign`, `reassignDelivery` |

### Risk Assessment
- **High risk:** Driver scoring algorithm is tightly coupled with dispatch flow
- **Mitigation:** Extract scoring first as a pure function (already partially done with `calculateDriverAssignmentScore`)
- **Testing:** The scoring algorithm needs comprehensive unit tests before extraction

## FND-007: OpsRepository Layer Violation — FIXED

**Status:** Fixed in repair sprint 2026-04-28.

Pure business logic functions (`scoreDriver`, `calculateDistanceKm`, `extractArea`) were extracted to `packages/utils/src/scoring.ts` and `packages/utils/src/geo.ts`. The ops.repository.ts now imports these shared utilities instead of defining its own copies. Tests added in `packages/utils/src/scoring.test.ts`.

## FND-008 & FND-009: Next Steps

### TODO: OrderOrchestrator Split
- File: `packages/engine/src/orchestrators/order.orchestrator.ts` (1348 LOC)
- Each proposed module above should get its own file under `packages/engine/src/orchestrators/order/`
- The existing `OrderOrchestrator` class becomes a thin facade
- **Prerequisite:** Comprehensive integration test coverage (currently only repair-validation tests exist)
- **Risk:** High — 10+ methods, 7+ DB tables touched, state machine logic interleaved
- **Estimated effort:** 2-3 days with full test verification

### TODO: DispatchEngine Split
- File: `packages/engine/src/orchestrators/dispatch.engine.ts` (1310 LOC)
- Driver scoring is already partially extracted to `packages/utils/src/scoring.ts` (FND-007 fix)
- Next step: extract `OfferManagementService` (accept/decline/expire are self-contained)
- **Prerequisite:** Integration tests for the full dispatch flow
- **Risk:** Medium-high — scoring algorithm coupling is the main hazard
- **Estimated effort:** 2-3 days with full test verification
