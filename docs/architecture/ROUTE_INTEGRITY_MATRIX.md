# Route Integrity Matrix

Last updated: 2026-04-03

Status labels:

- `working`: file exists, correct app ownership, correct shell/auth model, and current data/action targets are consistent with the repaired architecture
- `debt`: route works, but the data composition is still structurally weaker than desired

## Web

| Route | Page file | Layout / shell | Auth behavior | Data source | Shared ownership | Status |
|---|---|---|---|---|---|---|
| `/` | `apps/web/src/app/page.tsx` | `apps/web/src/app/layout.tsx` | public | customer-facing browse components | shared db storefront reads | working |
| `/chefs` | `apps/web/src/app/chefs/page.tsx` | web root layout | public | shared storefront list helpers | `packages/db` | working |
| `/chefs/[slug]` | `apps/web/src/app/chefs/[slug]/page.tsx` | web root layout | public | shared storefront + menu helpers | `packages/db` | working |
| `/cart` | `apps/web/src/app/cart/page.tsx` | web root + cart layout | public/session UX | cart context + web APIs | app + shared db | working |
| `/checkout` | `apps/web/src/app/checkout/page.tsx` | web root layout | public/session UX | checkout API + Stripe handoff | app + shared engine/db | working |
| `/account` | `apps/web/src/app/account/page.tsx` | account layout | protected by web middleware | account reads | mixed app/shared reads | debt |
| `/account/orders` | `apps/web/src/app/account/orders/page.tsx` | account layout | protected by web middleware | order history reads | mixed app/shared reads | debt |

## Chef Admin

| Route | Page file | Layout / shell | Auth behavior | Data source | Shared ownership | Status |
|---|---|---|---|---|---|---|
| `/auth/login` | `apps/chef-admin/src/app/auth/login/page.tsx` | auth layout | public | auth flow | auth package | working |
| `/dashboard` | `apps/chef-admin/src/app/dashboard/page.tsx` | dashboard layout | protected by chef middleware | chef overview reads | mixed app/shared reads | debt |
| `/dashboard/orders` | `apps/chef-admin/src/app/dashboard/orders/page.tsx` | dashboard layout | protected | chef order APIs | shared engine/db on write path | working |
| `/dashboard/menu` | `apps/chef-admin/src/app/dashboard/menu/page.tsx` | dashboard layout | protected | shared menu/storefront helpers | `packages/db` | working |
| `/dashboard/storefront` | `apps/chef-admin/src/app/dashboard/storefront/page.tsx` | dashboard layout | protected | chef storefront API | shared db, chef-scoped only | working |
| `/dashboard/payouts` | `apps/chef-admin/src/app/dashboard/payouts/page.tsx` | dashboard layout | protected | chef finance view | structurally weaker read model | debt |
| `/dashboard/settings` | `apps/chef-admin/src/app/dashboard/settings/page.tsx` | dashboard layout | protected | chef profile/settings reads | mixed app/shared reads | debt |

## Ops Admin

| Route | Page file | Layout / shell | Auth behavior | Data source | Shared ownership | Status |
|---|---|---|---|---|---|---|
| `/auth/login` | `apps/ops-admin/src/app/auth/login/page.tsx` | ops root layout | public | auth flow | auth package | working |
| `/dashboard` | `apps/ops-admin/src/app/dashboard/page.tsx` | ops dashboard shell | protected by ops middleware | engine dashboard API | shared engine | working |
| `/dashboard/chefs` | `apps/ops-admin/src/app/dashboard/chefs/page.tsx` | ops dashboard shell | protected | `/api/chefs` | shared db + shared engine on actions | working |
| `/dashboard/chefs/[id]` | `apps/ops-admin/src/app/dashboard/chefs/[id]/page.tsx` | ops dashboard shell | protected | shared chef governance detail helper | `packages/db` + shared engine actions | working |
| `/dashboard/chefs/approvals` | `apps/ops-admin/src/app/dashboard/chefs/approvals/page.tsx` | ops dashboard shell | protected | `/api/chefs?status=pending` | shared db + shared engine actions | working |
| `/dashboard/orders` | `apps/ops-admin/src/app/dashboard/orders/page.tsx` | ops dashboard shell | protected | engine-backed order views/actions | shared engine | working |
| `/dashboard/drivers` | `apps/ops-admin/src/app/dashboard/drivers/page.tsx` | ops dashboard shell | protected | direct driver reads | mixed app/shared reads | debt |
| `/dashboard/deliveries` | `apps/ops-admin/src/app/dashboard/deliveries/page.tsx` | ops dashboard shell | protected | engine-backed delivery/dispatch | shared engine | working |
| `/dashboard/customers` | `apps/ops-admin/src/app/dashboard/customers/page.tsx` | ops dashboard shell | protected | direct customer reads | mixed app/shared reads | debt |
| `/dashboard/support` | `apps/ops-admin/src/app/dashboard/support/page.tsx` | ops dashboard shell | protected | support APIs | mixed app/shared reads | debt |
| `/dashboard/settings` | `apps/ops-admin/src/app/dashboard/settings/page.tsx` | ops dashboard shell | protected | platform settings reads | mixed app/shared reads | debt |
| `/dashboard/finance` | `apps/ops-admin/src/app/dashboard/finance/page.tsx` | ops dashboard shell | protected, elevated role check in page | shared commerce summary + shared finance repo helpers | `packages/engine` + `packages/db` | working |

## Driver App

| Route | Page file | Layout / shell | Auth behavior | Data source | Shared ownership | Status |
|---|---|---|---|---|---|---|
| `/` | `apps/driver-app/src/app/page.tsx` | driver root layout | protected by driver middleware | driver dashboard reads | mixed app/shared reads | debt |
| `/delivery/[id]` | `apps/driver-app/src/app/delivery/[id]/page.tsx` | driver root layout | protected | delivery detail API | shared engine on write path | working |
| `/earnings` | `apps/driver-app/src/app/earnings/page.tsx` | driver root layout | protected | driver earnings reads | structurally weaker read model | debt |
| `/history` | `apps/driver-app/src/app/history/page.tsx` | driver root layout | protected | delivery history reads | structurally weaker read model | debt |
| `/profile` | `apps/driver-app/src/app/profile/page.tsx` | driver root layout | protected | driver profile/logout | app + shared auth | working |

## Notes

- No dead links were introduced in this pass.
- No cross-app shell leakage was introduced in this pass.
- The biggest remaining route-level structural debt is read-model normalization, not app ownership.
