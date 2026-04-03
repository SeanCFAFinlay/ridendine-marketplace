# Chef Status

Last updated: 2026-04-03

## Current Source of Truth

Chef governance currently uses `chef_profiles.status`.

Current active statuses observed in code:

- `pending`
- `approved`
- `rejected`
- `suspended`

## Ownership

- Ops-admin owns chef status changes.
- Chef-admin does not own chef approval or suspension.

## Implemented Behavior

- `pending`
  - chef exists but is not yet approved for platform operation
  - storefront may exist, but public visibility is not allowed
- `approved`
  - chef is eligible for storefront publication by ops-admin
  - storefront still requires separate marketplace activation
- `rejected`
  - chef is not allowed to operate on the marketplace
  - active storefront visibility is removed if needed during governance change
- `suspended`
  - chef access is suspended by ops-admin
  - active storefront visibility is removed during suspension handling

## Engine-Owned Paths

Chef governance actions currently terminate in:

- `packages/engine/src/orchestrators/platform.engine.ts`

The platform engine method:

- `updateChefGovernance(...)`

is the current shared path for approval/rejection/suspension/restoration.

## Current Debt

- The status model is chef-level, not storefront-level.
- Storefront visibility still depends on a combination of chef status and storefront activation.
