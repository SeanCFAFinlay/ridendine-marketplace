# Order Ownership

Last updated: 2026-04-03

## Current Ownership Model

Customer web owns:

- cart
- checkout request
- customer order history and tracking views

Chef-admin owns:

- chef-scoped order handling where allowed by workflow
- prep-related updates through shared engine-owned transitions

Driver-app owns:

- assigned delivery execution updates only

Ops-admin owns:

- oversight, intervention, and cross-platform orchestration

## Engine-Owned Cross-App Transitions

The following cross-app transitions are currently centralized in shared engine code:

- chef `mark_ready` -> dispatch request handoff
- driver `delivered` -> order completion handoff
- payment failure -> order failure handling
- external refund sync -> order refund status handling

These are handled in:

- `packages/engine/src/orchestrators/platform.engine.ts`

## Ops Authority

Ops-admin is the control plane for:

- monitoring orders
- monitoring delivery exceptions
- overseeing dispatch
- refund visibility
- intervention when workflows fail or get stuck

## Current Debt

- Some read surfaces still compose order-related data directly in app code rather than shared read helpers.
- Legacy route surfaces still exist alongside engine-backed routes in ops-admin.
