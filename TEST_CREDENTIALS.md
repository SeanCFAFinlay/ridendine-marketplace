# Test Credentials

This document contains test credentials for all 4 Ridendine applications.

## Auth Bypass Mode

All applications support an auth bypass mode for development and testing:

- **Environment Variable**: `BYPASS_AUTH=true`
- **Development Mode**: Automatically enabled when `NODE_ENV=development`
- **Vercel Preview**: Set `BYPASS_AUTH=true` in Vercel environment settings

When auth bypass is enabled, you can access all routes without logging in.

---

## 1. Customer Web App

**Domain**: ridendine.ca
**Login URL**: https://ridendine.ca/auth/login
**Signup URL**: https://ridendine.ca/auth/signup

| Field | Value |
|-------|-------|
| Email | customer@ridendine.test |
| Password | TestCustomer123! |
| Role | customer |

**Features Available**:
- Browse chefs and storefronts
- View menus and dishes
- Add items to cart
- Checkout and order
- Track deliveries
- Manage account and addresses

**Auth Bypass**: Yes - set `BYPASS_AUTH=true` or run in development mode

---

## 2. Chef Admin App

**Domain**: chef.ridendine.ca
**Login URL**: https://chef.ridendine.ca/auth/login
**Signup URL**: https://chef.ridendine.ca/auth/signup

| Field | Value |
|-------|-------|
| Email | chef@ridendine.test |
| Password | TestChef123! |
| Role | chef |

**Features Available**:
- Dashboard with order stats
- Order management (accept/reject/prepare/ready)
- Menu management (add/edit/delete items)
- Storefront customization
- Analytics and revenue tracking
- Reviews and responses
- Payout management (Stripe Connect)

**Auth Bypass**: Yes - set `BYPASS_AUTH=true` or run in development mode

---

## 3. Ops Admin App

**Domain**: ops.ridendine.ca
**Login URL**: https://ops.ridendine.ca/auth/login

| Field | Value |
|-------|-------|
| Email | ops@ridendine.test |
| Password | TestOps123! |
| Role | admin |

**Features Available**:
- Command center dashboard
- Live map with delivery tracking
- Order management across platform
- Chef management and approvals
- Driver management and assignments
- Customer management
- Delivery tracking and assignment
- Support ticket management
- Platform analytics
- Platform settings

**Auth Bypass**: Yes - set `BYPASS_AUTH=true` or run in development mode

---

## 4. Driver App

**Domain**: driver.ridendine.ca
**Login URL**: https://driver.ridendine.ca/auth/login

| Field | Value |
|-------|-------|
| Email | driver@ridendine.test |
| Password | TestDriver123! |
| Role | driver |

**Features Available**:
- Dashboard with active deliveries
- Online/offline status toggle
- Delivery list and details
- Route navigation (Google Maps integration)
- Delivery status updates (pickup/dropoff flow)
- Delivery history
- Earnings tracking
- Profile management

**Auth Bypass**: Yes - set `BYPASS_AUTH=true` or run in development mode

---

## Supabase Seeding

These test accounts should be seeded into Supabase. Run the following SQL in your Supabase dashboard:

```sql
-- Create test users in auth.users (handled by Supabase Auth)
-- After signup, update their profiles:

-- Customer
INSERT INTO public.customers (id, user_id, first_name, last_name, email, phone)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'customer@ridendine.test'),
  'Test',
  'Customer',
  'customer@ridendine.test',
  '+1-555-0101'
);

-- Chef
INSERT INTO public.chef_profiles (id, user_id, display_name, bio, phone, status)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'chef@ridendine.test'),
  'Test Chef',
  'A test chef account for development',
  '+1-555-0102',
  'approved'
);

-- Admin/Ops (uses admin_users table if exists, or just user with admin role)
-- Admins are typically managed through Supabase dashboard or custom admin table

-- Driver
INSERT INTO public.driver_profiles (id, user_id, display_name, phone, status)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM auth.users WHERE email = 'driver@ridendine.test'),
  'Test Driver',
  '+1-555-0104',
  'approved'
);
```

---

## Quick Access URLs

| App | Local Dev | Production |
|-----|-----------|------------|
| Customer Web | http://localhost:3000 | https://ridendine.ca |
| Chef Admin | http://localhost:3001 | https://chef.ridendine.ca |
| Ops Admin | http://localhost:3002 | https://ops.ridendine.ca |
| Driver App | http://localhost:3003 | https://driver.ridendine.ca |

---

## Notes

1. **Auth Bypass**: For Vercel preview deployments, all apps have `BYPASS_AUTH=true` configured in their respective `vercel.json` files.

2. **Local Development**: When running `pnpm dev`, all apps run in development mode with auth bypass enabled automatically.

3. **Production**: In production, set `BYPASS_AUTH=false` and ensure proper Supabase authentication is configured with valid `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` environment variables.

4. **Password Requirements**: All test passwords meet the following criteria:
   - At least 12 characters
   - Contains uppercase letter
   - Contains lowercase letter
   - Contains number
   - Contains special character

5. **Role-Based Access**: Each app expects users with the appropriate role. The middleware validates roles where applicable.
