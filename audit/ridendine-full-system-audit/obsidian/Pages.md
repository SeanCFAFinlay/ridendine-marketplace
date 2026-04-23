# Pages

All 56 pages across the 4 Ridendine applications.

Related: [[Home]] | [[Apps]] | [[APIs]] | [[Roles]]

---

## web - Customer Marketplace (22 Pages)

### Public Pages

| Route | Status | Role | Notes |
|-------|--------|------|-------|
| `/` | Working | [[Roles#customer\|All]] | Home hero, CTA to browse |
| `/chefs` | Working | All | Browse storefronts, filter by cuisine |
| `/chefs/[slug]` | Working | All | Chef menu, add to cart |
| `/cart` | Working | Customer | Cart review, quantities |
| `/checkout` | Working | Customer | Address, Stripe payment |
| `/how-it-works` | Working | All | Marketing page |
| `/about` | Working | All | Marketing page |
| `/contact` | Working | All | Contact form |
| `/privacy` | Working | All | Legal page |
| `/terms` | Working | All | Legal page |
| `/chef-signup` | Working | All | CTA to chef onboarding |
| `/chef-resources` | Working | All | Marketing page |
| `/order-confirmation/[id]` | Working | Customer | Post-checkout confirmation |

### Account Pages (Protected)

| Route | Status | Role | Notes |
|-------|--------|------|-------|
| `/account` | Working | Customer | Account dashboard |
| `/account/orders` | Working | Customer | Order history list |
| `/account/addresses` | Working | Customer | Saved addresses CRUD |
| `/account/favorites` | Working | Customer | Favorited chefs |
| `/account/settings` | Working | Customer | Profile settings |

### Auth Pages

| Route | Status | Role | Notes |
|-------|--------|------|-------|
| `/auth/login` | Working | Customer | Supabase email login |
| `/auth/signup` | Working | Customer | Email registration |
| `/auth/forgot-password` | Working | Customer | Password reset email |

### Order Pages

| Route | Status | Role | Notes |
|-------|--------|------|-------|
| `/orders/[id]/confirmation` | Working | Customer | Detailed order confirmation |

---

## chef-admin - Chef Dashboard (11 Pages)

| Route | Status | Role | Notes |
|-------|--------|------|-------|
| `/auth/login` | Working | [[Roles#chef\|Chef]] | Chef-specific auth |
| `/auth/signup` | Working | Chef | Chef onboarding start |
| `/` | Working | Chef | Redirects to /dashboard |
| `/dashboard` | Working | Chef | Overview stats, recent orders |
| `/dashboard/orders` | Partial | Chef | Order queue, no real-time push |
| `/dashboard/menu` | Working | Chef | Menu categories + items CRUD |
| `/dashboard/storefront` | Working | Chef | Storefront settings, hours, zones |
| `/dashboard/analytics` | Partial | Chef | Charts incomplete |
| `/dashboard/reviews` | Working | Chef | Customer review list |
| `/dashboard/payouts` | Working | Chef | Payout history |
| `/dashboard/settings` | Working | Chef | Account settings |

---

## ops-admin - Operations Admin (18 Pages)

| Route | Status | Role | Notes |
|-------|--------|------|-------|
| `/auth/login` | Working | [[Roles#ops-admin\|Ops]] | Ops auth |
| `/` | Working | Ops | Redirects to /dashboard |
| `/dashboard` | Working | Ops | KPI overview |
| `/dashboard/orders` | Working | Ops | All orders list |
| `/dashboard/orders/[id]` | Working | Ops | Order detail + refund |
| `/dashboard/chefs` | Working | Ops | Chef list |
| `/dashboard/chefs/[id]` | Working | Ops | Chef profile detail |
| `/dashboard/chefs/approvals` | Working | Ops | Chef approval queue |
| `/dashboard/customers` | Working | Ops | Customer list |
| `/dashboard/customers/[id]` | Working | Ops | Customer detail |
| `/dashboard/drivers` | Working | Ops | Driver list |
| `/dashboard/drivers/[id]` | Working | Ops | Driver detail + approval |
| `/dashboard/deliveries` | Working | Ops | Delivery list |
| `/dashboard/deliveries/[id]` | Working | Ops | Delivery detail + assign driver |
| `/dashboard/analytics` | Partial | Ops | Platform analytics |
| `/dashboard/map` | Placeholder | Ops | Live map - not implemented |
| `/dashboard/support` | Working | Ops | Support ticket queue |
| `/dashboard/settings` | Working | Ops | Platform settings |

---

## driver-app - Driver PWA (5 Pages)

| Route | Status | Role | Notes |
|-------|--------|------|-------|
| `/` | Working | [[Roles#driver\|Driver]] | Active jobs / offer queue |
| `/earnings` | Working | Driver | Earnings summary |
| `/history` | Placeholder | Driver | Delivery history - not implemented |
| `/profile` | Working | Driver | Driver profile |
| `/delivery/[id]` | Working | Driver | Delivery detail, status buttons |

---

## Page Status Summary

| Status | Count |
|--------|-------|
| Working | 47 |
| Partial | 4 |
| Placeholder | 2 |
| Not Built | 3 |

See [[APIs]] for corresponding API routes. See [[Risks]] for missing pages that block production readiness.
