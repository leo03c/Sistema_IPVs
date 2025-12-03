-- =====================================================================
-- Fix Catalog Product Deletion Behavior
-- =====================================================================
-- This script changes the foreign key constraint on products.catalog_product_id
-- from ON DELETE CASCADE to ON DELETE SET NULL.
--
-- PROBLEM: When a product is deleted from the catalog, all products in IPVs
-- that reference it are also deleted due to CASCADE behavior. This is problematic
-- because products that have been sold or assigned to IPVs should remain intact
-- for historical records and reporting.
--
-- SOLUTION: Change the constraint to SET NULL so that when a catalog product
-- is deleted, the products in IPVs will have their catalog_product_id set to NULL
-- but will remain in the database with their name, price, and stock information.
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase project (https://supabase.com/dashboard)
-- 2. Click "SQL Editor" in the sidebar
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- 5. Refresh your application to see the changes
-- =====================================================================

-- Step 1: Drop the existing foreign key constraint
-- First, we need to find and drop the existing constraint
-- The constraint name is typically auto-generated, so we'll use a query to find it
DO $$
DECLARE
    constraint_name TEXT;
BEGIN
    -- Find the constraint name for catalog_product_id foreign key
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.products'::regclass
      AND contype = 'f'
      AND conkey = (SELECT ARRAY[attnum] FROM pg_attribute 
                    WHERE attrelid = 'public.products'::regclass 
                    AND attname = 'catalog_product_id');
    
    -- Drop the constraint if it exists
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.products DROP CONSTRAINT IF EXISTS %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END IF;
END $$;

-- Step 2: Add the new foreign key constraint with ON DELETE SET NULL
ALTER TABLE public.products 
ADD CONSTRAINT products_catalog_product_id_fkey 
FOREIGN KEY (catalog_product_id) 
REFERENCES public.product_catalog(id) 
ON DELETE SET NULL;

-- Note: The index idx_products_catalog_product_id already exists from 
-- the previous migration (008-create-product-catalog.sql), so we don't 
-- need to recreate it here.

-- =====================================================================
-- Done! Now when a product is deleted from the catalog, products in IPVs
-- will have their catalog_product_id set to NULL but will remain in the
-- database with all their information (name, price, stock, sales, etc.)
-- =====================================================================
