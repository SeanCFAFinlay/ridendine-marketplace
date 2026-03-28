# CLAUDE.md - Ridendine Development Context

## Project Overview

Ridendine is a **chef-first food delivery marketplace** connecting home chefs with customers. Built as a pnpm/Turborepo monorepo with four Next.js applications backed by Supabase.

## Architecture

### Apps
- `apps/web` (port 3000) - Customer marketplace
- `apps/chef-admin` (port 3001) - Chef dashboard
- `apps/ops-admin` (port 3002) - Operations admin
- `apps/driver-app` (port 3003) - Driver PWA

### Packages
- `@ridendine/db` - Supabase clients and repositories
- `@ridendine/ui` - Shared React components
- `@ridendine/auth` - Authentication utilities
- `@ridendine/types` - TypeScript types
- `@ridendine/validation` - Zod schemas
- `@ridendine/utils` - Utility functions
- `@ridendine/config` - Shared configs (TS, Tailwind, ESLint)
- `@ridendine/notifications` - Notification templates

## Key Design Decisions

1. **Chef-first** - `chef_storefronts` is the primary listing entity
2. **No parallel models** - Single canonical schema for all domains
3. **Package boundary** - All DB access through `@ridendine/db`
4. **Type safety** - End-to-end TypeScript with Zod validation

## Commands

```bash
pnpm install          # Install all dependencies
pnpm dev              # Run all apps
pnpm dev:web          # Run customer app
pnpm build            # Build all apps
pnpm lint             # Lint all packages
pnpm typecheck        # Type check all packages
pnpm db:generate      # Generate Supabase types
```

## Database

- PostgreSQL via Supabase
- Row Level Security enabled
- Migrations in `supabase/migrations/`
- Seeds in `supabase/seeds/`

## Order Flow

1. Customer browses → adds to cart → checkout
2. Order created (pending)
3. Chef accepts → prepares → marks ready
4. Delivery created → driver assigned
5. Driver picks up → delivers
6. Customer reviews

## File Conventions

- Components: `src/components/[domain]/[component].tsx`
- Pages: `src/app/[route]/page.tsx` (App Router)
- API: `src/app/api/[route]/route.ts`
- Repositories: `packages/db/src/repositories/[domain].repository.ts`

## Documentation

For detailed platform information, see:
- `docs/PLATFORM_OVERVIEW.md` - All 56 pages across 4 apps
- `docs/ORDER_FLOW.md` - Order lifecycle and status workflow
- `docs/DATABASE_SCHEMA.md` - All 36 Supabase tables
- `docs/APP_CONNECTIONS.md` - How apps connect and communicate
