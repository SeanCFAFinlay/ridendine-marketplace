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
│               │       │               │       │  + /routing   │
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

## Shared Packages (9)

| Package | Description |
|---------|-------------|
| `@ridendine/db` | Supabase clients and repositories |
| `@ridendine/ui` | Shared React components |
| `@ridendine/auth` | Authentication utilities |
| `@ridendine/types` | TypeScript types (includes **`PublicOrderStage`** / `mapEngineStatusToPublicStage` for customer UI — Phase 0) |
| `@ridendine/validation` | Zod schemas |
| `@ridendine/utils` | Utility functions |
| `@ridendine/config` | Shared configs (TS, Tailwind, ESLint) |
| `@ridendine/notifications` | Notification templates |
| `@ridendine/routing` | **Phase 1:** `RoutingProvider` (OSRM default, Mapbox stub), polyline/progress helpers, **`EtaService`** — writes cached route/ETA columns on **`deliveries`** only; no customer coordinate leak. |

## Data Flow

### Customer Places Order

```
1. Customer (ridendine.ca)
   └── Creates order in Supabase (`orders.status` legacy + `orders.engine_status` + **`orders.public_stage`** derived for safe customer copy — see [`BUSINESS_ENGINE.md`](BUSINESS_ENGINE.md))

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
   └── Real-time GPS tracking (ops/driver surfaces; customer apps use **`public_stage`** + future **ETA / route_progress_pct** — not raw coordinates)
   └── Customer notifications
```

### Engine → routing (Phase 1)

- **`packages/engine`** constructs **`EtaService`** (`@ridendine/routing`) with the same Supabase client used elsewhere.
- ETAs are recomputed at **kitchen submit**, **driver assign**, and **picked up** (see [`ORDER_FLOW.md`](ORDER_FLOW.md) / [`BUSINESS_ENGINE.md`](BUSINESS_ENGINE.md)).

### Customer realtime (Phase 2 — privacy)

- **Web** `useOrderStream` subscribes to **`order:{orderId}`** and listens for **`order_update`** (broadcast). Payload is **whitelist-only** (stage, ETAs, progress, remaining seconds, cached dropoff polyline). **No** driver/chef lat/lng.
- **Polling** `/api/orders/{id}` is a **fallback** when Realtime disconnects; primary truth for display is **`public_stage`** from the stream or **`tracking.public_stage`** from the API.
- **Driver app** sends **`deliveryId`** on location POST while on the **customer leg**; server refreshes ETA and emits **`broadcastPublic`** — never raw coordinates to the customer channel.

### Driver dispatch realtime (Phase 3)

- **`OfferAlert`** subscribes to **`driver:{driverId}:offers`** (`broadcast` events **`offer`** / **`offer_expired`**) via **`createBrowserClient`** — **no HTTP polling** for offers.
- **`POST /api/offers`** validates the session driver and calls **`DispatchEngine.respondToOffer`**.
- **Ops:** **`GET /api/engine/dispatch`** (command center read model) + **`GET /api/engine/dispatch/offer-history`** (24h attempts) power **`/dashboard/dispatch`**. **`POST /api/engine/dispatch`** supports **`force_assign`** with **`reason`** (audited override).

## Real-time Subscriptions

Apps subscribe to Supabase real-time updates:

| App | Subscribes To |
|-----|---------------|
| Web | Order status changes |
| Chef Admin | New orders, order updates |
| Ops Admin | **`ops:live`** unified board: `postgres_changes` on orders, deliveries, driver_presence, chef_storefronts; optional **`ops.live.patch`** / **`board.refresh`** broadcasts; legacy **`ops:orders`** / **`ops:map:presence`** may still be used on other pages |
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
- `GET /api/ops/live-board` - Initial snapshot for the **live operations board** (orders + deliveries join, drivers + presence, storefronts + chef name, engine pressure counts); consumed by **`useOpsLiveFeed`** with Realtime on **`ops:live`** (no polling-first path; 60s fallback only when disconnected).
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
