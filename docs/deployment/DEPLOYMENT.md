# Ridendine Deployment Guide

## Prerequisites

- Node.js >= 20
- pnpm >= 9
- Supabase project (cloud or local)
- Vercel account (for production)

## Local Development

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Environment Setup

```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Database Setup

```bash
# Using Supabase CLI
supabase db push        # Apply migrations
supabase db seed        # Load seed data

# Or generate types after schema changes
pnpm db:generate
```

### 4. Run Development Servers

```bash
# All apps
pnpm dev

# Or individual apps
pnpm dev:web      # localhost:3000
pnpm dev:chef     # localhost:3001
pnpm dev:ops      # localhost:3002
pnpm dev:driver   # localhost:3003
```

## Production Deployment

### Vercel Setup

Each app is deployed as a separate Vercel project:

#### apps/web (Customer Marketplace)
```bash
# Root Directory: apps/web
# Build Command: pnpm build
# Output Directory: .next
```

#### apps/chef-admin (Chef Dashboard)
```bash
# Root Directory: apps/chef-admin
# Build Command: pnpm build
# Output Directory: .next
```

#### apps/ops-admin (Operations)
```bash
# Root Directory: apps/ops-admin
# Build Command: pnpm build
# Output Directory: .next
```

#### apps/driver-app (Driver PWA)
```bash
# Root Directory: apps/driver-app
# Build Command: pnpm build
# Output Directory: .next
```

### Environment Variables

Set these in each Vercel project:

| Variable | Description | Required |
|----------|-------------|----------|
| NEXT_PUBLIC_SUPABASE_URL | Supabase project URL | Yes |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | Supabase anon key | Yes |
| SUPABASE_SERVICE_ROLE_KEY | Supabase service key | Yes (server) |

### Domain Configuration

| App | Suggested Domain |
|-----|-----------------|
| web | ridendine.com |
| chef-admin | chef.ridendine.com |
| ops-admin | ops.ridendine.com |
| driver-app | driver.ridendine.com |

## Supabase Configuration

### Authentication

1. Enable email/password auth
2. Configure OAuth providers (optional)
3. Set up email templates

### Storage Buckets

Create buckets for:
- `avatars` - Profile images
- `menu-images` - Menu item photos
- `documents` - Chef/driver documents
- `delivery-photos` - Pickup/dropoff photos

### Edge Functions (Optional)

For background jobs:
- Order notification dispatch
- Driver matching algorithm
- Payout calculations

## CI/CD Pipeline

### Recommended GitHub Actions

```yaml
name: CI
on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - run: pnpm install
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm build
```

## Monitoring

### Recommended Tools

- **Vercel Analytics** - Web vitals
- **Sentry** - Error tracking
- **Supabase Dashboard** - Database metrics

## Scaling Considerations

1. **Database** - Enable connection pooling
2. **Images** - Use Supabase storage CDN
3. **Real-time** - Monitor Supabase realtime connections
4. **API Routes** - Consider edge functions for latency-sensitive endpoints
