# Business Engine Enhancement Final Report

**Date**: 2026-04-29
**Status**: Complete
**Tests**: 348/348 passing (20 test files, 120+ new tests)

---

## Summary

The Ridendine platform has been enhanced from a lifecycle-controlled system to a complete operational business engine. All new modules integrate with the existing `CentralEngine` factory and are accessible via the singleton pattern used by all four apps.

---

## Modules Added

### 1. Business Rules Engine (`core/business-rules-engine.ts`)
Centralized validation logic with 9 rule functions:
- `canCustomerCreateOrder` — storefront active, chef approved, items available, prices match, min order $10
- `canChefAcceptOrder` — ownership, order pending, storefront not paused
- `canChefRejectOrder` — ownership + reason required
- `canDriverAcceptDelivery` — delivery available, driver approved, driver online
- `canDriverPickupOrder` — driver assigned, delivery in pickup-ready state
- `canDriverDeliverOrder` — driver assigned, delivery in delivery-ready state
- `canCustomerCancelOrder` — ownership, cancellable status only
- `canOpsOverrideOrder` — ops_manager or super_admin only
- `canReleasePayout` — order completed, payment completed, no open exceptions

### 2. SLA Check Functions (`core/sla-checks.ts`)
Standalone timeout detection:
- `checkChefAcceptanceTimeout` — orders pending > 5 min
- `checkDriverAssignmentTimeout` — deliveries pending > 10 min
- `checkPickupDelay` — pickup stale > 25 min
- `checkDeliveryDelay` — in-transit stale > 35 min
- `checkStalePreparingOrders` — preparing > 45 min

### 3. SLA Runner Script (`scripts/sla-runner.ts`)
Standalone script for periodic execution:
- Processes expired SLA timers
- Auto-cancels orders with chef acceptance timeout
- Escalates stuck driver assignments to ops
- Creates system alerts for stale preparing orders
- Flushes engine events

### 4. Payout Engine (`orchestrators/payout-engine.ts`)
Chef and driver payout lifecycle:
- `calculateChefPayout` — subtotal minus 15% platform fee
- `calculateDriverEarnings` — 80% of delivery fee + tip
- `markPayoutEligible` — validates completion + no exceptions, creates ledger entry
- `markPayoutProcessing` — updates status with audit
- `markPayoutPaid` — records Stripe transfer ID with audit + event emission

### 5. Notification Triggers (`core/notification-triggers.ts`)
Event-driven notification dispatch:
- `onOrderCreated` — notifies customer + chef
- `onChefAccepted/Rejected` — notifies customer
- `onOrderReady` — notifies customer
- `onDriverOffered` — notifies driver (resolves user_id from driver_profiles)
- `onDriverAssigned` — notifies customer
- `onOrderDelivered` — notifies customer
- `onOrderCancelled` — direct DB notification insert
- `onRefundProcessed` — direct DB notification insert

### 6. Health Check System (`core/health-checks.ts` + API route)
System health monitoring:
- `checkDatabaseHealth` — connectivity test
- `checkEngineHealth` — SLA breaches, open exceptions
- `checkDispatchHealth` — online drivers, pending deliveries
- `checkPaymentHealth` — Stripe config, recent failures
- `checkSystemHealth` — aggregates all checks
- **API endpoint**: `GET /api/engine/health` returns overall + component status

### 7. Event Hardening (`core/event-emitter.ts`)
Enhanced domain events:
- `correlation_id` auto-injected into every event payload
- `order_id` and `delivery_id` normalized into every event
- `setCorrelation()` / `clearCorrelation()` for request-scoped correlation

---

## Logic Enforced

| Rule | Enforcement Point |
|------|-------------------|
| Chef must be approved | BusinessRulesEngine.canCustomerCreateOrder |
| Storefront must be active | BusinessRulesEngine.canCustomerCreateOrder |
| Items must be available | BusinessRulesEngine.canCustomerCreateOrder |
| Prices must match DB | BusinessRulesEngine.canCustomerCreateOrder |
| Min order $10 | BusinessRulesEngine.canCustomerCreateOrder |
| Only owner chef can accept | BusinessRulesEngine.canChefAcceptOrder |
| Reject requires reason | BusinessRulesEngine.canChefRejectOrder |
| Driver must be approved+online | BusinessRulesEngine.canDriverAcceptDelivery |
| Only assigned driver can pickup | BusinessRulesEngine.canDriverPickupOrder |
| Customer can only cancel early | BusinessRulesEngine.canCustomerCancelOrder |
| Ops override requires role | BusinessRulesEngine.canOpsOverrideOrder |
| Payout only after completion | BusinessRulesEngine.canReleasePayout + PayoutEngine |
| No payout with open exceptions | PayoutEngine.markPayoutEligible |

## Financial Tracking

| Entry Type | Created When |
|------------|-------------|
| chef_payable | Order completed, payout eligible |
| driver_payable | Order completed, payout eligible |
| customer_charge_auth | Payment authorized |
| customer_charge_capture | Payment captured |
| customer_refund | Refund processed |
| platform_fee | Order completed |
| All entries | Persisted in `ledger_entries` table |

## Dispatch Ranking (Pre-existing, Verified)

Score formula: `distance_score + rating_score + experience_score + fairness_bonus - workload_penalty - decline_penalty - expiry_penalty`

- Distance: `max(0, (12km - actual) * 10)`
- Rating: `(rating || 4) * 5`
- Experience: `min(deliveries, 500) / 25`
- Fairness: `fairness_score * 12`
- Workload: `-active * 25`
- Declines: `-recent * 8`
- Expiries: `-recent * 10`

## SLA Automation

| SLA Type | Threshold | Action |
|----------|-----------|--------|
| Chef acceptance | 5 min | Auto-cancel order |
| Driver assignment | 10 min | Escalate to ops |
| Preparing stale | 45 min | System alert |
| Pickup delay | 25 min | SLA violation |
| Delivery delay | 35 min | SLA violation |

---

## Files Changed

### Modified (9 files)
- `packages/types/src/enums.ts` — canonical status enums
- `packages/types/src/engine/index.ts` — engine delivery status
- `packages/engine/src/core/engine.factory.ts` — wired rules, payouts to factory
- `packages/engine/src/core/index.ts` — new exports
- `packages/engine/src/core/event-emitter.ts` — correlation_id support
- `packages/engine/src/index.ts` — new module exports
- `packages/engine/package.json` — new entry points
- `apps/ops-admin/.../refund/route.ts` — engine-routed refunds
- `apps/chef-admin/.../payouts/request/route.ts` — audit logging

### New Files (22 files)
| File | Purpose |
|------|---------|
| `packages/engine/src/core/business-rules-engine.ts` | Validation rules |
| `packages/engine/src/core/business-rules-engine.test.ts` | 37 tests |
| `packages/engine/src/core/sla-checks.ts` | SLA timeout detection |
| `packages/engine/src/core/sla-checks.test.ts` | 17 tests |
| `packages/engine/src/core/notification-triggers.ts` | Event-driven notifications |
| `packages/engine/src/core/notification-triggers.test.ts` | 15 tests |
| `packages/engine/src/core/health-checks.ts` | System health monitoring |
| `packages/engine/src/core/health-checks.test.ts` | 24 tests |
| `packages/engine/src/core/event-emitter.test.ts` | 14 tests |
| `packages/engine/src/orchestrators/master-order-engine.ts` | Order lifecycle authority |
| `packages/engine/src/orchestrators/master-order-engine.test.ts` | 19 tests |
| `packages/engine/src/orchestrators/delivery-engine.ts` | Delivery lifecycle authority |
| `packages/engine/src/orchestrators/delivery-engine.test.ts` | 11 tests |
| `packages/engine/src/orchestrators/order-state-machine.ts` | Hard state machine |
| `packages/engine/src/orchestrators/order-state-machine.test.ts` | 25 tests |
| `packages/engine/src/orchestrators/payout-engine.ts` | Payout lifecycle |
| `packages/engine/src/orchestrators/payout-engine.test.ts` | 14 tests |
| `scripts/sla-runner.ts` | SLA cron script |
| `apps/ops-admin/.../engine/health/route.ts` | Health check API |
| `docs/audits/engine-rewrite-audit-2026-04-29.md` | Pre-change audit |
| `docs/audits/business-engine-enhancement-scan-2026-04-29.md` | Safety scan |
| `docs/audits/business-engine-enhancement-2026-04-29.md` | This report |

---

## Test Results

```
Test Files:  20 passed (20)
Tests:       348 passed (348)
Duration:    1.36s
```

New test coverage by module:
- State machine: 25 tests
- MasterOrderEngine: 19 tests
- DeliveryEngine: 11 tests
- BusinessRulesEngine: 37 tests
- SLA checks: 17 tests
- PayoutEngine: 14 tests
- NotificationTriggers: 15 tests
- HealthChecks: 24 tests
- EventEmitter: 14 tests
- **Total new tests: 176**

---

## Remaining Gaps

1. **Payout state machine**: PayoutEngine manages payouts but doesn't have a formal state machine like orders/deliveries. Status transitions (processing->completed/failed) are validated by business logic, not a transition map.

2. **Notification provider integration**: Email provider (Resend) exists but is the only external channel. SMS/push are placeholder-ready via the NotificationDeliveryProvider interface.

3. **SLA runner deployment**: The `scripts/sla-runner.ts` script needs to be deployed as a cron job or scheduled task. It's not auto-running.

4. **E2E test modernization**: Existing E2E tests still use direct DB mutations. They should be updated to use engine methods.

5. **BusinessRulesEngine integration**: The rules engine is available on `engine.rules.*` but existing orchestrator methods don't call it yet. App routes can call `engine.rules.canX()` before calling engine methods as a pre-flight check.

---

## Architecture After Enhancement

```
┌─────────────────────────────────────────────────────┐
│                    App Routes                        │
│  (web, chef-admin, ops-admin, driver-app)           │
└────────────────────────┬────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────┐
│              CentralEngine (singleton)               │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐ │
│  │  rules   │  │ masterOrder  │  │ masterDelivery│ │
│  │ (validate│  │ (transitions)│  │ (transitions) │ │
│  └──────────┘  └──────────────┘  └───────────────┘ │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐│
│  │ payouts  │  │   sla    │  │   notifications    ││
│  │ (finance)│  │ (timers) │  │   (event-driven)   ││
│  └──────────┘  └──────────┘  └────────────────────┘│
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │    Domain Orchestrators (facades)             │   │
│  │  orders · kitchen · dispatch · commerce      │   │
│  │  support · platform · ops                    │   │
│  └──────────────────────────────────────────────┘   │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │  audit   │  │  events  │  │  health checks   │  │
│  │  logger  │  │  (w/corr)│  │  (db/eng/pay/dsp)│  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
└──────────────────────────────────────────────────────┘
```
