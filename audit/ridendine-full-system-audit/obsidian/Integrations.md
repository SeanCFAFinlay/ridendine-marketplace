# Integrations

All external service integrations in the Ridendine platform.

Related: [[Home]] | [[APIs]] | [[Database]] | [[Apps]] | [[Risks]]

---

## Supabase

**Role**: Primary backend (DB + Auth + Storage + Real-time)
**Plan**: Production Supabase project (single instance)
**Used by**: All 4 apps via `@ridendine/db`

### Services Used

#### PostgreSQL Database
- 36+ tables across 7 domains
- Row Level Security (RLS) on all user-facing tables
- 10 migration files in `supabase/migrations/`
- Seeds in `supabase/seeds/`
- See [[Database]] for full table list

#### Supabase Auth
- Email/password authentication
- JWT tokens with role claims
- Auth middleware in `@ridendine/auth`
- Supabase session management

#### Supabase Storage
- Chef profile images
- Menu item photos
- Driver document uploads
- Delivery confirmation photos
- Bucket: `chef-images`, `menu-images`, `driver-docs`, `delivery-photos`

#### Supabase Real-time
- WebSocket subscriptions to table changes
- Used for:
  - Web: order status changes (customer tracking)
  - Chef Admin: new orders (NOTE: real-time push incomplete - see [[Risks#realtime-missing]])
  - Ops Admin: all orders, all deliveries, driver locations
  - Driver App: new delivery assignments

### Connection Pattern
```typescript
// @ridendine/db exports:
createSupabaseClient()        // Browser client (anon key)
createSupabaseServerClient()  // Server client (service key)
```

### Risks
- See [[Risks#bypass-auth]] - Dev bypass skips Supabase auth checks
- See [[Risks#schema-drift]] - Migration state may drift from code assumptions

---

## Stripe

**Role**: Payment processing and payouts
**SDK**: `stripe` npm package (server-side only)
**Used by**: `@ridendine/engine`, `apps/web`, `apps/ops-admin`, `apps/chef-admin`

### Services Used

#### PaymentIntents
- Created at checkout in web app
- Intent ID stored on `orders.stripe_payment_intent_id`
- Customer pays via Stripe Elements on checkout page
- Captures automatically on confirmation

#### Webhooks
- Endpoint: `POST /api/stripe/webhook` (web app)
- Events handled:
  - `payment_intent.succeeded` - Marks order payment as paid
  - `payment_intent.payment_failed` - Marks order as failed
- Signature verified with `STRIPE_WEBHOOK_SECRET`
- Production-grade implementation

#### Refunds
- Initiated from ops-admin
- `POST /api/refund` calls Stripe Refunds API
- References `payment_intent_id` from order
- Real Stripe refunds (not mock)

#### Connect Accounts (Planned)
- Chef payout accounts stored in `chef_payout_accounts`
- `stripe_account_id` field exists but payout disbursement not yet wired
- `payout_runs` table exists for batch processing

### Environment Variables Required
```
STRIPE_SECRET_KEY=sk_...
STRIPE_PUBLISHABLE_KEY=pk_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Vercel

**Role**: Deployment platform
**Configuration**: 4 separate Vercel projects, one per app
**Build**: Turborepo-aware builds

### Deployment Setup
| App | Domain | Project |
|-----|--------|---------|
| web | ridendine.ca | vercel-web |
| chef-admin | chef.ridendine.ca | vercel-chef |
| ops-admin | ops.ridendine.ca | vercel-ops |
| driver-app | driver.ridendine.ca | vercel-driver |

### Environment Variables Per Project
Each Vercel project needs:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_KEY`
- `STRIPE_SECRET_KEY` (where applicable)
- `STRIPE_WEBHOOK_SECRET` (web only)

### Risk
- 4 separate deployment pipelines increase CI/CD complexity
- See [[Merge-Plan]] for consolidation option

---

## Email / SMS Notifications

**Role**: Transactional notifications
**Package**: `@ridendine/notifications`
**Current State**: Template structure exists, delivery provider not confirmed

### Notification Templates
- Order confirmation email (customer)
- Order accepted notification (customer)
- Order ready notification (customer)
- Chef new order alert (chef)
- Driver delivery offer (driver)
- Password reset email

### Missing
- No confirmed email provider (Resend, SendGrid, Postmark)
- SMS notifications not implemented
- Push notifications not implemented (driver app critical gap)

See [[Risks#notification-gaps]] for impact.

---

## pnpm / Turborepo

**Role**: Monorepo toolchain
**pnpm**: 9.15.0
**Turborepo**: 2.3.0

### Build Pipeline
```json
{
  "build": { "dependsOn": ["^build"] },
  "typecheck": { "dependsOn": ["^typecheck"] },
  "lint": {}
}
```

### Workspace Structure
```
apps/
  web/
  chef-admin/
  ops-admin/
  driver-app/
packages/
  db/
  ui/
  auth/
  types/
  validation/
  utils/
  config/
  notifications/
  engine/
```

---

## TypeScript

**Version**: 5.6
**Config**: `@ridendine/config` exports shared `tsconfig.base.json`
**Type generation**: `pnpm db:generate` runs Supabase type generation

### Generated Types
- `packages/types/src/database.types.ts` - Auto-generated from Supabase schema
- App types extend from generated types

---

## Integration Health Summary

| Integration | Status | Risk Level |
|-------------|--------|------------|
| Supabase DB | Healthy | Low |
| Supabase Auth | Healthy (with bypass risk) | High |
| Supabase Real-time | Partial (chef app missing) | Medium |
| Stripe Payments | Healthy | Low |
| Stripe Webhooks | Healthy | Low |
| Stripe Refunds | Healthy | Low |
| Stripe Connect Payouts | Not wired | Medium |
| Vercel Deployment | Healthy | Low |
| Email Notifications | Template only, no provider | High |
| SMS/Push Notifications | Not implemented | High |
