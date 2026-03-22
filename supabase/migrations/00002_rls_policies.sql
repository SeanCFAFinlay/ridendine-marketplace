-- ==========================================
-- ROW LEVEL SECURITY POLICIES
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
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- PUBLIC READ POLICIES (Storefronts & Menus)
-- ==========================================

-- Anyone can view active storefronts
CREATE POLICY "Public can view active storefronts"
  ON chef_storefronts FOR SELECT
  USING (is_active = true);

-- Anyone can view menu categories for active storefronts
CREATE POLICY "Public can view menu categories"
  ON menu_categories FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM chef_storefronts
      WHERE chef_storefronts.id = menu_categories.storefront_id
      AND chef_storefronts.is_active = true
    )
  );

-- Anyone can view available menu items
CREATE POLICY "Public can view menu items"
  ON menu_items FOR SELECT
  USING (
    is_available = true
    AND EXISTS (
      SELECT 1 FROM chef_storefronts
      WHERE chef_storefronts.id = menu_items.storefront_id
      AND chef_storefronts.is_active = true
    )
  );

-- Anyone can view menu item options
CREATE POLICY "Public can view menu item options"
  ON menu_item_options FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM menu_items
      WHERE menu_items.id = menu_item_options.menu_item_id
      AND menu_items.is_available = true
    )
  );

-- Anyone can view menu item option values
CREATE POLICY "Public can view menu item option values"
  ON menu_item_option_values FOR SELECT
  USING (is_available = true);

-- Anyone can view visible reviews
CREATE POLICY "Public can view reviews"
  ON reviews FOR SELECT
  USING (is_visible = true);

-- ==========================================
-- CHEF POLICIES
-- ==========================================

-- Chefs can view and update their own profile
CREATE POLICY "Chefs can view own profile"
  ON chef_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Chefs can update own profile"
  ON chef_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Chefs can manage their own kitchens
CREATE POLICY "Chefs can manage own kitchens"
  ON chef_kitchens FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chef_profiles
      WHERE chef_profiles.id = chef_kitchens.chef_id
      AND chef_profiles.user_id = auth.uid()
    )
  );

-- Chefs can manage their own storefronts
CREATE POLICY "Chefs can manage own storefronts"
  ON chef_storefronts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chef_profiles
      WHERE chef_profiles.id = chef_storefronts.chef_id
      AND chef_profiles.user_id = auth.uid()
    )
  );

-- Chefs can manage their own menu categories
CREATE POLICY "Chefs can manage own menu categories"
  ON menu_categories FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chef_storefronts
      JOIN chef_profiles ON chef_profiles.id = chef_storefronts.chef_id
      WHERE chef_storefronts.id = menu_categories.storefront_id
      AND chef_profiles.user_id = auth.uid()
    )
  );

-- Chefs can manage their own menu items
CREATE POLICY "Chefs can manage own menu items"
  ON menu_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM chef_storefronts
      JOIN chef_profiles ON chef_profiles.id = chef_storefronts.chef_id
      WHERE chef_storefronts.id = menu_items.storefront_id
      AND chef_profiles.user_id = auth.uid()
    )
  );

-- ==========================================
-- CUSTOMER POLICIES
-- ==========================================

-- Customers can view and update their own profile
CREATE POLICY "Customers can view own profile"
  ON customers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Customers can update own profile"
  ON customers FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Customers can insert own profile"
  ON customers FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Customers can manage their own addresses
CREATE POLICY "Customers can manage own addresses"
  ON customer_addresses FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = customer_addresses.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Customers can manage their own cart
CREATE POLICY "Customers can manage own cart"
  ON carts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = carts.customer_id
      AND customers.user_id = auth.uid()
    )
  );

CREATE POLICY "Customers can manage own cart items"
  ON cart_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM carts
      JOIN customers ON customers.id = carts.customer_id
      WHERE carts.id = cart_items.cart_id
      AND customers.user_id = auth.uid()
    )
  );

-- Customers can manage their own favorites
CREATE POLICY "Customers can manage own favorites"
  ON favorites FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = favorites.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Customers can view their own orders
CREATE POLICY "Customers can view own orders"
  ON orders FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = orders.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Customers can create orders
CREATE POLICY "Customers can create orders"
  ON orders FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM customers
      WHERE customers.id = orders.customer_id
      AND customers.user_id = auth.uid()
    )
  );

-- Customers can view their order items
CREATE POLICY "Customers can view own order items"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      JOIN customers ON customers.id = orders.customer_id
      WHERE orders.id = order_items.order_id
      AND customers.user_id = auth.uid()
    )
  );

-- Customers can create reviews for their orders
CREATE POLICY "Customers can create reviews"
  ON reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      JOIN customers ON customers.id = orders.customer_id
      WHERE orders.id = reviews.order_id
      AND customers.user_id = auth.uid()
      AND orders.status = 'delivered'
    )
  );

-- ==========================================
-- DRIVER POLICIES
-- ==========================================

-- Drivers can view and update their own profile
CREATE POLICY "Drivers can view own profile"
  ON drivers FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Drivers can update own profile"
  ON drivers FOR UPDATE
  USING (auth.uid() = user_id);

-- Drivers can manage their own documents
CREATE POLICY "Drivers can manage own documents"
  ON driver_documents FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_documents.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can manage their own vehicles
CREATE POLICY "Drivers can manage own vehicles"
  ON driver_vehicles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_vehicles.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can view and update their presence
CREATE POLICY "Drivers can manage own presence"
  ON driver_presence FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_presence.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can view assigned deliveries
CREATE POLICY "Drivers can view assigned deliveries"
  ON deliveries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = deliveries.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can update assigned deliveries
CREATE POLICY "Drivers can update assigned deliveries"
  ON deliveries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = deliveries.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can view their delivery assignments
CREATE POLICY "Drivers can view own assignments"
  ON delivery_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = delivery_assignments.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can respond to assignments
CREATE POLICY "Drivers can respond to assignments"
  ON delivery_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = delivery_assignments.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- Drivers can view their own earnings
CREATE POLICY "Drivers can view own earnings"
  ON driver_earnings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM drivers
      WHERE drivers.id = driver_earnings.driver_id
      AND drivers.user_id = auth.uid()
    )
  );

-- ==========================================
-- NOTIFICATION POLICIES
-- ==========================================

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);
