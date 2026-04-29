---
id: CMP-009
name: CommerceLedgerEngine
layer: Service
subsystem: Commerce
path: packages/engine/src/orchestrators/commerce.engine.ts
language: TypeScript
loc: 934
---

# [[CMP-009]] CommerceLedgerEngine

## Responsibility
Manages the financial ledger including payment capture, refund lifecycle, and payout hold management.

## Public API
- `recordPaymentAuth(orderId, paymentIntentId, amount) -> Promise<LedgerEntry>` — records payment authorization
- `recordPaymentCapture(orderId, amount) -> Promise<LedgerEntry>` — records payment capture
- `requestRefund(orderId, amount, reason, requesterId) -> Promise<RefundCase>` — opens a refund request
- `approveRefund(refundCaseId, approverId) -> Promise<RefundCase>` — approves a refund
- `processRefund(refundCaseId) -> Promise<RefundCase>` — executes the refund
- `denyRefund(refundCaseId, reason, approverId) -> Promise<RefundCase>` — denies a refund
- `createPayoutHold(chefId, amount, reason) -> Promise<PayoutAdjustment>` — holds chef payout
- `releasePayoutHold(holdId, releaserId) -> Promise<PayoutAdjustment>` — releases a payout hold
- `getOrderFinancials(orderId) -> Promise<OrderFinancials>` — retrieves full financial breakdown
- `getPendingRefunds(filters) -> Promise<RefundCase[]>` — lists refunds awaiting action
- `getFinancialSummary(filters) -> Promise<FinancialSummary>` — aggregated financial report

## Depends on (outbound)
- [[CMP-002]] DomainEventEmitter — emits financial events
- [[CMP-003]] AuditLogger — logs financial operations

## Depended on by (inbound)
- [[CMP-001]] EngineFactory — registered as commerce domain handler

## Reads config
- None directly

## Side effects
- DB writes: ledger_entries, refund_cases, payout_adjustments, orders

## Tests
- `packages/engine/src/orchestrators/commerce.engine.test.ts`

## Smells / notes
- None identified

## Source
`packages/engine/src/orchestrators/commerce.engine.ts` (lines 1–934)
