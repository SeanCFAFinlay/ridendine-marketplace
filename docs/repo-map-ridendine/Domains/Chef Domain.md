# Chef Domain

> Everything related to chef functionality — profile, storefront, menu, orders, payouts.

## Ownership

- **Primary App**: `apps/chef-admin` (port 3001)
- **DB Tables**: `chef_profiles`, `chef_kitchens`, `chef_storefronts`, `chef_documents`, `chef_availability`, `chef_delivery_zones`, `chef_payout_accounts`, `chef_payouts`, `menu_categories`, `menu_items`, `menu_item_options`, `menu_item_option_values`, `menu_item_availability`
- **Repositories**: `chef.repository.ts`, `storefront.repository.ts`, `menu.repository.ts`
- **Engine**: `KitchenEngine`
- **Validation**: `chef.ts` schemas

## Chef Lifecycle

```
Sign Up (status: pending) → Ops Approves → Create Storefront → Ops Publishes → Visible to Customers
```

## Pages

| Route | Purpose | Status |
|-------|---------|--------|
| `/auth/login` | Chef login | Connected |
| `/auth/signup` | Chef registration (creates pending profile) | Connected |
| `/dashboard` | Overview: stats, recent orders, quick actions | Connected |
| `/dashboard/menu` | Menu category + item CRUD | Connected |
| `/dashboard/orders` | Real-time order management with countdown | Connected |
| `/dashboard/storefront` | Storefront create/edit | Connected |
| `/dashboard/payouts` | Earnings + Stripe Connect setup + payout requests | Connected |
| `/dashboard/analytics` | Revenue charts, top items, hourly distribution | Connected |
| `/dashboard/reviews` | View reviews, respond to customers | Connected |
| `/dashboard/settings` | Profile edit (display_name, bio, phone) | Connected |

## Key Components

| Component | Role |
|-----------|------|
| `Sidebar` | 8-item navigation |
| `MenuList` | Full CRUD with modals for categories + items |
| `OrdersList` | Real-time with audio alerts + 8-min countdown |
| `StorefrontForm` | Edit existing storefront |
| `StorefrontSetupForm` | Create new storefront |
| `ProfileForm` | Edit chef profile |

## Order Management Flow

```
New order arrives → Audio alert + countdown timer (8 min)
  → Accept (set prep time estimate)
  → Start Preparing
  → Mark Ready → Auto-dispatches to driver
  OR → Reject (with reason: too_busy, out_of_ingredients, closing_soon, etc.)
```

## Storefront Visibility Control

```
chef_profiles.status = 'approved' (ops-controlled)
  AND chef_storefronts.is_active = TRUE (ops-controlled)
  AND menu_items.is_available = TRUE (chef-controlled)
= Visible to customers
```

**Chef cannot publish their own storefront.** They can only create it and edit it. Publication is controlled exclusively by ops-admin.

## Stripe Connect Integration

1. Chef clicks "Set Up Payouts" → POST `/api/payouts/setup`
2. Creates Stripe Express account → onboarding link
3. Chef completes Stripe KYC/onboarding externally
4. Account status updated in `chef_payout_accounts`
5. Chef requests payout → POST `/api/payouts/request`
6. Minimum $10, creates Stripe Transfer to express account
7. Platform fee: 15% + Stripe processing: 2.9% + $0.30

## Schema Not Yet Surfaced in UI

| Table | What It Would Do |
|-------|-----------------|
| `chef_documents` | Upload food handler certs, kitchen inspections |
| `chef_availability` | Set operating hours per day |
| `chef_delivery_zones` | Define delivery area with PostGIS |
| `menu_item_options` | Size, topping, customization options |
| `menu_item_availability` | Time-based item visibility |

## Image Upload Gaps

All these fields exist but have no upload mechanism:
- `chef_profiles.profile_image_url`
- `chef_storefronts.cover_image_url`
- `chef_storefronts.logo_url`
- `menu_items.image_url`

Upload buttons exist in forms but are stubs.
