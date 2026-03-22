# Ridendine Database Schema

## Overview

The Ridendine database follows a chef-first architecture with six main domains:

1. **Chef Domain** - Chef profiles, kitchens, storefronts, documents
2. **Catalog Domain** - Menu categories, items, options
3. **Customer Domain** - Customers, addresses, carts, favorites
4. **Order Domain** - Orders, items, reviews, support
5. **Driver Domain** - Drivers, vehicles, shifts, earnings
6. **Delivery Domain** - Deliveries, assignments, tracking

## Entity Relationship Diagram

```
auth.users
    │
    ├── chef_profiles
    │       │
    │       ├── chef_kitchens
    │       │       │
    │       │       └── chef_storefronts ────────┐
    │       │               │                     │
    │       │               ├── menu_categories   │
    │       │               │       │             │
    │       │               │       └── menu_items
    │       │               │               │
    │       │               │               └── menu_item_options
    │       │               │                       │
    │       │               │                       └── menu_item_option_values
    │       │               │
    │       │               └── chef_availability
    │       │
    │       └── chef_documents
    │
    ├── customers
    │       │
    │       ├── customer_addresses
    │       ├── carts ─── cart_items
    │       └── favorites
    │
    ├── drivers
    │       │
    │       ├── driver_documents
    │       ├── driver_vehicles
    │       ├── driver_shifts
    │       ├── driver_presence
    │       └── driver_earnings
    │
    └── platform_users

orders ────────────┬─────────────────┬───────────────┐
    │              │                 │               │
    │              │                 │               │
order_items        │                 │               │
    │              │                 │               │
order_item_     order_status_    reviews        deliveries
modifiers       history                             │
                                                    │
                                    ┌───────────────┼───────────────┐
                                    │               │               │
                            delivery_         delivery_      delivery_
                            assignments       events         tracking_events
```

## Key Tables

### chef_storefronts
The public-facing entity for chef businesses. This is the primary listing model.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| chef_id | UUID | Reference to chef_profiles |
| kitchen_id | UUID | Reference to chef_kitchens |
| slug | VARCHAR | URL-friendly identifier |
| name | VARCHAR | Display name |
| cuisine_types | TEXT[] | Array of cuisine tags |
| is_active | BOOLEAN | Whether visible to customers |
| average_rating | DECIMAL | Computed from reviews |
| min_order_amount | DECIMAL | Minimum order value |

### orders
Central order tracking table.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_number | VARCHAR | Human-readable order ID (RD-XXXXXX) |
| customer_id | UUID | Reference to customers |
| storefront_id | UUID | Reference to chef_storefronts |
| status | VARCHAR | Current order status |
| subtotal | DECIMAL | Order subtotal |
| total | DECIMAL | Final total including fees |
| payment_status | VARCHAR | Payment processing status |

### deliveries
Delivery tracking and management.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| order_id | UUID | Reference to orders |
| driver_id | UUID | Reference to drivers (nullable) |
| status | VARCHAR | Current delivery status |
| pickup_address | TEXT | Chef location |
| dropoff_address | TEXT | Customer location |
| delivery_fee | DECIMAL | Fee charged to customer |
| driver_payout | DECIMAL | Amount paid to driver |

## Status Enums

### Order Status
```
pending → accepted → preparing → ready_for_pickup → picked_up → in_transit → delivered → completed
         ↘ rejected                                                         ↘ cancelled
                                                                              ↘ refunded
```

### Delivery Status
```
pending → assigned → accepted → en_route_to_pickup → arrived_at_pickup → picked_up → en_route_to_dropoff → arrived_at_dropoff → delivered → completed
                 ↘ rejected (re-queue)                                                                                           ↘ failed
                                                                                                                                  ↘ cancelled
```

### Chef/Driver Status
```
pending → approved
       ↘ rejected
       ↘ suspended
```

## Row Level Security

All tables have RLS enabled with policies for:

- **Public read** - Storefronts, menus (active only)
- **Owner access** - Profiles, addresses, orders (own data)
- **Role-based** - Chef manages storefront/menu, driver manages deliveries
- **Admin bypass** - Service role for ops operations
