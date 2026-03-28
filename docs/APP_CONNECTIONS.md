# APP CONNECTIONS

## Architecture Overview

```
                        ┌───────────────┐
                        │   SUPABASE    │
                        │   Database    │
                        │   + Auth      │
                        └───────┬───────┘
                                │
      ┌─────────────────────────┼─────────────────────────┐
      │                         │                         │
      ▼                         ▼                         ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│  @ridendine   │       │  @ridendine   │       │  @ridendine   │
│     /db       │       │    /auth      │       │   /engine     │
│  (Database)   │       │ (Auth Utils)  │       │(Business Logic)│
└───────────────┘       └───────────────┘       └───────────────┘
      │                         │                         │
      └─────────────────────────┼─────────────────────────┘
                                │
    ┌─────────────┬─────────────┼─────────────┬─────────────┐
    │             │             │             │             │
    ▼             ▼             ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│   WEB APP   │ │ CHEF ADMIN  │ │ OPS ADMIN   │ │ DRIVER APP  │
│ ridendine.ca│ │chef.ridendine│ │ops.ridendine│ │driver.ridendine│
│             │ │    .ca      │ │    .ca      │ │    .ca      │
│  Customer   │ │    Chef     │ │    Admin    │ │   Driver    │
│  Orders     │ │   Manages   │ │  Controls   │ │  Delivers   │
└─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
```

## Shared Packages (8)

| Package | Description |
|---------|-------------|
| `@ridendine/db` | Supabase clients and repositories |
| `@ridendine/ui` | Shared React components |
| `@ridendine/auth` | Authentication utilities |
| `@ridendine/types` | TypeScript types |
| `@ridendine/validation` | Zod schemas |
| `@ridendine/utils` | Utility functions |
| `@ridendine/config` | Shared configs (TS, Tailwind, ESLint) |
| `@ridendine/notifications` | Notification templates |

## Data Flow

### Customer Places Order

```
1. Customer (ridendine.ca)
   └── Creates order in Supabase

2. Triggers:
   └── Chef notification (chef.ridendine.ca)
   └── Ops visibility (ops.ridendine.ca)
   └── Customer confirmation email
```

### Chef Prepares Order

```
1. Chef (chef.ridendine.ca)
   └── Updates order status: accepted → preparing → ready

2. Triggers:
   └── Customer notification (status update)
   └── Ops can assign driver
```

### Driver Delivers

```
1. Ops (ops.ridendine.ca)
   └── Assigns driver to delivery

2. Driver (driver.ridendine.ca)
   └── Accepts delivery
   └── Updates: pickup → en_route → delivered

3. Triggers:
   └── Real-time GPS tracking
   └── Customer notifications
```

## Real-time Subscriptions

Apps subscribe to Supabase real-time updates:

| App | Subscribes To |
|-----|---------------|
| Web | Order status changes |
| Chef Admin | New orders, order updates |
| Ops Admin | All orders, deliveries, driver locations |
| Driver App | New delivery assignments, order ready notifications |

## API Endpoints per App

### Web App (ridendine.ca)
- `GET /api/chefs` - List storefronts
- `GET /api/chefs/[slug]` - Get storefront details
- `POST /api/cart` - Manage cart
- `POST /api/checkout` - Create order
- `GET /api/orders` - Order history

### Chef Admin (chef.ridendine.ca)
- `GET /api/orders` - Chef's orders
- `PATCH /api/orders/[id]` - Update order status
- `GET/POST/PATCH /api/menu` - Menu management
- `GET /api/analytics` - Chef analytics

### Ops Admin (ops.ridendine.ca)
- `GET /api/orders` - All orders
- `GET /api/chefs` - All chefs
- `GET /api/drivers` - All drivers
- `GET /api/customers` - All customers
- `GET /api/deliveries` - All deliveries
- `PATCH /api/deliveries/[id]` - Assign driver

### Driver App (driver.ridendine.ca)
- `GET /api/deliveries` - Available/active deliveries
- `PATCH /api/deliveries/[id]` - Update delivery status
- `GET /api/earnings` - Driver earnings
- `POST /api/location` - Update GPS location
