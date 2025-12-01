-- =====================================================================
-- Add status column to IPVs table
-- =====================================================================
-- This script adds a 'status' column to the ipvs table to control
-- whether an IPV is open (user can perform all operations) or 
-- closed (user can only view data).
--
-- INSTRUCTIONS:
-- 1. Go to your Supabase project (https://supabase.com/dashboard)
-- 2. Click "SQL Editor" in the sidebar
-- 3. Copy and paste this entire script
-- 4. Click "Run" to execute
-- 5. Refresh your application to see the changes
-- =====================================================================

-- Add status column to ipvs table (defaults to 'open')
ALTER TABLE public.ipvs 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open' 
CHECK (status IN ('open', 'closed'));

-- =====================================================================
-- Done! IPVs now have a status field that can be 'open' or 'closed'.
-- Admins can toggle this status to control user access.
-- =====================================================================
