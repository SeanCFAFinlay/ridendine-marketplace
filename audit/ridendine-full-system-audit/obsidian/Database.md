# Database

All 36 database tables organized by domain. Supabase (PostgreSQL) with Row Level Security.

Related: [[Home]] | [[APIs]] | [[Apps]] | [[Integrations]]

---

## Chef Domain (7 Tables)

| Table | Description | Key APIs |
|-------|-------------|---------|
| `chef_profiles` | Chef user profiles, status, bio | [[APIs#chef-admin]], [[APIs#ops-admin]] |
| `chef_kitchens` | Physical kitchen locations | [[APIs#chef-admin]] |
| `chef_storefronts` | Public storefront (name, slug, ratings) | [[APIs#web]], [[APIs#chef-admin]] |
| `chef_documents` | Verification docs (licenses, permits) | [[APIs#ops-admin]] |
| `chef_payout_accounts` | Stripe payout accounts | [[APIs#chef-admin]] |
| `chef_availability` | Operating hours per day of week | [[APIs#chef-admin]] |
| `chef_delivery_zones` | Delivery radius/polygon areas | [[APIs#chef-admin]], [[APIs#web]] |

### Chef Relationships
```
chef_profiles (1:1) chef_storefronts
chef_profiles (1:many) chef_kitchens
chef_profiles (1:1) chef_payout_accounts
chef_profiles (1:many) chef_availability
chef_profiles (1:many) chef_delivery_zones
```

---

## Catalog Domain (5 Tables)

| Table | Description | Key APIs |
|-------|-------------|---------|
| `menu_categories` | Food categories (Appetizers, Mains, etc) | [[APIs#chef-admin]], [[APIs#web]] |
| `menu_items` | Individual dishes with prices | [[APIs#chef-admin]], [[APIs#web]] |
| `menu_item_options` | Customizations (Size, Spice Level) | [[APIs#chef-admin]], [[APIs#web]] |
| `menu_item_option_values` | Option choices (Small, Medium, Large) | [[APIs#chef-admin]], [[APIs#web]] |
| `menu_item_availability` | Per-item schedule overrides | [[APIs#chef-admin]] |

### Catalog Relationships
```
chef_storefronts (1:many) menu_categories
menu_categories (1:many) menu_items
menu_items (1:many) menu_item_options
menu_item_options (1:many) menu_item_option_values
```

---

## Customer Domain (5 Tables)

| Table | Description | Key APIs |
|-------|-------------|---------|
| `customers` | Customer profiles | [[APIs#web]] |
| `customer_addresses` | Saved delivery addresses | [[APIs#web]] |
| `carts` | Shopping carts per storefront | [[APIs#web]] |
| `cart_items` | Items in cart with quantities | [[APIs#web]] |
| `favorites` | Favorited storefronts | [[APIs#web]] |

### Customer Relationships
```
customers (1:many) customer_addresses
customers (1:many) carts (per storefront)
carts (1:many) cart_items
customers (1:many) favorites
```

---

## Order Domain (7 Tables)

| Table | Description | Key APIs |
|-------|-------------|---------|
| `orders` | Main order record (totals, status, payment) | [[APIs#web]], [[APIs#chef-admin]], [[APIs#ops-admin]] |
| `order_items` | Items in order with prices at time of purchase | All apps |
| `order_item_modifiers` | Selected options per item | All apps |
| `order_status_history` | Status change audit trail | [[APIs#ops-admin]] |
| `reviews` | Customer reviews and ratings | [[APIs#web]], [[APIs#chef-admin]] |
| `promo_codes` | Discount codes | [[APIs#web]] |
| `support_tickets` | Customer support issues | [[APIs#web]], [[APIs#ops-admin]] |

### Order Status Values
`pending` → `accepted` → `preparing` → `ready` → `picked_up` → `delivered` → `completed`
Also: `cancelled`, `failed`

### Fee Structure
| Fee | Amount |
|-----|--------|
| Delivery Fee | $3.99 |
| Service Fee | 8% of subtotal |
| HST (Ontario) | 13% of (subtotal + fees) |

---

## Driver Domain (8 Tables)

| Table | Description | Key APIs |
|-------|-------------|---------|
| `drivers` | Driver profiles and status | [[APIs#driver-app]], [[APIs#ops-admin]] |
| `driver_documents` | License, insurance, vehicle docs | [[APIs#ops-admin]] |
| `driver_vehicles` | Vehicle info (type, plates, color) | [[APIs#driver-app]] |
| `driver_shifts` | Work sessions with earnings | [[APIs#driver-app]] |
| `driver_presence` | Real-time online/offline status | [[APIs#driver-app]] |
| `driver_locations` | GPS history during shifts | [[APIs#driver-app]] |
| `driver_earnings` | Per-delivery earnings breakdown | [[APIs#driver-app]], [[APIs#ops-admin]] |
| `driver_payouts` | Payout records | [[APIs#ops-admin]] |

### Driver Status Values
`pending` → `approved` (or `rejected` / `suspended`)

---

## Delivery Domain (4 Tables)

| Table | Description | Key APIs |
|-------|-------------|---------|
| `deliveries` | Delivery record (pickup/dropoff, photos) | [[APIs#driver-app]], [[APIs#ops-admin]] |
| `delivery_assignments` | Driver assignment offers | [[APIs#driver-app]], [[APIs#ops-admin]] |
| `delivery_events` | Delivery audit log | [[APIs#ops-admin]] |
| `delivery_tracking_events` | GPS breadcrumbs during delivery | [[APIs#ops-admin]] |

### Delivery Status Values
`pending` → `assigned` → `accepted` → `en_route_to_pickup` → `arrived_at_pickup` → `picked_up` → `en_route_to_dropoff` → `arrived_at_dropoff` → `delivered` → `completed`

---

## Platform Domain (5 Tables)

| Table | Description | Key APIs |
|-------|-------------|---------|
| `platform_users` | Ops/admin user accounts | [[APIs#ops-admin]] |
| `admin_notes` | Internal notes on entities | [[APIs#ops-admin]] |
| `notifications` | User notifications | All apps |
| `audit_logs` | System-wide audit trail | [[APIs#ops-admin]] |
| `payout_runs` | Batch payout processing | [[APIs#ops-admin]] |

---

## Table Count by Domain

| Domain | Tables |
|--------|--------|
| Chef | 7 |
| Catalog | 5 |
| Customer | 5 |
| Order | 7 |
| Driver | 8 |
| Delivery | 4 |
| Platform | 5 |
| **Total** | **41** |

Note: The executive summary references 36 tables, but a detailed count across all domains yields 41. The discrepancy is likely due to tables added in later migrations not reflected in the original schema doc. See [[Risks#schema-drift]].
