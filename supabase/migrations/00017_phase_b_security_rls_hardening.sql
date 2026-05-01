-- Phase B security hardening: tighten sensitive-table exposure and support ticket access depth.
-- This migration intentionally removes broad anon policies from sensitive tables.

-- ---------------------------------------------------------------------------
-- 1) Remove unsafe anon read access from sensitive tables
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Anon can view all orders" ON orders;
DROP POLICY IF EXISTS "Anon can view all order items" ON order_items;
DROP POLICY IF EXISTS "Anon can view all deliveries" ON deliveries;
DROP POLICY IF EXISTS "Anon can view all drivers" ON drivers;
DROP POLICY IF EXISTS "Anon can view driver presence" ON driver_presence;
DROP POLICY IF EXISTS "Anon can view all customers" ON customers;
DROP POLICY IF EXISTS "Anon can view all customer addresses" ON customer_addresses;
DROP POLICY IF EXISTS "Anon can view support tickets" ON support_tickets;
DROP POLICY IF EXISTS "Anon can view driver earnings" ON driver_earnings;
DROP POLICY IF EXISTS "Anon can view driver locations" ON driver_locations;
DROP POLICY IF EXISTS "Anon can view delivery assignments" ON delivery_assignments;

-- Keep public discovery-only policies on storefront/menu/reviews.
DROP POLICY IF EXISTS "Anon can view all storefronts" ON chef_storefronts;
CREATE POLICY "Public can view active storefronts"
ON chef_storefronts FOR SELECT
TO anon, authenticated
USING (is_active = true);

DROP POLICY IF EXISTS "Anon can view all menu categories" ON menu_categories;
CREATE POLICY "Public can view menu categories"
ON menu_categories FOR SELECT
TO anon, authenticated
USING (true);

DROP POLICY IF EXISTS "Anon can view all menu items" ON menu_items;
CREATE POLICY "Public can view menu items"
ON menu_items FOR SELECT
TO anon, authenticated
USING (is_available = true);

DROP POLICY IF EXISTS "Anon can view all reviews" ON reviews;
CREATE POLICY "Public can view reviews"
ON reviews FOR SELECT
TO anon, authenticated
USING (is_visible = true);

-- ---------------------------------------------------------------------------
-- 2) Support ticket RLS depth hardening
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Ops can manage support tickets" ON support_tickets;

-- Customer self-service: only own tickets.
CREATE POLICY "support_tickets_customer_select_own"
ON support_tickets FOR SELECT
TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "support_tickets_customer_insert_own"
ON support_tickets FOR INSERT
TO authenticated
WITH CHECK (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()));

CREATE POLICY "support_tickets_customer_update_open_own"
ON support_tickets FOR UPDATE
TO authenticated
USING (customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid()))
WITH CHECK (
  customer_id IN (SELECT id FROM customers WHERE user_id = auth.uid())
  AND status IN ('open', 'in_progress')
);

-- Platform support and ops roles: read/write queue access.
CREATE POLICY "support_tickets_platform_select"
ON support_tickets FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM platform_users pu
    WHERE pu.user_id = auth.uid()
      AND pu.role IN ('support_agent', 'ops_agent', 'ops_admin', 'ops_manager', 'super_admin')
  )
);

CREATE POLICY "support_tickets_platform_update"
ON support_tickets FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM platform_users pu
    WHERE pu.user_id = auth.uid()
      AND pu.role IN ('support_agent', 'ops_agent', 'ops_admin', 'ops_manager', 'super_admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM platform_users pu
    WHERE pu.user_id = auth.uid()
      AND pu.role IN ('support_agent', 'ops_agent', 'ops_admin', 'ops_manager', 'super_admin')
  )
);
