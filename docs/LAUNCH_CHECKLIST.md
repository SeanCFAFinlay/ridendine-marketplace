# Launch Checklist

## Supabase Configuration (do these in the Supabase dashboard)

### 1. Email Templates
Go to: **Supabase Dashboard → Authentication → Email Templates**

Update these templates with RideNDine branding:
- **Confirm signup** — sent when a new user signs up
- **Reset password** — sent when user clicks "Forgot password"
- **Magic link** — (optional, if you want passwordless login)

Example subject line: `Welcome to RideNDine — Confirm Your Email`

The default Supabase templates work but look generic. Customize the HTML to include the RideNDine logo and brand colors (#E85D26, #1a7a6e).

### 2. Auth Settings
Go to: **Supabase Dashboard → Authentication → Providers**

Verify:
- Email provider is enabled
- "Confirm email" is ON (users must verify email before login)
- "Secure email change" is ON

Go to: **Authentication → URL Configuration**
- Site URL: `https://ridendine.ca`
- Redirect URLs: add all 4 app URLs:
  - `https://ridendine-web.vercel.app/**`
  - `https://ridendine-chef-admin.vercel.app/**`
  - `https://ridendine-ops-admin.vercel.app/**`
  - `https://ridendine-driver-app.vercel.app/**`
  - `https://ridendine.ca/**`

### 3. Storage Buckets
Go to: **Supabase Dashboard → Storage**

Create these buckets (set all to **Public**):
- `menu-items` — chef menu item photos
- `profiles` — user profile images
- `storefronts` — storefront cover and logo images

For each bucket, set:
- Public: ON
- File size limit: 5MB
- Allowed MIME types: `image/jpeg, image/png, image/webp, image/gif`

### 4. Replace Seed Data
Go to: **Supabase Dashboard → Authentication → Users**

The seed data created these test accounts:
- `ops@ridendine.ca` (super_admin, password: `password123`)
- `sean@ridendine.ca` (chef, password: `password123`)

**For production:**
1. Change the password for `ops@ridendine.ca` to something secure
2. Or create a new super_admin account with your real email
3. Delete any test accounts you don't want

To create a new ops admin:
1. Create the user in Supabase Auth
2. Add a row to `platform_users` table:
   ```sql
   INSERT INTO platform_users (user_id, email, name, role, is_active)
   VALUES ('the-auth-user-uuid', 'your@email.com', 'Your Name', 'super_admin', true);
   ```

## Vercel Environment Variables (verify all are set)

### ridendine-web
| Variable | Set? |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ✅ |
| `STRIPE_SECRET_KEY` | ✅ |
| `STRIPE_WEBHOOK_SECRET` | ✅ |
| `NEXT_PUBLIC_APP_URL` | Should be `https://ridendine.ca` |

### ridendine-ops-admin
| Variable | Set? |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |
| `STRIPE_SECRET_KEY` | ✅ |
| `ENGINE_PROCESSOR_TOKEN` | ✅ |
| `CRON_SECRET` | ✅ |

### ridendine-chef-admin & ridendine-driver-app
| Variable | Set? |
|----------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ |

## End-to-End Test Flow

Before going live, manually test this complete flow:

### Customer Flow
1. [ ] Sign up as new customer on ridendine.ca
2. [ ] Receive confirmation email, click link
3. [ ] Browse chefs, view a storefront
4. [ ] Add items to cart
5. [ ] Checkout with Stripe test card: `4242 4242 4242 4242`
6. [ ] See order confirmation page
7. [ ] Track order status updates

### Chef Flow
1. [ ] Sign up as new chef on chef-admin
2. [ ] Wait for ops approval (or approve yourself from ops-admin)
3. [ ] Create storefront
4. [ ] Add menu categories and items with images
5. [ ] See incoming order from customer test
6. [ ] Accept order, start preparing, mark ready
7. [ ] View payout on payouts page

### Driver Flow
1. [ ] Sign up as driver on driver-app
2. [ ] Get approved from ops-admin
3. [ ] Go online
4. [ ] Receive delivery offer (after chef marks order ready)
5. [ ] Accept offer
6. [ ] Navigate to pickup, confirm pickup
7. [ ] Navigate to customer, take photo, complete delivery

### Ops Flow
1. [ ] Log into ops-admin
2. [ ] See dashboard with KPIs
3. [ ] Approve pending chef and driver
4. [ ] View order flow through system
5. [ ] View delivery on live map
6. [ ] Process a test refund
7. [ ] Check finance dashboard

## Going Live with Stripe

When ready to accept real payments:
1. Get live Stripe keys from https://dashboard.stripe.com/apikeys (NOT /test/)
2. Update `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in Vercel for ridendine-web
3. Update `STRIPE_SECRET_KEY` in Vercel for ridendine-ops-admin
4. Create a new webhook endpoint pointing to your production URL
5. Update `STRIPE_WEBHOOK_SECRET` with the new signing secret
6. Test with a real $1 order and refund it immediately
