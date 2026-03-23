-- ==========================================
-- RIDENDINE RLS POLICIES FIX
-- Comprehensive Row Level Security
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE chef_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_kitchens ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_storefronts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_payout_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE chef_delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_option_values ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_item_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_item_modifiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_tracking_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_runs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- ==========================================
-- HELPER FUNCTIONS
-- ==========================================

-- Check if user is an ops admin
CREATE OR REPLACE FUNCTION is_ops_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM platform_users
    WHERE platform_users.user_id = $1
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get chef profile ID for user
CREATE OR REPLACE FUNCTION get_chef_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM chef_profiles WHERE chef_profiles.user_id = $1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get customer ID for user
CREATE OR REPLACE FUNCTION get_customer_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM customers WHERE customers.user_id = $1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get driver ID for user
CREATE OR REPLACE FUNCTION get_driver_id(user_id UUID)
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT id FROM drivers WHERE drivers.user_id = $1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PUBLIC READ ACCESS (Active Storefronts & Menus)
-- ==========================================

-- Anyone can view active chef storefronts
CREATE POLICY "Public can view active storefronts"
ON chef_storefronts FOR SELECT
TO public
USING (is_active = true);

-- Anyone can view menu categories for active storefronts
CREATE POLICY "Public can view menu categories"
ON menu_categories FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = menu_categories.storefront_id
    AND is_active = true
  )
);

-- Anyone can view available menu items
CREATE POLICY "Public can view menu items"
ON menu_items FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = menu_items.storefront_id
    AND is_active = true
  )
);

-- Anyone can view menu item options
CREATE POLICY "Public can view menu options"
ON menu_item_options FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM menu_items
    JOIN chef_storefronts ON chef_storefronts.id = menu_items.storefront_id
    WHERE menu_items.id = menu_item_options.menu_item_id
    AND chef_storefronts.is_active = true
  )
);

-- Anyone can view menu option values
CREATE POLICY "Public can view option values"
ON menu_item_option_values FOR SELECT
TO public
USING (
  EXISTS (
    SELECT 1 FROM menu_item_options
    JOIN menu_items ON menu_items.id = menu_item_options.menu_item_id
    JOIN chef_storefronts ON chef_storefronts.id = menu_items.storefront_id
    WHERE menu_item_options.id = menu_item_option_values.option_id
    AND chef_storefronts.is_active = true
  )
);

-- Anyone can view published reviews
CREATE POLICY "Public can view reviews"
ON reviews FOR SELECT
TO public
USING (is_visible = true);

-- Anyone can view active promo codes
CREATE POLICY "Public can view promo codes"
ON promo_codes FOR SELECT
TO public
USING (is_active = true);

-- ==========================================
-- CHEF POLICIES
-- ==========================================

-- Chefs can view/edit their own profile
CREATE POLICY "Chefs can manage own profile"
ON chef_profiles FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Chefs can manage their kitchens
CREATE POLICY "Chefs can manage own kitchens"
ON chef_kitchens FOR ALL
TO authenticated
USING (chef_id = get_chef_id(auth.uid()))
WITH CHECK (chef_id = get_chef_id(auth.uid()));

-- Chefs can manage their storefronts
CREATE POLICY "Chefs can manage own storefronts"
ON chef_storefronts FOR ALL
TO authenticated
USING (chef_id = get_chef_id(auth.uid()))
WITH CHECK (chef_id = get_chef_id(auth.uid()));

-- Chefs can manage their availability
CREATE POLICY "Chefs can manage availability"
ON chef_availability FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = chef_availability.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = chef_availability.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
);

-- Chefs can manage their delivery zones
CREATE POLICY "Chefs can manage delivery zones"
ON chef_delivery_zones FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = chef_delivery_zones.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = chef_delivery_zones.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
);

-- Chefs can manage their menu categories
CREATE POLICY "Chefs can manage menu categories"
ON menu_categories FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = menu_categories.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = menu_categories.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
);

-- Chefs can manage their menu items
CREATE POLICY "Chefs can manage menu items"
ON menu_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = menu_items.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = menu_items.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
);

-- Chefs can view/update orders for their storefront
CREATE POLICY "Chefs can view own orders"
ON orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = orders.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
);

CREATE POLICY "Chefs can update own orders"
ON orders FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = orders.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM chef_storefronts
    WHERE chef_storefronts.id = orders.storefront_id
    AND chef_id = get_chef_id(auth.uid())
  )
);

-- Chefs can view order items for their orders
CREATE POLICY "Chefs can view order items"
ON order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    JOIN chef_storefronts ON chef_storefronts.id = orders.storefront_id
    WHERE orders.id = order_items.order_id
    AND chef_id = get_chef_id(auth.uid())
  )
);

-- ==========================================
-- CUSTOMER POLICIES
-- ==========================================

-- Customers can manage their own profile
CREATE POLICY "Customers can manage own profile"
ON customers FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Customers can manage their addresses
CREATE POLICY "Customers can manage own addresses"
ON customer_addresses FOR ALL
TO authenticated
USING (customer_id = get_customer_id(auth.uid()))
WITH CHECK (customer_id = get_customer_id(auth.uid()));

-- Customers can manage their carts
CREATE POLICY "Customers can manage own carts"
ON carts FOR ALL
TO authenticated
USING (customer_id = get_customer_id(auth.uid()))
WITH CHECK (customer_id = get_customer_id(auth.uid()));

-- Customers can manage their cart items
CREATE POLICY "Customers can manage cart items"
ON cart_items FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM carts
    WHERE carts.id = cart_items.cart_id
    AND customer_id = get_customer_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM carts
    WHERE carts.id = cart_items.cart_id
    AND customer_id = get_customer_id(auth.uid())
  )
);

-- Customers can manage their favorites
CREATE POLICY "Customers can manage favorites"
ON favorites FOR ALL
TO authenticated
USING (customer_id = get_customer_id(auth.uid()))
WITH CHECK (customer_id = get_customer_id(auth.uid()));

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
ON orders FOR SELECT
TO authenticated
USING (customer_id = get_customer_id(auth.uid()));

-- Customers can create orders
CREATE POLICY "Customers can create orders"
ON orders FOR INSERT
TO authenticated
WITH CHECK (customer_id = get_customer_id(auth.uid()));

-- Customers can view order items for their orders
CREATE POLICY "Customers can view own order items"
ON order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND customer_id = get_customer_id(auth.uid())
  )
);

-- Customers can create order items
CREATE POLICY "Customers can create order items"
ON order_items FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = order_items.order_id
    AND customer_id = get_customer_id(auth.uid())
  )
);

-- Customers can create reviews for their orders
CREATE POLICY "Customers can create reviews"
ON reviews FOR INSERT
TO authenticated
WITH CHECK (customer_id = get_customer_id(auth.uid()));

-- Customers can view their own reviews
CREATE POLICY "Customers can view own reviews"
ON reviews FOR SELECT
TO authenticated
USING (customer_id = get_customer_id(auth.uid()));

-- ==========================================
-- DRIVER POLICIES
-- ==========================================

-- Drivers can manage their own profile
CREATE POLICY "Drivers can manage own profile"
ON drivers FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Drivers can manage their vehicles
CREATE POLICY "Drivers can manage own vehicles"
ON driver_vehicles FOR ALL
TO authenticated
USING (driver_id = get_driver_id(auth.uid()))
WITH CHECK (driver_id = get_driver_id(auth.uid()));

-- Drivers can manage their presence
CREATE POLICY "Drivers can manage presence"
ON driver_presence FOR ALL
TO authenticated
USING (driver_id = get_driver_id(auth.uid()))
WITH CHECK (driver_id = get_driver_id(auth.uid()));

-- Drivers can view their shifts
CREATE POLICY "Drivers can view own shifts"
ON driver_shifts FOR SELECT
TO authenticated
USING (driver_id = get_driver_id(auth.uid()));

-- Drivers can view their earnings
CREATE POLICY "Drivers can view own earnings"
ON driver_earnings FOR SELECT
TO authenticated
USING (driver_id = get_driver_id(auth.uid()));

-- Drivers can view deliveries assigned to them
CREATE POLICY "Drivers can view assigned deliveries"
ON deliveries FOR SELECT
TO authenticated
USING (driver_id = get_driver_id(auth.uid()));

-- Drivers can update deliveries assigned to them
CREATE POLICY "Drivers can update assigned deliveries"
ON deliveries FOR UPDATE
TO authenticated
USING (driver_id = get_driver_id(auth.uid()))
WITH CHECK (driver_id = get_driver_id(auth.uid()));

-- Drivers can view delivery assignments for them
CREATE POLICY "Drivers can view own assignments"
ON delivery_assignments FOR SELECT
TO authenticated
USING (driver_id = get_driver_id(auth.uid()));

-- Drivers can update delivery assignments (accept/reject)
CREATE POLICY "Drivers can respond to assignments"
ON delivery_assignments FOR UPDATE
TO authenticated
USING (driver_id = get_driver_id(auth.uid()))
WITH CHECK (driver_id = get_driver_id(auth.uid()));

-- ==========================================
-- OPS ADMIN POLICIES (Full Access)
-- ==========================================

-- Ops admins can view all chef profiles
CREATE POLICY "Ops can view all chefs"
ON chef_profiles FOR SELECT
TO authenticated
USING (is_ops_admin(auth.uid()));

-- Ops admins can update chef profiles (approve/reject)
CREATE POLICY "Ops can update chefs"
ON chef_profiles FOR UPDATE
TO authenticated
USING (is_ops_admin(auth.uid()))
WITH CHECK (is_ops_admin(auth.uid()));

-- Ops admins can view all orders
CREATE POLICY "Ops can view all orders"
ON orders FOR SELECT
TO authenticated
USING (is_ops_admin(auth.uid()));

-- Ops admins can update all orders
CREATE POLICY "Ops can update all orders"
ON orders FOR UPDATE
TO authenticated
USING (is_ops_admin(auth.uid()))
WITH CHECK (is_ops_admin(auth.uid()));

-- Ops admins can view all order items
CREATE POLICY "Ops can view all order items"
ON order_items FOR SELECT
TO authenticated
USING (is_ops_admin(auth.uid()));

-- Ops admins can view all deliveries
CREATE POLICY "Ops can view all deliveries"
ON deliveries FOR SELECT
TO authenticated
USING (is_ops_admin(auth.uid()));

-- Ops admins can update all deliveries
CREATE POLICY "Ops can update all deliveries"
ON deliveries FOR UPDATE
TO authenticated
USING (is_ops_admin(auth.uid()))
WITH CHECK (is_ops_admin(auth.uid()));

-- Ops admins can create deliveries
CREATE POLICY "Ops can create deliveries"
ON deliveries FOR INSERT
TO authenticated
WITH CHECK (is_ops_admin(auth.uid()));

-- Ops admins can view all drivers
CREATE POLICY "Ops can view all drivers"
ON drivers FOR SELECT
TO authenticated
USING (is_ops_admin(auth.uid()));

-- Ops admins can update drivers
CREATE POLICY "Ops can update drivers"
ON drivers FOR UPDATE
TO authenticated
USING (is_ops_admin(auth.uid()))
WITH CHECK (is_ops_admin(auth.uid()));

-- Ops admins can view all customers
CREATE POLICY "Ops can view all customers"
ON customers FOR SELECT
TO authenticated
USING (is_ops_admin(auth.uid()));

-- Ops admins can manage support tickets
CREATE POLICY "Ops can manage support tickets"
ON support_tickets FOR ALL
TO authenticated
USING (is_ops_admin(auth.uid()))
WITH CHECK (is_ops_admin(auth.uid()));

-- Platform users can view their own record
CREATE POLICY "Platform users can view self"
ON platform_users FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_ops_admin(auth.uid()));

-- ==========================================
-- NOTIFICATIONS (Self-only)
-- ==========================================

CREATE POLICY "Users can view own notifications"
ON notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update own notifications"
ON notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
