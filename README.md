# Ridendine

A chef-first food delivery marketplace connecting home chefs with customers seeking authentic, home-cooked meals.

## Architecture

Ridendine is built as a monorepo with four applications:

| App | Description | Port |
|-----|-------------|------|
| `apps/web` | Customer marketplace | 3000 |
| `apps/chef-admin` | Chef dashboard | 3001 |
| `apps/ops-admin` | Operations admin | 3002 |
| `apps/driver-app` | Driver application | 3003 |

## Tech Stack

- **Monorepo**: pnpm + Turborepo
- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS
- **Validation**: Zod
- **Language**: TypeScript

## Getting Started

### Prerequisites

- Node.js >= 20
- pnpm >= 9
- Supabase CLI (optional, for local development)

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Fill in your Supabase credentials

# Run all apps in development
pnpm dev

# Or run specific apps
pnpm dev:web      # Customer marketplace
pnpm dev:chef     # Chef admin
pnpm dev:ops      # Ops admin
pnpm dev:driver   # Driver app
```

### Database Setup

```bash
# Push migrations to Supabase
pnpm db:migrate

# Seed development data
pnpm db:seed

# Reset database (caution: destroys data)
pnpm db:reset

# Generate TypeScript types
pnpm db:generate
```

## Project Structure

```
├── apps/
│   ├── web/              # Customer marketplace
│   ├── chef-admin/       # Chef dashboard
│   ├── ops-admin/        # Operations admin
│   └── driver-app/       # Driver application
├── packages/
│   ├── db/               # Database access layer
│   ├── ui/               # Shared UI components
│   ├── auth/             # Authentication utilities
│   ├── config/           # Shared configuration
│   ├── validation/       # Zod schemas
│   ├── types/            # Shared TypeScript types
│   ├── utils/            # Common utilities
│   └── notifications/    # Notification system
├── supabase/
│   ├── migrations/       # Database migrations
│   ├── seeds/            # Seed data
│   └── policies/         # RLS policies
└── docs/
    ├── architecture/     # Architecture documentation
    ├── schema/           # Database schema docs
    └── deployment/       # Deployment guides
```

## Development

```bash
# Run linting
pnpm lint

# Run type checking
pnpm typecheck

# Build all apps
pnpm build

# Format code
pnpm format
```

## Deployment

All apps are configured for Vercel deployment. Each app can be deployed independently:

1. Connect repository to Vercel
2. Configure app-specific root directory
3. Set environment variables
4. Deploy

## License

Proprietary - All rights reserved
