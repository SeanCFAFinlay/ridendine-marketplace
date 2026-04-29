---
id: CMP-033
name: FinanceRepository
layer: Repository
subsystem: Commerce
path: packages/db/src/repositories/finance.repository.ts
language: TypeScript
loc: 262
---

# [[CMP-033]] FinanceRepository

## Responsibility
Provides database read/write operations for ledger entries, refund cases, and payout adjustments.

## Public API
- `createLedgerEntry(data) -> Promise<LedgerEntry>` — inserts financial ledger record
- `getLedgerByOrder(orderId) -> Promise<LedgerEntry[]>` — retrieves order's ledger entries
- `createRefundCase(data) -> Promise<RefundCase>` — opens refund case
- `updateRefundCase(id, data) -> Promise<RefundCase>` — updates refund status
- `createPayoutAdjustment(data) -> Promise<PayoutAdjustment>` — creates payout hold/release

## Depends on (outbound)
- [[CMP-022]] ServerClient / [[CMP-023]] AdminClient — DB access

## Depended on by (inbound)
- [[CMP-009]] CommerceLedgerEngine — all financial DB operations

## Reads config
- None

## Side effects
- DB writes: ledger_entries, refund_cases, payout_adjustments

## Tests
- ❓ UNKNOWN

## Smells / notes
- None identified

## Source
`packages/db/src/repositories/finance.repository.ts` (lines 1–262)
