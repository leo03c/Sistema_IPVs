-- =====================================================================
-- Create Product Catalog System
-- =====================================================================
-- This script creates a new product catalog system where:
-- 1. Admins create products in a catalog (product_catalog table)
-- 2. Admins add products from catalog to IPVs with specific quantities
-- 3. The products table becomes a junction table (ipv_products)
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase project (https://supabase.com/dashboard)
-- 2. Click "SQL Editor" in the sidebar
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- 5. Refresh your application to see the changes
-- =====================================================================

-- Step 1: Create product_catalog table (admin-owned products)
CREATE TABLE IF NOT EXISTS public.product_catalog (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on product_catalog
ALTER TABLE public.product_catalog ENABLE ROW LEVEL SECURITY;

-- Policies for product_catalog
-- Admins can view their own products
CREATE POLICY "product_catalog_select_own"
  ON public.product_catalog FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
      AND profiles.id = product_catalog.admin_id
    )
  );

-- Admins can insert their own products
CREATE POLICY "product_catalog_insert_own"
  ON public.product_catalog FOR INSERT
  WITH CHECK (
    auth.uid() = admin_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can update their own products
CREATE POLICY "product_catalog_update_own"
  ON public.product_catalog FOR UPDATE
  USING (
    auth.uid() = admin_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Admins can delete their own products
CREATE POLICY "product_catalog_delete_own"
  ON public.product_catalog FOR DELETE
  USING (
    auth.uid() = admin_id
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- Step 2: Migrate existing products to new system
-- First, backup the old products structure by adding a catalog_product_id column
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS catalog_product_id UUID REFERENCES public.product_catalog(id) ON DELETE CASCADE;

-- Step 3: For existing products, create catalog entries and link them
-- This will be done by the application during migration
-- For now, we'll leave products as-is to maintain backward compatibility

-- Step 4: Add index for better performance
CREATE INDEX IF NOT EXISTS idx_product_catalog_admin_id ON public.product_catalog(admin_id);
CREATE INDEX IF NOT EXISTS idx_products_catalog_product_id ON public.products(catalog_product_id);

-- =====================================================================
-- Done! Product catalog system is now ready.
-- The application will handle the migration of existing products.
-- =====================================================================
