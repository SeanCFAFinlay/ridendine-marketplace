-- Migration 00065: Public read access for chef availability and delivery zones
-- Enables public marketplace visitors to inspect operating hours and delivery zones.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chef_availability' AND policyname = 'Public can view chef availability'
  ) THEN
    CREATE POLICY "Public can view chef availability"
    ON chef_availability FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chef_delivery_zones' AND policyname = 'Public can view delivery zones'
  ) THEN
    CREATE POLICY "Public can view delivery zones"
    ON chef_delivery_zones FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'chef_kitchens' AND policyname = 'Public can view chef kitchens'
  ) THEN
    CREATE POLICY "Public can view chef kitchens"
    ON chef_kitchens FOR SELECT
    TO anon, authenticated
    USING (true);
  END IF;
END $$;
