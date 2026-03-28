-- Make user_id nullable for admin-created records
ALTER TABLE chef_profiles ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE drivers ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE customers ALTER COLUMN user_id DROP NOT NULL;

-- Drop foreign key constraints that prevent creating records without auth users
ALTER TABLE chef_profiles DROP CONSTRAINT IF EXISTS chef_profiles_user_id_fkey;
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_user_id_fkey;
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_user_id_fkey;
