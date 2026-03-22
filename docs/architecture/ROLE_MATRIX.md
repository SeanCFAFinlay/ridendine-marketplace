# Ridendine Role Matrix

## Role Definitions

### Customer
**Identity**: `customers` table linked to `auth.users`
**Access Level**: Public marketplace + own data
**Authentication**: Email/password, OAuth (Google, Apple)

| Capability | Access |
|------------|--------|
| Browse chef storefronts | ✓ Public |
| View menus | ✓ Public |
| Search/filter chefs | ✓ Public |
| Add to cart | ✓ Authenticated |
| Place orders | ✓ Authenticated |
| View own orders | ✓ Own data only |
| Submit reviews | ✓ Own orders only |
| Manage favorites | ✓ Own data only |
| Manage addresses | ✓ Own data only |
| Update profile | ✓ Own data only |

### Chef
**Identity**: `chef_profiles` table linked to `auth.users`
**Access Level**: Own storefront + orders
**Authentication**: Email/password with verification

| Capability | Access |
|------------|--------|
| Complete onboarding | ✓ Own profile |
| Manage storefront | ✓ Own storefront |
| Manage kitchen settings | ✓ Own kitchen |
| CRUD menu categories | ✓ Own storefront |
| CRUD menu items | ✓ Own storefront |
| Set availability | ✓ Own storefront |
| View incoming orders | ✓ Own orders |
| Update order status | ✓ Own orders |
| View reviews | ✓ Own storefront |
| View earnings | ✓ Own data |

### Driver
**Identity**: `drivers` table linked to `auth.users`
**Access Level**: Own deliveries + available offers
**Authentication**: Email/password with verification

| Capability | Access |
|------------|--------|
| Complete onboarding | ✓ Own profile |
| Manage vehicle info | ✓ Own data |
| Toggle online/offline | ✓ Own status |
| View delivery offers | ✓ Available offers |
| Accept/reject offers | ✓ Offered deliveries |
| View active delivery | ✓ Assigned delivery |
| Confirm pickup | ✓ Assigned delivery |
| Confirm dropoff | ✓ Assigned delivery |
| View earnings | ✓ Own data |
| View delivery history | ✓ Own data |

### Ops Admin
**Identity**: `platform_users` table with role='ops_admin'
**Access Level**: Platform-wide read + specific write actions
**Authentication**: Email/password with MFA (recommended)

| Capability | Access |
|------------|--------|
| View all chef applications | ✓ All |
| Approve/reject chefs | ✓ All |
| View all orders | ✓ All |
| View all deliveries | ✓ All |
| Handle support escalations | ✓ All |
| Process refunds | ✓ All |
| Add admin notes | ✓ All |
| View audit logs | ✓ All |
| Manage promo codes | ✓ All |

## Permission Inheritance

```
Platform Admin (superuser)
    └── Ops Admin (operations)

Customer ──┬── (no elevation)
Chef ──────┴── (separate role, same auth.users)
Driver ────┴── (separate role, same auth.users)
```

## Role Detection Logic

```typescript
// Pseudocode for role detection
async function getUserRoles(userId: string) {
  const roles = [];

  const customer = await db.customers.findByUserId(userId);
  if (customer) roles.push('customer');

  const chef = await db.chefProfiles.findByUserId(userId);
  if (chef) roles.push('chef');

  const driver = await db.drivers.findByUserId(userId);
  if (driver) roles.push('driver');

  const platformUser = await db.platformUsers.findByUserId(userId);
  if (platformUser) roles.push(platformUser.role);

  return roles;
}
```

## Supabase RLS Strategy

- All tables have RLS enabled
- Public read policies for storefronts/menus
- Authenticated policies for customer actions
- Owner-only policies for profile/order data
- Service role bypasses RLS for admin operations
