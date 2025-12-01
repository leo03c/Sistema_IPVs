-- Add policy to allow admins to view all user profiles
-- This is needed for the admin panel to show users when creating IPVs
--
-- IMPORTANT: If you already ran the old version of this script and are having login issues,
-- run this first to remove the problematic policy:
--   DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
--
-- Then run this script to create the corrected policy.

-- First, drop the old policy if it exists (this fixes the circular dependency issue)
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;

-- Create a helper function with SECURITY DEFINER to check if current user is admin
-- This bypasses RLS policies to avoid circular dependency
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a new policy that uses the helper function
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());
