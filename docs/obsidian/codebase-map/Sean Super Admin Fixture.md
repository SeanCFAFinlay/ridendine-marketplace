# Sean Super Admin Fixture

Generated: 2026-10-05T17:14:36.621Z

This generated audit proves the seeded test account is documented as a full multi-app admin fixture in source control. It checks the local seed, the dedicated idempotent promotion seed, and the bootstrap script so the same account can exercise the Customer marketplace, Chef admin, Driver app, and Ops admin during verification.

## Summary

| Metric | Count |
|---|---:|
| Account | sean@ridendine.ca |
| User id | 11111111-1111-1111-1111-111111111111 |
| Fixture contracts | 10 |
| Passed contracts | 10 |
| Failed checks | 0 |

## Contract Matrix

| Status | App surface | Contract | Evidence |
|---|---|---|---|
| PASS | All apps | auth user promoted to super_admin | local seed creates confirmed auth user with super-admin flag (supabase/seeds/seed.sql); dedicated seed promotes existing auth user to super admin (scripts/seed-sean-super-admin.sql); bootstrap script sets auth app metadata role (scripts/bootstrap-super-admin.mjs) |
| PASS | All apps | auth metadata role is super_admin | local seed stores super_admin metadata (supabase/seeds/seed.sql); dedicated seed stores app and user metadata roles (scripts/seed-sean-super-admin.sql); bootstrap script sets user metadata role (scripts/bootstrap-super-admin.mjs) |
| PASS | Ops admin | platform user is active super_admin | local seed creates active platform super-admin row (supabase/seeds/seed.sql); dedicated seed upserts active platform super-admin row (scripts/seed-sean-super-admin.sql); bootstrap script upserts active platform super-admin row (scripts/bootstrap-super-admin.mjs) |
| PASS | Customer marketplace | customer profile exists | local seed creates customer profile (supabase/seeds/seed.sql); dedicated seed upserts customer profile (scripts/seed-sean-super-admin.sql) |
| PASS | Customer marketplace | customer default address exists | local seed creates default customer address (supabase/seeds/seed.sql); dedicated seed creates default customer address (scripts/seed-sean-super-admin.sql) |
| PASS | Chef admin | chef profile is approved | local seed creates approved chef profile (supabase/seeds/seed.sql); dedicated seed upserts approved chef profile (scripts/seed-sean-super-admin.sql) |
| PASS | Chef admin | chef storefront is active | local seed creates active featured chef storefront (supabase/seeds/seed.sql) |
| PASS | Driver app | driver profile is approved | local seed creates approved driver profile (supabase/seeds/seed.sql); dedicated seed upserts approved driver profile (scripts/seed-sean-super-admin.sql) |
| PASS | Driver app | driver vehicle is active | local seed creates active driver vehicle (supabase/seeds/seed.sql); dedicated seed creates active driver vehicle (scripts/seed-sean-super-admin.sql) |
| PASS | Ops admin | bootstrap script promotes platform super_admin | bootstrap updates existing auth users (scripts/bootstrap-super-admin.mjs); bootstrap creates confirmed auth users when missing (scripts/bootstrap-super-admin.mjs); bootstrap platform upsert is keyed by user_id (scripts/bootstrap-super-admin.mjs) |

## Failures

None found.
