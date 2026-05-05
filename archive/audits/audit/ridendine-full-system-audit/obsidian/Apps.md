# Apps

All 4 Next.js applications in the Ridendine monorepo.

Related: [[Home]] | [[Pages]] | [[APIs]] | [[Database]] | [[Roles]] | [[Integrations]]

---

## apps/web - Customer Marketplace

**URL**: ridendine.ca
**Port**: 3000
**Primary Users**: [[Roles#customer|Customers]]
**Maturity**: ~80%
**Pages**: 22 (see [[Pages#web]])

### What Works
- Browse storefronts and menus
- Cart management
- Stripe checkout with PaymentIntent
- Order history and confirmation
- Auth (login, signup, forgot password)

### What is Missing
- Real-time order tracking on customer side
- Pagination for chef browse
- No push notifications

### Key API Routes
See [[APIs#web]]

### Dependencies
- `@ridendine/db` - Supabase repos
- `@ridendine/ui` - Components
- `@ridendine/auth` - Auth guards
- `@ridendine/engine` - Order/payment orchestration
- `@ridendine/notifications` - Email/SMS templates

---

## apps/chef-admin - Chef Dashboard

**URL**: chef.ridendine.ca
**Port**: 3001
**Primary Users**: [[Roles#chef|Chefs]]
**Maturity**: ~75%
**Pages**: 11 (see [[Pages#chef-admin]])

### What Works
- Order management (accept, reject, prepare, mark ready)
- Menu CRUD (categories, items, options)
- Storefront setup and settings
- Payout history view
- Analytics dashboard (partial)

### What is Missing
- Real-time order push (chef must refresh to see new orders)
- Analytics charts incomplete
- No live order queue notifications

### Key API Routes
See [[APIs#chef-admin]]

### Dependencies
- `@ridendine/db`
- `@ridendine/ui`
- `@ridendine/auth`
- `@ridendine/engine`
- `@ridendine/validation`

---

## apps/ops-admin - Operations Admin

**URL**: ops.ridendine.ca
**Port**: 3002
**Primary Users**: [[Roles#ops-admin|Ops Admins]]
**Maturity**: ~60-70%
**Pages**: 18 (see [[Pages#ops-admin]])

### What Works
- Dashboard order queue
- Chef governance (approve, reject, suspend)
- Driver governance
- Refund processing via real Stripe API
- Support ticket management

### What is Missing
- Live map is a placeholder
- No conflict resolution tooling
- No pagination on order/customer lists
- Missing real-time driver location streaming

### Key API Routes
See [[APIs#ops-admin]]

### Risks
- [[Risks#bypass-auth|BYPASS_AUTH]] leaves this app exposed in preview environments

### Dependencies
- `@ridendine/db`
- `@ridendine/ui`
- `@ridendine/auth`
- `@ridendine/engine`

---

## apps/driver-app - Driver PWA

**URL**: driver.ridendine.ca
**Port**: 3003
**Primary Users**: [[Roles#driver|Drivers]]
**Maturity**: ~70%
**Pages**: 5 (see [[Pages#driver-app]])

### What Works
- Offer accept/decline flow
- Location tracking (GPS updates to `driver_locations`)
- Delivery status progression (pickup → deliver)
- Earnings view

### What is Missing
- No push notifications for new delivery offers
- History page is a placeholder
- No offline PWA caching

### Key API Routes
See [[APIs#driver-app]]

### Dependencies
- `@ridendine/db`
- `@ridendine/ui`
- `@ridendine/auth`
- `@ridendine/engine`

---

## Shared Packages

| Package | Purpose | Used By |
|---------|---------|---------|
| `@ridendine/db` | Supabase clients + 22 repos | All 4 apps |
| `@ridendine/ui` | React components | All 4 apps |
| `@ridendine/auth` | Auth middleware + utilities | All 4 apps |
| `@ridendine/types` | TypeScript types | All 4 apps |
| `@ridendine/validation` | Zod schemas | web, chef, ops |
| `@ridendine/utils` | Utility functions | All 4 apps |
| `@ridendine/config` | TS/Tailwind/ESLint configs | All 4 apps |
| `@ridendine/notifications` | Email/SMS templates | web |
| `@ridendine/engine` | 7 business orchestrators | All 4 apps |

See [[Merge-Plan]] for proposed consolidation of duplicated patterns across apps.
