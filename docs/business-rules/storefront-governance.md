# Storefront Governance

Last updated: 2026-04-03

## Current Implemented Truth

Storefront governance is currently represented by a combination of:

- `chef_profiles.status`
- `chef_storefronts.is_active`

This is the real implemented rule today.

## Public Visibility Rule

A storefront is public only when:

1. the related chef is `approved`
2. the storefront is `is_active = true`

Shared public storefront reads in `packages/db` enforce both conditions.

## Ownership

- Ops-admin owns storefront publish and unpublish.
- Ops-admin also owns storefront pause/unpause and queue/load controls already exposed through shared engine paths.
- Chef-admin can edit chef-scoped storefront content/settings, but cannot change marketplace visibility.

## Engine-Owned Paths

Storefront governance actions currently terminate in:

- `packages/engine/src/orchestrators/platform.engine.ts`
  - `publishStorefront(...)`
  - `unpublishStorefront(...)`
- `packages/engine/src/orchestrators/kitchen.engine.ts`
  - pause/unpause and queue controls

## Chef Restrictions

`apps/chef-admin/src/app/api/storefront/route.ts` rejects `is_active` writes.

This prevents chefs from self-publishing or self-unpublishing their storefronts.

## Current Debt

- There is not yet a first-class typed storefront governance status field such as:
  - `draft`
  - `pending_approval`
  - `published`
  - `paused`
  - `suspended`
- The codebase already uses those concepts, but the schema does not yet expose them as a clean single source of truth.

## Migration Needed For First-Class Governance

If this is upgraded later, the safe path is:

1. add an explicit storefront governance status column
2. backfill it from current chef status + `is_active` + pause state
3. migrate shared reads first
4. migrate engine-owned writes second
5. remove old dual-condition logic only after parity is proven

This has not been done yet in order to avoid a risky schema change during stabilization.
