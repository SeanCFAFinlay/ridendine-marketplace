-- ==========================================
-- FIX ORDER_ITEMS SCHEMA
-- Aligns table with TypeScript types
-- ==========================================

-- Add missing columns if they don't exist
DO $$
BEGIN
  -- Add selected_options column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'selected_options'
  ) THEN
    ALTER TABLE order_items ADD COLUMN selected_options JSONB DEFAULT '[]';
  END IF;

  -- Add updated_at column if not exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
  END IF;

  -- Make menu_item_name nullable since we may not always populate it
  -- or add a default
  BEGIN
    ALTER TABLE order_items ALTER COLUMN menu_item_name DROP NOT NULL;
  EXCEPTION WHEN others THEN
    NULL; -- Column may already be nullable
  END;

  -- Add subtotal if it doesn't exist (calculated field)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'order_items' AND column_name = 'subtotal'
  ) THEN
    ALTER TABLE order_items ADD COLUMN subtotal DECIMAL(10, 2);
    -- Backfill subtotal from unit_price * quantity
    UPDATE order_items
    SET subtotal = COALESCE(unit_price * quantity, total_price, 0)
    WHERE subtotal IS NULL;
  END IF;

END $$;

-- Create function to auto-populate menu_item_name if not provided
CREATE OR REPLACE FUNCTION populate_order_item_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.menu_item_name IS NULL OR NEW.menu_item_name = '' THEN
    SELECT name INTO NEW.menu_item_name
    FROM menu_items
    WHERE id = NEW.menu_item_id;
  END IF;

  -- Auto-calculate subtotal if not provided
  IF NEW.subtotal IS NULL THEN
    NEW.subtotal := NEW.unit_price * NEW.quantity;
  END IF;

  -- Auto-set total_price if not provided
  IF NEW.total_price IS NULL THEN
    NEW.total_price := NEW.unit_price * NEW.quantity;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-populating order item data
DROP TRIGGER IF EXISTS order_item_auto_populate ON order_items;
CREATE TRIGGER order_item_auto_populate
  BEFORE INSERT ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION populate_order_item_name();

-- Add address column to chef_storefronts if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chef_storefronts' AND column_name = 'address'
  ) THEN
    ALTER TABLE chef_storefronts ADD COLUMN address TEXT;
  END IF;
END $$;

-- Add street_address alias to customer_addresses if using address_line1
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'customer_addresses' AND column_name = 'street_address'
  ) THEN
    -- Check if address_line1 exists
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'customer_addresses' AND column_name = 'address_line1'
    ) THEN
      ALTER TABLE customer_addresses RENAME COLUMN address_line1 TO street_address;
      ALTER TABLE customer_addresses DROP COLUMN IF EXISTS address_line2;
    END IF;
  END IF;
END $$;
