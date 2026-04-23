# Master System Graph - Ridendine Full System

Combined view showing apps, packages, database, roles, and risk annotations.

---

## Full System Dependency Graph

```mermaid
graph TD
    subgraph Roles["User Roles"]
        R_CUST["Customer\nridendine.ca"]
        R_CHEF["Chef\nchef.ridendine.ca"]
        R_OPS["Ops Admin\nops.ridendine.ca"]
        R_DRIVER["Driver\ndriver.ridendine.ca"]
    end

    subgraph Apps["Applications"]
        WEB["apps/web\n22 pages | 80% mature\n🟡 No real-time tracking"]
        CHEF["apps/chef-admin\n11 pages | 75% mature\n🔴 No real-time order push"]
        OPS["apps/ops-admin\n18 pages | 65% mature\n🔴 Live map placeholder"]
        DRIVER["apps/driver-app\n5 pages | 70% mature\n🟡 History page missing"]
    end

    subgraph Packages["Shared Packages (9)"]
        DB["@ridendine/db\n22 repositories"]
        UI["@ridendine/ui\nComponents"]
        AUTH["@ridendine/auth\n⚠️ BYPASS_AUTH risk"]
        TYPES["@ridendine/types\nGenerated types"]
        VALIDATION["@ridendine/validation\nZod schemas"]
        UTILS["@ridendine/utils\nHelpers"]
        CONFIG["@ridendine/config\nTS/Tailwind"]
        NOTIFICATIONS["@ridendine/notifications\n⚠️ No provider"]
        ENGINE["@ridendine/engine\n7 orchestrators"]
    end

    subgraph Database["Supabase Database (36+ Tables)"]
        subgraph ChefDB["Chef Domain"]
            CHEF_PROFILES["chef_profiles"]
            CHEF_STOREFRONTS["chef_storefronts"]
        end
        subgraph CatalogDB["Catalog Domain"]
            MENU_CATS["menu_categories"]
            MENU_ITEMS["menu_items"]
        end
        subgraph CustomerDB["Customer Domain"]
            CUSTOMERS["customers"]
            CARTS["carts"]
            ORDERS["orders\n9 status values"]
        end
        subgraph DriverDB["Driver Domain"]
            DRIVERS["drivers"]
            DRIVER_PRESENCE["driver_presence"]
        end
        subgraph DeliveryDB["Delivery Domain"]
            DELIVERIES["deliveries\n10 status values"]
            DELIVERY_EVENTS["delivery_events"]
        end
    end

    subgraph External["External Integrations"]
        SUPABASE["Supabase\nPostgreSQL + Auth\n+ Storage + Real-time"]
        STRIPE["Stripe\nPayments + Webhooks\n⚠️ Connect not wired"]
        VERCEL["Vercel\n4 deployments"]
    end

    subgraph Risks["Critical Risks"]
        RISK1["🔴 BYPASS_AUTH\nAll 4 apps exposed\nin dev/preview"]
        RISK2["🔴 No Tests\n7 files total\n0% on core flows"]
        RISK3["🔴 No Notifications\nChef + Driver\npush missing"]
    end

    R_CUST --> WEB
    R_CHEF --> CHEF
    R_OPS --> OPS
    R_DRIVER --> DRIVER

    WEB --> DB
    WEB --> UI
    WEB --> AUTH
    WEB --> ENGINE
    WEB --> NOTIFICATIONS

    CHEF --> DB
    CHEF --> UI
    CHEF --> AUTH
    CHEF --> ENGINE

    OPS --> DB
    OPS --> UI
    OPS --> AUTH
    OPS --> ENGINE

    DRIVER --> DB
    DRIVER --> UI
    DRIVER --> AUTH
    DRIVER --> ENGINE

    ENGINE --> DB
    ENGINE --> STRIPE

    DB --> SUPABASE
    AUTH --> SUPABASE

    CHEF_PROFILES --> CHEF_STOREFRONTS
    CHEF_STOREFRONTS --> MENU_CATS
    MENU_CATS --> MENU_ITEMS
    CUSTOMERS --> CARTS
    CUSTOMERS --> ORDERS
    ORDERS --> DELIVERIES
    DRIVERS --> DRIVER_PRESENCE
    DRIVERS --> DELIVERIES
    DELIVERIES --> DELIVERY_EVENTS

    DB --> CHEF_PROFILES
    DB --> CUSTOMERS
    DB --> ORDERS
    DB --> DRIVERS
    DB --> DELIVERIES

    WEB --> VERCEL
    CHEF --> VERCEL
    OPS --> VERCEL
    DRIVER --> VERCEL

    AUTH -.->|"BYPASS_AUTH bug"| RISK1
    RISK2 -.->|"affects all apps"| WEB
    NOTIFICATIONS -.->|"no provider"| RISK3
```

---

## Order Flow Graph

```mermaid
sequenceDiagram
    participant C as Customer (web)
    participant WEB as apps/web API
    participant ENGINE as @ridendine/engine
    participant DB as Supabase DB
    participant STRIPE as Stripe
    participant CHEF as apps/chef-admin
    participant OPS as apps/ops-admin
    participant DRIVER as apps/driver-app

    C->>WEB: POST /api/checkout
    WEB->>ENGINE: createOrder()
    ENGINE->>STRIPE: Create PaymentIntent
    STRIPE-->>ENGINE: payment_intent_id
    ENGINE->>DB: INSERT orders, order_items
    ENGINE-->>WEB: { order_id, client_secret }
    WEB-->>C: Checkout page with Stripe Elements

    C->>STRIPE: Confirm Payment
    STRIPE->>WEB: webhook: payment_intent.succeeded
    WEB->>ENGINE: handlePaymentSuccess()
    ENGINE->>DB: UPDATE orders SET payment_status='paid'

    Note over CHEF: ⚠️ No real-time push - chef must refresh
    CHEF->>WEB: GET /api/orders (poll)
    DB-->>CHEF: New order visible

    CHEF->>WEB: PATCH /api/orders/[id] {status: 'accepted'}
    WEB->>ENGINE: acceptOrder()
    ENGINE->>DB: UPDATE orders, INSERT order_status_history

    OPS->>OPS: PATCH /api/deliveries/[id] (assign driver)
    OPS->>DB: INSERT delivery_assignments

    Note over DRIVER: ⚠️ No push notification for offer
    DRIVER->>DRIVER: GET /api/deliveries (poll)
    DRIVER->>DRIVER: PATCH /api/deliveries/[id] {status: 'accepted'}
    DRIVER->>DB: UPDATE deliveries, delivery_events

    DRIVER->>DRIVER: PATCH {status: 'picked_up'}
    DRIVER->>DB: UPDATE deliveries

    DRIVER->>DRIVER: PATCH {status: 'delivered'}
    DRIVER->>DB: UPDATE deliveries, INSERT driver_earnings
```

---

## Database Entity Relationships (Simplified)

```mermaid
graph LR
    chef_profiles -->|"1:1"| chef_storefronts
    chef_storefronts -->|"1:many"| menu_categories
    menu_categories -->|"1:many"| menu_items
    menu_items -->|"1:many"| menu_item_options

    customers -->|"1:many"| carts
    carts -->|"1:many"| cart_items
    cart_items -->|"ref"| menu_items

    customers -->|"1:many"| orders
    orders -->|"1:many"| order_items
    order_items -->|"ref"| menu_items
    orders -->|"1:1"| deliveries
    orders -->|"1:many"| order_status_history

    drivers -->|"1:1"| driver_presence
    drivers -->|"1:many"| deliveries
    deliveries -->|"1:many"| delivery_assignments
    delivery_assignments -->|"ref"| drivers
    deliveries -->|"1:many"| delivery_events
    deliveries -->|"1:many"| delivery_tracking_events

    orders -->|"1:1"| reviews
    customers -->|"writes"| reviews
    chef_storefronts -->|"receives"| reviews
```

---

## Risk Heat Map

```mermaid
quadrantChart
    title Risk Matrix - Ridendine Audit Findings
    x-axis Low Impact --> High Impact
    y-axis Low Likelihood --> High Likelihood
    quadrant-1 Critical - Fix Now
    quadrant-2 Monitor Closely
    quadrant-3 Low Priority
    quadrant-4 Mitigate Risk
    BYPASS_AUTH: [0.95, 0.95]
    No Test Coverage: [0.9, 0.9]
    No Notifications: [0.85, 0.8]
    No Real-time Chef: [0.7, 0.9]
    Live Map Placeholder: [0.65, 0.7]
    Stripe Connect Gap: [0.8, 0.6]
    Schema Drift: [0.6, 0.5]
    No Pagination: [0.5, 0.8]
    Driver History: [0.3, 0.9]
    Missing Review API: [0.3, 0.8]
```
