# RIDENDINE PLATFORM OVERVIEW

## All Pages (56 Total)

### RIDENDINE.CA (Customer Web) - 22 Pages

#### PUBLIC
- `/` - Home
- `/chefs` - Browse
- `/chefs/[slug]` - Chef Menu
- `/cart` - Cart
- `/checkout` - Checkout
- `/how-it-works`
- `/about`
- `/contact`
- `/privacy`
- `/terms`
- `/chef-signup`
- `/chef-resources`
- `/order-confirmation/[id]`

#### ACCOUNT (Protected)
- `/account` - Dashboard
- `/account/orders` - Order History
- `/account/addresses` - Addresses
- `/account/favorites` - Favorites
- `/account/settings` - Settings

#### AUTH
- `/auth/login`
- `/auth/signup`
- `/auth/forgot-password`

#### ORDER CONFIRMATION
- `/orders/[id]/confirmation`

---

### CHEF.RIDENDINE.CA (Chef Admin) - 11 Pages

#### AUTH
- `/auth/login`
- `/auth/signup`

#### HOME
- `/` - Redirects to dashboard

#### DASHBOARD
- `/dashboard` - Overview
- `/dashboard/orders` - Orders
- `/dashboard/menu` - Menu Management
- `/dashboard/storefront` - Settings
- `/dashboard/analytics`
- `/dashboard/reviews`
- `/dashboard/payouts`
- `/dashboard/settings`

---

### OPS.RIDENDINE.CA (Operations Admin) - 18 Pages

#### AUTH
- `/auth/login`

#### HOME
- `/` - Redirects to dashboard

#### DASHBOARD
- `/dashboard` - Overview
- `/dashboard/orders` - All Orders
- `/dashboard/orders/[id]` - Order Detail
- `/dashboard/chefs` - Chefs List
- `/dashboard/chefs/[id]` - Chef Detail
- `/dashboard/chefs/approvals`
- `/dashboard/customers`
- `/dashboard/customers/[id]`
- `/dashboard/drivers`
- `/dashboard/drivers/[id]`
- `/dashboard/deliveries`
- `/dashboard/deliveries/[id]`
- `/dashboard/analytics`
- `/dashboard/map` - Live Map
- `/dashboard/support`
- `/dashboard/settings`

---

### DRIVER.RIDENDINE.CA (Driver App) - 5 Pages

#### MAIN
- `/` - Active Jobs
- `/earnings` - Earnings
- `/history` - History
- `/profile` - Profile

#### DETAILS
- `/delivery/[id]` - Delivery Detail

---

## Summary

| Category        | Count |
|-----------------|-------|
| Total Apps      | 4     |
| Total Pages     | 56    |
| Database Tables | 36    |
| Shared Packages | 8     |

| App        | Domain              | Pages | Primary Users      |
|------------|---------------------|-------|--------------------|
| Web        | ridendine.ca        | 22    | Customers          |
| Chef Admin | chef.ridendine.ca   | 11    | Chefs              |
| Ops Admin  | ops.ridendine.ca    | 18    | Platform Operators |
| Driver App | driver.ridendine.ca | 5     | Delivery Drivers   |
