# SUPABASE DATABASE TABLES (36 Tables)

## Chef Domain (8 Tables)

| Table | Description |
|-------|-------------|
| `chef_profiles` | Chef user profiles, status, bio |
| `chef_kitchens` | Physical kitchen locations |
| `chef_storefronts` | Public storefront (name, slug, ratings) |
| `chef_documents` | Verification docs (licenses, permits) |
| `chef_payout_accounts` | Stripe payout accounts |
| `chef_availability` | Operating hours per day |
| `chef_delivery_zones` | Delivery radius/polygon areas |

## Catalog Domain (5 Tables)

| Table | Description |
|-------|-------------|
| `menu_categories` | Food categories (Appetizers, Mains, etc) |
| `menu_items` | Individual dishes with prices |
| `menu_item_options` | Customizations (Size, Spice Level) |
| `menu_item_option_values` | Option choices (Small, Medium, Large) |
| `menu_item_availability` | Per-item schedule overrides |

## Customer Domain (5 Tables)

| Table | Description |
|-------|-------------|
| `customers` | Customer profiles |
| `customer_addresses` | Saved delivery addresses |
| `carts` | Shopping carts per storefront |
| `cart_items` | Items in cart with quantities |
| `favorites` | Favorited storefronts |

## Order Domain (7 Tables)

| Table | Description |
|-------|-------------|
| `orders` | Main order record (totals, status, payment) |
| `order_items` | Items in order with prices |
| `order_item_modifiers` | Selected options per item |
| `order_status_history` | Status change audit trail |
| `reviews` | Customer reviews and ratings |
| `promo_codes` | Discount codes |
| `support_tickets` | Customer support issues |

## Driver Domain (8 Tables)

| Table | Description |
|-------|-------------|
| `drivers` | Driver profiles and status |
| `driver_documents` | License, insurance, vehicle docs |
| `driver_vehicles` | Vehicle info (type, plates, color) |
| `driver_shifts` | Work sessions with earnings |
| `driver_presence` | Real-time online/offline status |
| `driver_locations` | GPS history during shifts |
| `driver_earnings` | Per-delivery earnings breakdown |
| `driver_payouts` | Payout records |

## Delivery Domain (4 Tables)

| Table | Description |
|-------|-------------|
| `deliveries` | Delivery record (pickup/dropoff, photos) |
| `delivery_assignments` | Driver assignment offers |
| `delivery_events` | Delivery audit log |
| `delivery_tracking_events` | GPS breadcrumbs during delivery |

## Platform Domain (5 Tables)

| Table | Description |
|-------|-------------|
| `platform_users` | Ops/admin user accounts |
| `admin_notes` | Internal notes on entities |
| `notifications` | User notifications |
| `audit_logs` | System-wide audit trail |
| `payout_runs` | Batch payout processing |

---

## Key Relationships

```
chef_profiles
    └── chef_storefronts (1:1)
           └── menu_categories (1:many)
                  └── menu_items (1:many)
                         └── menu_item_options (1:many)
                                └── menu_item_option_values (1:many)

customers
    └── customer_addresses (1:many)
    └── carts (1:many per storefront)
           └── cart_items (1:many)
    └── favorites (1:many)
    └── orders (1:many)

orders
    └── order_items (1:many)
           └── order_item_modifiers (1:many)
    └── order_status_history (1:many)
    └── deliveries (1:1)
    └── reviews (1:1)

drivers
    └── driver_documents (1:many)
    └── driver_vehicles (1:many)
    └── driver_shifts (1:many)
    └── driver_presence (1:1)
    └── driver_locations (1:many)
    └── driver_earnings (1:many)
    └── deliveries (1:many)

deliveries
    └── delivery_assignments (1:many)
    └── delivery_events (1:many)
    └── delivery_tracking_events (1:many)
```

## Price Calculations

| Fee | Amount |
|-----|--------|
| Delivery Fee | $3.99 |
| Service Fee | 8% of subtotal |
| HST (Ontario) | 13% of (subtotal + fees) |

## Status Values

### Chef Status
- `pending` - Awaiting approval
- `approved` - Active chef
- `rejected` - Application rejected
- `suspended` - Temporarily suspended

### Driver Status
- `pending` - Awaiting approval
- `approved` - Active driver
- `rejected` - Application rejected
- `suspended` - Temporarily suspended

### Order Status
- `pending`, `accepted`, `preparing`, `ready`, `picked_up`, `delivered`, `completed`, `cancelled`, `failed`

### Delivery Status
- `pending`, `assigned`, `accepted`, `en_route_to_pickup`, `arrived_at_pickup`, `picked_up`, `en_route_to_dropoff`, `arrived_at_dropoff`, `delivered`, `completed`
