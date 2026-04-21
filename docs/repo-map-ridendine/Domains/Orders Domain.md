# Orders Domain

> The central business entity connecting customers, chefs, drivers, and payments.

## Tables
- `orders` — Core entity with status, payment, pricing, timestamps
- `order_items` — Line items with menu_item reference
- `order_item_modifiers` — Selected customizations (schema only, not surfaced)
- `order_status_history` — Audit trail per order
- `reviews` — Post-delivery customer reviews

## Order State Machine

See [[Business Control Map#Order Lifecycle Control]] for the full state diagram.

**13 possible statuses**: pending, accepted, rejected, preparing, ready_for_pickup, picked_up, in_transit, delivered, completed, cancelled, refunded

**Terminal states**: rejected, cancelled, refunded, completed

## Order Financial Breakdown

| Field | Calculation |
|-------|------------|
| `subtotal` | Sum of (item_price × quantity) |
| `delivery_fee` | $5.00 flat |
| `service_fee` | 8% of subtotal |
| `tax` | 13% HST of (subtotal + service_fee) |
| `tip` | Customer choice (0/10/15/20% or custom) |
| `total` | subtotal + delivery + service + tax + tip - discount |

## Who Touches Orders

| App | Actions | Engine Methods |
|-----|---------|---------------|
| web | Create, Cancel, View history | `createOrder`, `authorizePayment`, `cancelOrder`, `getAllowedActions` |
| chef-admin | Accept, Reject, Prepare, Mark Ready | `acceptOrder`, `rejectOrder`, `startPreparing`, `markOrderReady` |
| ops-admin | All above + Override, Complete | All + `overrideStatus` |
| driver-app | View (via delivery) | Via `DispatchEngine` |

## Engine → DB Flow

1. `createOrder()` → INSERT `orders` + `order_items` + start SLA timer
2. `acceptOrder()` → UPDATE `orders.status`, INSERT `kitchen_queue_entries`
3. `startPreparing()` → UPDATE `orders.status`, `prep_started_at`
4. `markOrderReady()` → UPDATE `orders.status`, `ready_at` → auto-triggers dispatch
5. `completeOrder()` → UPDATE `orders.status`, `completed_at` → ledger entries
