# Finance Visibility

Last updated: 2026-04-03

## Current Source of Truth

The finance dashboard in ops-admin now reads real underlying finance state from:

- `ledger_entries`
- `refund_cases`
- `payout_adjustments`
- chef payables
- driver payables and tips

## Ownership

Ops-admin owns platform-wide finance visibility.

Chef-admin owns only chef-scoped finance visibility.

Driver-app owns only driver-scoped earnings visibility.

Customer web does not expose internal finance logic.

## Shared Engine and Shared Data Roles

- `packages/engine/src/orchestrators/commerce.engine.ts`
  - owns shared commerce and payout-adjustment logic
- `packages/db/src/repositories/finance.repository.ts`
  - now owns shared ops-facing finance read helpers for:
    - pending refund summaries
    - pending payout adjustment summaries
    - recent ledger entries
    - chef liability snapshots
    - driver liability snapshots

## What Ops Can See Today

Ops-admin finance currently exposes:

- captured revenue
- platform fees
- chef payables
- driver wages and tips
- pending refund review items
- pending payout adjustments
- recent ledger activity

## What Is Not Implemented

The platform does not currently expose a full payout-run execution system in the stabilized codebase.

That means:

- no fake payout-run history should be shown
- no fake “run payouts” workflow should be invented
- future payout execution should be built from the real ledger/adjustment model, not from placeholder UI

## Current Debt

- Chef-admin and driver-app finance views are still less normalized than ops-admin.
- A full payout execution lifecycle is still future work.
