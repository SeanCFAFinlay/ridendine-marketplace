-- ==========================================
-- ANONYMOUS READ POLICIES FOR DASHBOARD
-- Allows unauthenticated users to view data
-- Used when BYPASS_AUTH is enabled
-- ==========================================

-- Orders - allow anon read for dashboard
CREATE POLICY "Anon can view all orders"
ON orders FOR SELECT
TO anon
USING (true);

-- Order items - allow anon read
CREATE POLICY "Anon can view all order items"
ON order_items FOR SELECT
TO anon
USING (true);

-- Deliveries - allow anon read
CREATE POLICY "Anon can view all deliveries"
ON deliveries FOR SELECT
TO anon
USING (true);

-- Drivers - allow anon read
CREATE POLICY "Anon can view all drivers"
ON drivers FOR SELECT
TO anon
USING (true);

-- Driver presence - allow anon read
CREATE POLICY "Anon can view driver presence"
ON driver_presence FOR SELECT
TO anon
USING (true);

-- Chef profiles - allow anon read
CREATE POLICY "Anon can view all chef profiles"
ON chef_profiles FOR SELECT
TO anon
USING (true);

-- Chef storefronts - allow anon read (extends existing active-only policy)
DROP POLICY IF EXISTS "Public can view active storefronts" ON chef_storefronts;
CREATE POLICY "Anon can view all storefronts"
ON chef_storefronts FOR SELECT
TO anon
USING (true);

-- Customers - allow anon read
CREATE POLICY "Anon can view all customers"
ON customers FOR SELECT
TO anon
USING (true);

-- Customer addresses - allow anon read
CREATE POLICY "Anon can view all customer addresses"
ON customer_addresses FOR SELECT
TO anon
USING (true);

-- Reviews - allow anon read
DROP POLICY IF EXISTS "Public can view reviews" ON reviews;
CREATE POLICY "Anon can view all reviews"
ON reviews FOR SELECT
TO anon
USING (true);

-- Support tickets - allow anon read
CREATE POLICY "Anon can view support tickets"
ON support_tickets FOR SELECT
TO anon
USING (true);

-- Menu categories - allow anon read
DROP POLICY IF EXISTS "Public can view menu categories" ON menu_categories;
CREATE POLICY "Anon can view all menu categories"
ON menu_categories FOR SELECT
TO anon
USING (true);

-- Menu items - allow anon read
DROP POLICY IF EXISTS "Public can view menu items" ON menu_items;
CREATE POLICY "Anon can view all menu items"
ON menu_items FOR SELECT
TO anon
USING (true);

-- Driver earnings - allow anon read
CREATE POLICY "Anon can view driver earnings"
ON driver_earnings FOR SELECT
TO anon
USING (true);

-- Driver locations - allow anon read (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'driver_locations') THEN
    EXECUTE 'CREATE POLICY "Anon can view driver locations" ON driver_locations FOR SELECT TO anon USING (true)';
  END IF;
END $$;

-- Delivery assignments - allow anon read
CREATE POLICY "Anon can view delivery assignments"
ON delivery_assignments FOR SELECT
TO anon
USING (true);

-- ==========================================
-- ENABLE REALTIME FOR KEY TABLES
-- ==========================================

-- Note: Run these in Supabase dashboard under Database > Replication
-- ALTER PUBLICATION supabase_realtime ADD TABLE orders;
-- ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
-- ALTER PUBLICATION supabase_realtime ADD TABLE driver_presence;
