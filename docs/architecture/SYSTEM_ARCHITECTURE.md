# Ridendine System Architecture

## Architecture Overview

Ridendine is built as a **pnpm/Turborepo monorepo** with four applications sharing common packages, all backed by Supabase.

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATIONS                              │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│   apps/web    │ apps/chef-    │ apps/ops-     │ apps/driver-    │
│  (Customer)   │    admin      │    admin      │     app         │
│   Next.js     │   Next.js     │   Next.js     │   Next.js/PWA   │
└───────┬───────┴───────┬───────┴───────┬───────┴────────┬────────┘
        │               │               │                │
        └───────────────┴───────┬───────┴────────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────┐
│                      SHARED PACKAGES                             │
├─────────┬─────────┬─────────┬─────────┬─────────┬───────────────┤
│   db    │   ui    │  auth   │ config  │  types  │    utils      │
├─────────┼─────────┼─────────┼─────────┼─────────┼───────────────┤
│validation│notifications│     │         │         │               │
└─────────┴─────────┴─────────┴─────────┴─────────┴───────────────┘
                                │
┌───────────────────────────────┴─────────────────────────────────┐
│                         SUPABASE                                 │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   PostgreSQL    │      Auth       │        Storage              │
│   + RLS         │   + Providers   │        + CDN                │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

## Application Boundaries

### apps/web (Customer Marketplace)
- **Port**: 3000
- **Audience**: General public, customers
- **Auth**: Optional for browsing, required for ordering
- **Key Features**: Discovery, search, cart, checkout, orders, reviews

### apps/chef-admin (Chef Dashboard)
- **Port**: 3001
- **Audience**: Registered and approved chefs
- **Auth**: Required, chef role verified
- **Key Features**: Storefront management, menu CRUD, order fulfillment

### apps/ops-admin (Operations Dashboard)
- **Port**: 3002
- **Audience**: Internal operations team
- **Auth**: Required, ops_admin role verified
- **Key Features**: Chef approvals, order oversight, support, compliance

### apps/driver-app (Driver Application)
- **Port**: 3003
- **Audience**: Verified drivers
- **Auth**: Required, driver role verified
- **Key Features**: Delivery workflow, earnings, availability

## Package Responsibilities

### packages/db
- Supabase client initialization (browser, server, admin)
- Generated TypeScript types from database schema
- Repository functions for all domains
- Query builders and utilities
- **No direct database access outside this package**

### packages/ui
- Shared React components (buttons, inputs, cards, modals)
- Design tokens and theme configuration
- Layout components
- **Presentational only, no business logic**

### packages/auth
- Authentication utilities and hooks
- Session management
- Role verification helpers
- Protected route utilities

### packages/config
- Shared configuration (ESLint, TypeScript, Tailwind)
- Environment variable schemas
- Feature flags

### packages/validation
- Zod schemas for all domain entities
- Form validation helpers
- API request/response validation

### packages/types
- Shared TypeScript types and interfaces
- API contract types
- Enum definitions

### packages/utils
- Common utility functions
- Date/time helpers
- Formatting utilities
- Error handling utilities

### packages/notifications
- Notification templates
- Push notification utilities
- Email notification utilities (placeholders)

## Data Flow

### Customer Places Order
```
1. apps/web → packages/db.createOrder()
2. packages/db → Supabase INSERT orders, order_items
3. Supabase trigger → creates delivery record
4. Real-time subscription → notifies chef-admin
5. apps/chef-admin receives new order
```

### Chef Accepts Order
```
1. apps/chef-admin → packages/db.updateOrderStatus('accepted')
2. packages/db → Supabase UPDATE orders
3. packages/db → INSERT order_status_history
4. Real-time subscription → updates customer
```

### Driver Assigned
```
1. System/ops → packages/db.assignDelivery(driverId)
2. packages/db → UPDATE deliveries
3. Real-time subscription → notifies driver-app
4. apps/driver-app receives offer
```

## Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Browser    │────▶│   Supabase   │────▶│   Database   │
│              │◀────│     Auth     │◀────│   (roles)    │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │    JWT Token       │
       │◀───────────────────┘
       │
       ▼
┌──────────────┐
│  packages/   │
│    auth      │──── Role verification
└──────────────┘     Route protection
```

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│              Vercel                      │
├───────────┬───────────┬────────┬────────┤
│ web       │ chef-     │ ops-   │ driver │
│ (prod)    │ admin     │ admin  │ app    │
│           │ (prod)    │ (prod) │ (prod) │
└─────┬─────┴─────┬─────┴────┬───┴────┬───┘
      │           │          │        │
      └───────────┴────┬─────┴────────┘
                       │
              ┌────────┴────────┐
              │    Supabase     │
              │   (Production)  │
              └─────────────────┘
```

## Key Design Decisions

1. **Monorepo**: Single source of truth, atomic changes, shared tooling
2. **pnpm**: Fast, disk-efficient, strict dependency management
3. **Turborepo**: Efficient builds with caching and parallelization
4. **Next.js**: SSR, API routes, app router for all surfaces
5. **Supabase**: Managed Postgres, auth, real-time, storage in one
6. **RLS**: Security at the database level, not just application
7. **TypeScript**: End-to-end type safety
8. **Zod**: Runtime validation matching TypeScript types

## Security Model

- Row Level Security (RLS) on all tables
- JWT-based authentication via Supabase
- Role-based access control
- API routes validate ownership before mutations
- No direct database URLs exposed to clients
- Environment variables for all secrets
