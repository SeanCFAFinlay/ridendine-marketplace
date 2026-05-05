# Repo Tree

> Full directory structure of the Ride N Dine monorepo, classified by domain.

## Root Configuration

| File | Purpose |
|------|---------|
| `package.json` | Root monorepo manifest (pnpm 9.15.0, Node >=20) |
| `pnpm-workspace.yaml` | Workspace definition: `apps/*`, `packages/*` |
| `turbo.json` | Turborepo build orchestration |
| `.env` / `.env.local` / `.env.vercel` | Environment configs |
| `pnpm-lock.yaml` | Dependency lock |
| `CLAUDE.md` | AI assistant context |

---

## Apps

### `apps/web` — Customer Marketplace (port 3000)

```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root: AuthProvider → CartProvider
│   │   ├── page.tsx                # Home: hero, featured chefs, CTA
│   │   ├── loading.tsx             # Global spinner
│   │   ├── error.tsx               # Error boundary
│   │   ├── not-found.tsx           # 404 page
│   │   ├── auth/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx      # Email/password login
│   │   │   ├── signup/page.tsx     # Customer registration
│   │   │   └── forgot-password/page.tsx
│   │   ├── chefs/
│   │   │   ├── page.tsx            # Browse chefs grid + filters
│   │   │   └── [slug]/page.tsx     # Storefront detail + menu
│   │   ├── cart/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx            # Cart review + quantity controls
│   │   ├── checkout/page.tsx       # 2-step: details → Stripe payment
│   │   ├── order-confirmation/
│   │   │   └── [orderId]/page.tsx  # Real-time tracking + map
│   │   ├── account/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx            # Profile overview
│   │   │   ├── orders/page.tsx     # Order history
│   │   │   ├── addresses/page.tsx  # CRUD addresses
│   │   │   ├── favorites/page.tsx  # Empty state (placeholder)
│   │   │   └── settings/page.tsx   # Profile + notifications
│   │   ├── about/page.tsx
│   │   ├── how-it-works/page.tsx
│   │   ├── contact/page.tsx        # Support form
│   │   ├── privacy/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── chef-signup/page.tsx
│   │   ├── chef-resources/page.tsx
│   │   └── api/
│   │       ├── auth/login/route.ts
│   │       ├── auth/signup/route.ts
│   │       ├── cart/route.ts           # GET/POST/PATCH/DELETE
│   │       ├── checkout/route.ts       # POST (engine + Stripe)
│   │       ├── addresses/route.ts      # GET/POST/PATCH/DELETE
│   │       ├── orders/route.ts         # GET
│   │       ├── orders/[id]/route.ts    # GET/PATCH
│   │       ├── profile/route.ts        # GET/PATCH
│   │       ├── notifications/route.ts  # GET/POST/PATCH
│   │       ├── notifications/subscribe/route.ts  # POST/DELETE
│   │       ├── support/route.ts        # POST
│   │       └── webhooks/stripe/route.ts # POST (webhook)
│   ├── components/
│   │   ├── layout/header.tsx
│   │   ├── auth/auth-layout.tsx
│   │   ├── auth/password-strength.tsx
│   │   ├── chefs/chefs-list.tsx        # Server component
│   │   ├── chefs/chefs-filters.tsx     # Client (non-functional filters)
│   │   ├── storefront/storefront-header.tsx
│   │   ├── storefront/storefront-menu.tsx
│   │   ├── home/featured-chefs.tsx     # Server component
│   │   ├── notifications/notification-bell.tsx
│   │   └── tracking/order-tracking-map.tsx  # Leaflet
│   ├── contexts/
│   │   └── cart-context.tsx        # Cart state + API calls
│   └── lib/
│       ├── engine.ts               # Engine singleton + actor context
│       ├── auth-helpers.ts         # getCurrentCustomer, handleApiError
│       └── order-helpers.ts        # Fee constants, calculations
├── middleware.ts                    # Protects /account, redirects auth
├── next.config.js
├── tailwind.config.ts
└── package.json
```

### `apps/chef-admin` — Chef Dashboard (port 3001)

```
apps/chef-admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root: AuthProvider
│   │   ├── page.tsx                # Redirect → /dashboard
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── auth/
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx      # Chef login
│   │   │   └── signup/page.tsx     # Chef registration
│   │   ├── dashboard/
│   │   │   ├── layout.tsx          # Sidebar + Header
│   │   │   ├── loading.tsx         # Skeleton cards
│   │   │   ├── page.tsx            # Stats + recent orders
│   │   │   ├── menu/page.tsx       # Menu CRUD
│   │   │   ├── orders/page.tsx     # Order management
│   │   │   ├── storefront/page.tsx # Storefront setup/edit
│   │   │   ├── payouts/page.tsx    # Earnings + Stripe Connect
│   │   │   ├── analytics/page.tsx  # Charts + metrics
│   │   │   ├── reviews/page.tsx    # Reviews + responses
│   │   │   └── settings/page.tsx   # Profile form
│   │   └── api/
│   │       ├── auth/signup/route.ts
│   │       ├── menu/route.ts           # GET/POST
│   │       ├── menu/[id]/route.ts      # GET/PATCH/DELETE
│   │       ├── menu/categories/route.ts # GET/POST
│   │       ├── orders/route.ts         # GET
│   │       ├── orders/[id]/route.ts    # GET/PATCH (engine actions)
│   │       ├── profile/route.ts        # GET/PATCH
│   │       ├── storefront/route.ts     # GET/POST/PATCH
│   │       ├── payouts/setup/route.ts  # POST (Stripe Connect)
│   │       └── payouts/request/route.ts # POST (transfer)
│   ├── components/
│   │   ├── auth/auth-layout.tsx
│   │   ├── auth/password-strength.tsx
│   │   ├── layout/header.tsx
│   │   ├── layout/sidebar.tsx
│   │   ├── menu/menu-list.tsx
│   │   ├── orders/orders-list.tsx      # Real-time + countdown
│   │   ├── profile/profile-form.tsx
│   │   ├── storefront/storefront-form.tsx
│   │   └── storefront/storefront-setup-form.tsx
│   └── lib/
│       └── engine.ts               # Engine + chef actor context
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
└── package.json
```

### `apps/ops-admin` — Operations Control Plane (port 3002)

```
apps/ops-admin/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Redirect → /dashboard
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── auth/login/page.tsx
│   │   ├── dashboard/
│   │   │   ├── page.tsx                # Command center
│   │   │   ├── analytics/page.tsx
│   │   │   ├── chefs/
│   │   │   │   ├── page.tsx            # Chef list + governance
│   │   │   │   ├── [id]/page.tsx       # Chef detail
│   │   │   │   ├── [id]/chef-governance-actions.tsx
│   │   │   │   ├── [id]/storefront-governance-actions.tsx
│   │   │   │   └── approvals/page.tsx  # Pending approvals
│   │   │   ├── customers/
│   │   │   │   ├── page.tsx            # Customer list
│   │   │   │   └── [id]/page.tsx       # Customer detail
│   │   │   ├── deliveries/
│   │   │   │   ├── page.tsx            # Dispatch command center
│   │   │   │   ├── [id]/page.tsx       # Delivery intervention
│   │   │   │   └── [id]/delivery-actions.tsx
│   │   │   ├── drivers/
│   │   │   │   ├── page.tsx            # Driver list + governance
│   │   │   │   ├── [id]/page.tsx       # Driver detail
│   │   │   │   └── [id]/driver-governance-actions.tsx
│   │   │   ├── orders/
│   │   │   │   ├── page.tsx            # Order list
│   │   │   │   ├── [id]/page.tsx       # Order detail + audit
│   │   │   │   └── [id]/status-actions.tsx
│   │   │   ├── finance/
│   │   │   │   ├── page.tsx            # Finance operations
│   │   │   │   └── finance-actions.tsx
│   │   │   ├── support/page.tsx        # Support queue
│   │   │   ├── settings/
│   │   │   │   ├── page.tsx            # Platform rules
│   │   │   │   └── settings-form.tsx
│   │   │   └── map/page.tsx            # Live map (dynamic import)
│   │   └── api/
│   │       ├── chefs/route.ts          # GET/POST/PATCH
│   │       ├── chefs/[id]/route.ts     # PATCH (governance)
│   │       ├── customers/route.ts      # GET/POST
│   │       ├── deliveries/route.ts     # GET
│   │       ├── deliveries/[id]/route.ts # PATCH
│   │       ├── drivers/route.ts        # GET/POST
│   │       ├── drivers/[id]/route.ts   # PATCH (governance)
│   │       ├── orders/route.ts         # GET
│   │       ├── orders/[id]/route.ts    # GET/PATCH
│   │       ├── orders/[id]/refund/route.ts  # POST
│   │       ├── support/route.ts        # GET/POST
│   │       ├── support/[id]/route.ts   # PATCH
│   │       └── engine/
│   │           ├── dashboard/route.ts  # GET/POST
│   │           ├── dispatch/route.ts   # GET/POST
│   │           ├── exceptions/route.ts # GET/POST
│   │           ├── exceptions/[id]/route.ts # GET/PATCH
│   │           ├── finance/route.ts    # GET/POST
│   │           ├── orders/[id]/route.ts # GET/PATCH
│   │           ├── refunds/route.ts    # GET/POST
│   │           ├── settings/route.ts   # GET/POST
│   │           └── storefronts/[id]/route.ts # GET/PATCH
│   ├── components/
│   │   └── DashboardLayout.tsx     # Sidebar nav + top bar
│   └── lib/
│       └── engine.ts               # Engine + ops actor context + role check
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
└── package.json
```

### `apps/driver-app` — Driver PWA (port 3003)

```
apps/driver-app/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root: AuthProvider + PWA meta
│   │   ├── page.tsx                # Dashboard (server → client)
│   │   ├── loading.tsx
│   │   ├── error.tsx
│   │   ├── auth/login/page.tsx     # Driver login
│   │   ├── delivery/
│   │   │   └── [id]/
│   │   │       ├── page.tsx        # Delivery detail (server)
│   │   │       └── components/
│   │   │           └── DeliveryDetail.tsx  # Status + nav + completion
│   │   ├── earnings/
│   │   │   ├── page.tsx
│   │   │   └── components/EarningsView.tsx
│   │   ├── history/
│   │   │   ├── page.tsx
│   │   │   └── components/HistoryView.tsx
│   │   ├── profile/
│   │   │   ├── page.tsx
│   │   │   └── components/ProfileView.tsx
│   │   ├── components/
│   │   │   └── DriverDashboard.tsx # Online toggle + active delivery
│   │   └── api/
│   │       ├── auth/login/route.ts     # POST (driver-specific)
│   │       ├── auth/logout/route.ts    # POST
│   │       ├── deliveries/route.ts     # GET (active)
│   │       ├── deliveries/[id]/route.ts # GET/PATCH (status + offers)
│   │       ├── driver/route.ts         # GET/PATCH (profile)
│   │       ├── driver/presence/route.ts # GET/PATCH (online/offline)
│   │       ├── location/route.ts       # POST (GPS + tracking)
│   │       ├── offers/route.ts         # GET/POST (accept/decline)
│   │       └── earnings/route.ts       # GET (calculations)
│   ├── components/
│   │   └── map/route-map.tsx       # Leaflet route display
│   ├── hooks/
│   │   └── use-location-tracker.ts # Geolocation watch + DB updates
│   └── lib/
│       └── engine.ts               # Engine + driver actor context
├── middleware.ts
├── next.config.js
├── tailwind.config.ts
└── package.json
```

---

## Packages

```
packages/
├── db/                         # Database layer
│   ├── src/
│   │   ├── client/
│   │   │   ├── server.ts       # Server Supabase client (RLS)
│   │   │   ├── browser.ts      # Browser client (singleton)
│   │   │   ├── admin.ts        # Admin client (bypasses RLS)
│   │   │   └── types.ts        # Flexible SupabaseClient type
│   │   ├── repositories/
│   │   │   ├── address.repository.ts    # customer_addresses
│   │   │   ├── cart.repository.ts       # carts, cart_items
│   │   │   ├── chef.repository.ts       # chef_profiles, storefronts
│   │   │   ├── customer.repository.ts   # customers
│   │   │   ├── delivery.repository.ts   # deliveries, tracking
│   │   │   ├── driver.repository.ts     # drivers
│   │   │   ├── driver-presence.repository.ts # driver_presence
│   │   │   ├── finance.repository.ts    # refunds, ledger, payouts
│   │   │   ├── menu.repository.ts       # menu_items, categories
│   │   │   ├── ops.repository.ts        # Read models for ops
│   │   │   ├── order.repository.ts      # orders, order_items
│   │   │   ├── platform.repository.ts   # platform_settings
│   │   │   ├── promo.repository.ts      # promo_codes
│   │   │   ├── storefront.repository.ts # chef_storefronts
│   │   │   └── support.repository.ts    # support_tickets
│   │   ├── generated/
│   │   │   └── database.types.ts    # Auto-generated types
│   │   └── index.ts
│   └── package.json
│
├── engine/                     # Business logic orchestration
│   ├── src/
│   │   ├── core/
│   │   │   ├── engine.factory.ts    # createCentralEngine()
│   │   │   ├── event-emitter.ts     # DomainEventEmitter
│   │   │   ├── audit-logger.ts      # AuditLogger
│   │   │   └── sla-manager.ts       # SLAManager
│   │   ├── orchestrators/
│   │   │   ├── order.orchestrator.ts    # Order lifecycle
│   │   │   ├── commerce.engine.ts       # Refunds, ledger, payouts
│   │   │   ├── dispatch.engine.ts       # Delivery assignment
│   │   │   ├── kitchen.engine.ts        # Kitchen queue, prep
│   │   │   ├── ops.engine.ts            # Ops control + read models
│   │   │   ├── platform.engine.ts       # Cross-engine workflows
│   │   │   └── support.engine.ts        # Exceptions + SLA
│   │   ├── services/                # Legacy wrappers
│   │   │   ├── orders.service.ts
│   │   │   ├── chefs.service.ts
│   │   │   ├── customers.service.ts
│   │   │   ├── dispatch.service.ts
│   │   │   ├── permissions.service.ts
│   │   │   └── storage.service.ts
│   │   ├── constants.ts             # Fees, statuses, transitions
│   │   └── index.ts
│   ├── __tests__/                   # Test files
│   └── package.json
│
├── types/                      # TypeScript type definitions
│   ├── src/
│   │   ├── domains/
│   │   │   ├── chef.ts, customer.ts, order.ts
│   │   │   ├── driver.ts, delivery.ts, platform.ts
│   │   │   └── enums.ts
│   │   ├── engine/
│   │   │   ├── index.ts             # ActorRole, OperationResult, etc.
│   │   │   └── transitions.ts       # State machine validation
│   │   └── index.ts
│   └── package.json
│
├── validation/                 # Zod schemas
│   ├── src/
│   │   ├── schemas/
│   │   │   ├── auth.ts, chef.ts, common.ts
│   │   │   ├── customer.ts, driver.ts
│   │   │   ├── ops.ts, order.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   └── package.json
│
├── auth/                       # Authentication
│   ├── src/
│   │   ├── components/auth-provider.tsx
│   │   ├── hooks/use-auth.ts, use-user.ts
│   │   ├── utils/roles.ts, session.ts
│   │   ├── server/index.ts
│   │   └── index.ts
│   └── package.json
│
├── ui/                         # Shared UI components
│   ├── src/
│   │   ├── components/
│   │   │   ├── button.tsx, card.tsx, input.tsx
│   │   │   ├── badge.tsx, spinner.tsx, avatar.tsx
│   │   │   ├── modal.tsx, empty-state.tsx, error-state.tsx
│   │   │   └── index.ts
│   │   ├── utils.ts             # cn() class merging
│   │   └── index.ts
│   └── package.json
│
├── utils/                      # Utility functions
│   ├── src/
│   │   ├── formatting.ts, dates.ts
│   │   ├── errors.ts, helpers.ts
│   │   └── index.ts
│   └── package.json
│
├── notifications/              # Notification templates
│   ├── src/
│   │   ├── templates.ts, types.ts
│   │   └── index.ts
│   └── package.json
│
└── config/                     # Shared configs
    ├── tailwind.config.ts
    ├── tsconfig.json
    └── eslint/
```

---

## Database

```
supabase/
├── config.toml                 # Local dev config (PG 17, ports)
├── migrations/
│   ├── 00001_initial_schema.sql        # 36 core tables
│   ├── 00002_rls_policies.sql          # Initial RLS policies
│   ├── 00003_fix_rls.sql              # Helper functions + refined RLS
│   ├── 00004_additions.sql            # platform_settings, promo_codes, etc.
│   ├── 00005_anon_read_policies.sql   # Dashboard bypass policies
│   ├── 00006_fix_order_items.sql      # Order item schema alignment
│   ├── 00007_central_engine_tables.sql # 11 engine tables
│   ├── 00008_engine_rpc_functions.sql  # 8 RPC functions
│   └── 00009_ops_admin_control_plane.sql # Platform settings expansion
└── seeds/
    └── seed.sql                # 8 users, 3 chefs, 2 customers, 2 drivers
```

---

## Documentation

```
docs/
├── PLATFORM_OVERVIEW.md        # 56-page platform overview
├── ORDER_FLOW.md               # Order lifecycle documentation
├── DATABASE_SCHEMA.md          # 36-table schema reference
├── APP_CONNECTIONS.md          # Inter-app communication
├── SYSTEM_ARCHITECTURE.md
├── PRODUCT_DEFINITION.md
├── ROLE_MATRIX.md
└── ... (additional docs)
```
