# Role Ownership Matrix

Last updated: 2026-04-03

This file documents the current implemented ownership model in the RIDENDINE monorepo.

## Ops Admin

App: `apps/ops-admin`
Domain: `ops.ridendine.ca`

Ops-admin currently owns:

- chef approval, rejection, suspension, and restoration
- storefront publication and unpublication
- storefront pause/unpause and queue-related operational controls
- order oversight and intervention surfaces
- delivery oversight and dispatch governance surfaces
- refund visibility and payout-adjustment visibility
- platform-level finance visibility
- customer, driver, chef, and storefront oversight

Ops-admin stateful governance actions must terminate in shared engine/domain code.

## Chef Admin

App: `apps/chef-admin`
Domain: `chef.ridendine.ca`

Chef-admin currently owns:

- chef-scoped storefront profile setup
- chef-scoped menu/categories/items
- chef-owned order handling steps that are allowed by workflow
- chef-scoped payouts view, reviews view, and settings

Chef-admin does not own:

- chef approval
- storefront publication or marketplace visibility
- other chefs' data
- platform-wide operations

## Driver App

App: `apps/driver-app`
Domain: `driver.ridendine.ca`

Driver-app currently owns:

- assigned delivery execution
- pickup/transit/delivered workflow steps allowed by shared engine rules
- driver-scoped earnings/history/profile views

Driver-app does not own:

- chef/storefront governance
- platform-wide dispatch governance
- customer or other driver oversight

## Customer Web

App: `apps/web`
Domain: `ridendine.ca`

Customer web currently owns:

- browsing chefs/storefronts
- viewing governed public menu/storefront data
- cart and checkout
- customer account/order history/tracking surfaces

Customer web does not own:

- internal ops workflows
- chef/storefront governance
- finance internals

## Shared Ownership Rules

- `packages/db` owns shared typed data access and read/write helpers.
- `packages/engine` owns stateful business logic and cross-app transitions.
- No app page should invent its own critical operational workflow when shared engine/domain code already exists.

## Current Debt

- Some read-heavy ops-admin, chef-admin, and driver-app pages still compose their read models directly instead of using shared repo helpers.
- Role ownership on the write path is much stronger than role ownership on the read-model layer.
