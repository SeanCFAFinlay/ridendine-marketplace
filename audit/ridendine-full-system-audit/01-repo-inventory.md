# 01 - Repository Inventory

**Audit Date**: 2026-04-23
**Scope**: Complete file-system inventory of the monorepo root, all apps, all packages, supabase directory, and docs

---

## Repository Metadata

| Field | Value |
|-------|-------|
| Package Manager | pnpm 9.15.0 |
| Build Orchestrator | Turborepo 2.3.0 |
| Node Requirement | >=20.0.0 |
| TypeScript Version | ^5.6.0 |
| Next.js Version | ^14.2.0 |
| React Version | ^18.3.0 |
| Git Branch (audited) | master |
| CI/CD | None (Vercel Git integration only) |
| Docker | Not present |
| Deployment | Vercel (4 separate projects, 1 Supabase instance) |

---

## Root Level Files

| File | Purpose | Notes |
|------|---------|-------|
| `package.json` | Monorepo root manifest. Defines shared scripts: `dev`, `build`, `lint`, `typecheck`, `db:generate`, `db:migrate`, `db:seed`, `db:reset`, `format` | No test script at root level |
| `turbo.json` | Turborepo pipeline config. Defines `build` (with `dependsOn: ["^build"]`), `dev`, `lint`, `typecheck` tasks. Lists required env vars for build | All 4 apps inherit this pipeline |
| `pnpm-workspace.yaml` | Declares workspace globs: `apps/*` and `packages/*` | Standard monorepo config |
| `pnpm-lock.yaml` | Lockfile for reproducible installs | ~8000 lines |
| `.env` | Local env file (gitignored) | Contains real keys - not audited |
| `.env.example` | Template showing required env vars | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_APP_URL`, `BYPASS_AUTH` |
| `.env.local` | Local override env (gitignored) | |
| `.env.vercel` | Vercel-specific env template | |
| `.prettierrc` | Prettier formatting config | |
| `.gitignore` | Standard Next.js gitignore | Includes `node_modules`, `.next`, `.env`, `.env.local` |
| `CLAUDE.md` | AI assistant project context | Architecture summary for Claude |
| `README.md` | Project readme | Basic setup instructions |
| `NEXT_STEPS.md` | Development TODO tracking | Active planning doc |
| `PROGRESS_LOG.md` | Development history log | Session-by-session changes |
| `REPO_AUDIT_FIX_LOG.md` | Log of audit findings and fixes | Tracks prior remediation |
| `ALL_APPS_ROUTE_LOAD_AUDIT.md` | Prior route load audit | Documents which routes load successfully |
| `ADMIN_COMMAND_CENTER_PLAN.md` | Feature planning doc | Ops-admin command center plan |
| `TEST_CREDENTIALS.md` | Test user credentials | Local dev seeded users |
| `turbo.json` | Turborepo config | (see above) |

---

## Apps Directory

All apps under `apps/` follow the Next.js 14 App Router convention.

### `apps/web` (Customer Marketplace - Port 3000)
```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── (auth routes)       # /auth/login, /auth/signup, /auth/forgot-password
│   │   ├── (page routes)       # /, /chefs, /chefs/[slug], /cart, /checkout, ...
│   │   └── api/                # 12 API route handlers
│   ├── components/             # Local React components
│   ├── contexts/               # cart-context.tsx (React Context for cart state)
│   ├── lib/                    # auth-helpers.ts, engine.ts, order-helpers.ts
│   └── middleware.ts           # Auth middleware (has BYPASS_AUTH pattern)
├── __tests__/                  # 4 test files (auth + support)
├── package.json                # @ridendine/web
├── next.config.js
└── tsconfig.json
```

### `apps/chef-admin` (Chef Dashboard - Port 3001)
```
apps/chef-admin/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── auth/               # /auth/login, /auth/signup
│   │   ├── dashboard/          # 8 dashboard pages
│   │   └── api/                # 10 API route handlers
│   ├── components/             # Local React components (layout, menu, orders, storefront, profile, auth)
│   └── lib/                    # engine.ts (chef-specific engine client)
│   └── middleware.ts           # Auth middleware (has BYPASS_AUTH pattern)
├── package.json                # @ridendine/chef-admin
├── next.config.js
└── tsconfig.json
```

### `apps/ops-admin` (Operations Center - Port 3002)
```
apps/ops-admin/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── auth/               # /auth/login
│   │   ├── dashboard/          # 14 dashboard pages (with detail pages and action components)
│   │   └── api/                # 21 API route handlers (split /api/ and /api/engine/)
│   ├── components/             # DashboardLayout, dashboard widgets, map components
│   └── lib/                    # engine.ts (ops-specific engine client)
│   └── middleware.ts           # Auth middleware (has BYPASS_AUTH pattern)
├── package.json                # @ridendine/ops-admin
├── next.config.js
└── tsconfig.json
```

### `apps/driver-app` (Driver PWA - Port 3003)
```
apps/driver-app/
├── src/
│   ├── app/                    # Next.js App Router pages and API routes
│   │   ├── auth/               # /auth/login
│   │   ├── (pages)             # /, /delivery/[id], /earnings, /history, /profile
│   │   ├── components/         # Page-level components (DriverDashboard, DeliveryDetail, etc.)
│   │   └── api/                # 9 API route handlers
│   ├── components/             # Shared components: map/route-map.tsx
│   ├── hooks/                  # use-location-tracker.ts
│   └── lib/                    # engine.ts (driver-specific engine client)
│   └── middleware.ts           # Auth middleware (has BYPASS_AUTH pattern)
├── package.json                # @ridendine/driver-app
├── next.config.js
└── tsconfig.json
```

---

## Packages Directory

All packages under `packages/` are workspace packages consumed via `workspace:*` dependencies.

### `packages/auth`
**Purpose**: Authentication utilities, role helpers, React hooks for auth state
```
src/
├── index.ts
├── server.ts               # Server-side Supabase auth helpers
├── hooks/
│   ├── use-auth.ts         # React hook for auth state
│   └── use-user.ts         # React hook for current user
└── utils/
    ├── roles.ts            # Role validation utilities
    └── session.ts          # Session management helpers
```

### `packages/config`
**Purpose**: Shared configuration files (TypeScript, Tailwind, ESLint)
```
tailwind.config.ts          # Shared Tailwind config (imported by all apps)
eslint.config.js            # Shared ESLint config
tsconfig/                   # Base tsconfig files
```

### `packages/db`
**Purpose**: Supabase client factory, generated database types, all repository implementations
```
src/
├── index.ts
├── client/
│   ├── index.ts
│   ├── admin.ts            # Service role client (server-only)
│   ├── browser.ts          # Browser client
│   ├── server.ts           # SSR server client
│   └── types.ts            # SupabaseClient type alias
├── generated/
│   └── database.types.ts   # Auto-generated from Supabase schema
└── repositories/           # 15 repository files (22 named exports)
    ├── address.repository.ts
    ├── cart.repository.ts
    ├── chef.repository.ts
    ├── customer.repository.ts
    ├── delivery.repository.ts
    ├── driver-presence.repository.ts
    ├── driver.repository.ts
    ├── finance.repository.ts
    ├── index.ts
    ├── menu.repository.ts
    ├── ops.repository.ts
    ├── order.repository.ts
    ├── platform.repository.ts
    ├── promo.repository.ts
    ├── storefront.repository.ts
    └── support.repository.ts
```

### `packages/engine`
**Purpose**: Central business logic. All domain orchestrators, services, core utilities
```
src/
├── index.ts                # Barrel exports for all orchestrators and services
├── constants.ts            # Platform fee rates, tax rates, delivery fee constants
├── core/
│   ├── index.ts
│   ├── audit-logger.ts     # Event audit trail
│   ├── engine.factory.ts   # EngineFactory - creates orchestrator instances
│   ├── event-emitter.ts    # DomainEventEmitter
│   └── sla-manager.ts      # SLA tracking for order prep and delivery
├── orchestrators/
│   ├── order.orchestrator.ts       # Core order lifecycle (create, accept, reject, cancel, pay)
│   ├── kitchen.engine.ts           # Kitchen state machine (prep start, ready)
│   ├── dispatch.engine.ts          # Driver assignment, offer cycle, pickup/deliver
│   ├── commerce.engine.ts          # Refunds, promo codes, financial operations
│   ├── support.engine.ts           # Support ticket lifecycle
│   ├── platform.engine.ts          # Platform settings management
│   ├── ops.engine.ts               # Ops governance (chef approval, driver approval, suspensions)
│   ├── commerce.engine.test.ts     # Tests
│   ├── dispatch.engine.test.ts     # Tests
│   ├── ops.validation.test.ts      # Tests
│   └── platform-settings.test.ts  # Tests
└── services/               # Legacy services (backwards-compat exports)
    ├── chefs.service.ts
    ├── customers.service.ts
    ├── dispatch.service.ts
    ├── orders.service.ts
    ├── permissions.service.ts
    └── storage.service.ts
```

### `packages/notifications`
**Purpose**: Notification templates and type definitions
```
src/
├── index.ts
├── templates.ts            # Email/push notification templates
└── types.ts                # Notification type definitions
```

### `packages/types`
**Purpose**: All shared TypeScript types, domain models, enums, engine types
```
src/
├── index.ts
├── api.ts                  # API response types
├── enums.ts                # All domain enums (OrderStatus, EngineOrderStatus, UserRole, etc.)
├── domains/
│   ├── chef.ts
│   ├── customer.ts
│   ├── delivery.ts
│   ├── driver.ts
│   ├── order.ts
│   └── platform.ts
└── engine/
    ├── index.ts
    └── transitions.ts      # isValidTransition, getAllowedActions state machine helpers
```

### `packages/ui`
**Purpose**: Shared React UI component library
```
src/
├── index.ts                # Barrel exports
├── utils.ts                # cn() utility (clsx + tailwind-merge)
└── components/
    ├── avatar.tsx
    ├── badge.tsx
    ├── button.tsx
    ├── card.tsx
    ├── empty-state.tsx
    ├── error-state.tsx
    ├── input.tsx
    ├── modal.tsx
    └── spinner.tsx
```

### `packages/utils`
**Purpose**: Pure utility functions with no framework dependencies
```
src/
├── index.ts
├── dates.ts                # Date formatting utilities
├── errors.ts               # Error type helpers
├── formatting.ts           # Currency, number formatting
└── helpers.ts              # Miscellaneous helpers
```

### `packages/validation`
**Purpose**: Zod schemas for request validation
```
src/
├── index.ts
└── schemas/
    ├── auth.ts             # Signup/login schemas
    ├── chef.ts             # Chef onboarding schemas
    ├── common.ts           # Shared reusable schemas
    └── customer.ts         # Customer profile schemas
```

---

## Supabase Directory

```
supabase/
├── config.toml             # Supabase local dev config
├── .temp/                  # Supabase CLI temp files
├── migrations/             # 10 SQL migration files
│   ├── 00001_initial_schema.sql        # Core tables: profiles, chef_storefronts, menu_items, orders, etc.
│   ├── 00002_rls_policies.sql          # Row Level Security policies
│   ├── 00003_fix_rls.sql               # RLS fixes/corrections
│   ├── 00004_additions.sql             # Additional tables: reviews, promo_codes, notifications, etc.
│   ├── 00005_anon_read_policies.sql    # Anonymous read access for public browsing
│   ├── 00006_fix_order_items.sql       # Order items table corrections
│   ├── 00007_central_engine_tables.sql # Engine tables: engine_events, sla_records, audit_log, etc.
│   ├── 00008_engine_rpc_functions.sql  # PostgreSQL RPC functions used by engine
│   ├── 00009_ops_admin_control_plane.sql # Ops tables: platform_settings, ops_actions, etc.
│   └── 00010_contract_drift_repair.sql # Schema corrections and alias columns for backwards compat
└── seeds/
    └── (seed file)                     # Test data for local development
```

---

## Documentation Directory

```
docs/
├── PLATFORM_OVERVIEW.md        # All 56 pages across 4 apps
├── ORDER_FLOW.md               # Order lifecycle and status workflow
├── DATABASE_SCHEMA.md          # All 36 Supabase tables (note: actual count is 56 post-migrations)
├── APP_CONNECTIONS.md          # How apps connect and communicate
├── architecture/               # Architecture decision records
├── business-rules/             # Business rule documentation
├── deployment/                 # Deployment guides
├── schema/                     # Schema documentation
└── repo-map-ridendine/         # Obsidian vault (knowledge graph of the codebase)
    ├── .obsidian/              # Obsidian configuration
    ├── Domains/                # Per-domain maps
    ├── 01_Repo-Structure/
    ├── 02_System-Topology/
    ├── 05_Data-Flows/
    ├── 06_Database/
    ├── 09_State-Management/
    ├── 12_Business-Control-Map/
    ├── 13_Gaps-Unknowns/
    └── 14_Future-Enhancement-Inputs/
```

---

## Other Notable Directories

```
.vercel/            # Vercel project config (project IDs per app)
.turbo/             # Turborepo cache
.claude/            # Claude AI assistant config and skills
audit/              # THIS audit directory
    ridendine-full-system-audit/    # Current audit output
graphify-out/       # Graphify knowledge graph output
```

---

## Test File Inventory

| Location | File | Framework | Coverage Area |
|----------|------|-----------|---------------|
| `apps/web/__tests__/auth/` | `auth-layout.test.tsx` | Jest + Testing Library | Auth layout component |
| `apps/web/__tests__/auth/` | `forgot-password.test.tsx` | Jest + Testing Library | Forgot password page |
| `apps/web/__tests__/auth/` | `password-strength.test.tsx` | Jest + Testing Library | Password strength component |
| `apps/web/__tests__/api/support/` | (1 file) | Jest | Support API route |
| `packages/engine/src/orchestrators/` | `commerce.engine.test.ts` | Jest | Commerce engine (refunds, promos) |
| `packages/engine/src/orchestrators/` | `dispatch.engine.test.ts` | Jest | Dispatch engine (assignment, offers) |
| `packages/engine/src/orchestrators/` | `ops.validation.test.ts` | Jest | Ops validation logic |
| `packages/engine/src/orchestrators/` | `platform-settings.test.ts` | Jest | Platform settings engine |

**Total**: 7 test files. Zero test files for `apps/chef-admin`, `apps/ops-admin`, `apps/driver-app`, or any repository in `packages/db`.

---

## Missing Infrastructure

| Item | Status | Impact |
|------|--------|--------|
| CI/CD pipeline (GitHub Actions, etc.) | Not present | No automated testing on PR/merge |
| Dockerfile / docker-compose | Not present | Local dev requires Supabase CLI only |
| E2E test suite (Playwright/Cypress) | Not present | No automated user flow testing |
| Monitoring/alerting config | Not present | No error tracking (Sentry, etc.) configured |
| Staging environment config | Not present | Preview = production-adjacent with bypass |
