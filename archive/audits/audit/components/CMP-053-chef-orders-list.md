---
id: CMP-053
name: ChefOrdersList
layer: UI
subsystem: ChefAdmin
path: apps/chef-admin/src/components/orders/orders-list.tsx
language: TypeScript
loc: 322
---

# [[CMP-053]] ChefOrdersList

## Responsibility
Displays live kitchen order queue for chefs with accept/reject actions and countdown timers.

## Public API
- `<ChefOrdersList storefrontId>` — renders order queue with action buttons

## Depends on (outbound)
- [[CMP-021]] BrowserClient — realtime order subscription
- [[CMP-064]] EngineChefClient — accept/reject order actions

## Depended on by (inbound)
- Chef admin kitchen/orders page

## Reads config
- None

## Side effects
- Calls engine accept/reject endpoints
- Realtime subscription to order updates

## Tests
- ❓ UNKNOWN

## Smells / notes
- 🟡 8-minute countdown timer logic embedded directly in component; should extract to a hook or utility

## Source
`apps/chef-admin/src/components/orders/orders-list.tsx` (lines 1–322)
