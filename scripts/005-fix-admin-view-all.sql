-- =====================================================================
-- SOLUCIÓN COMPLETA: Permitir que los administradores vean todos los datos
-- =====================================================================
-- Este script soluciona el problema donde los administradores no pueden
-- ver los IPVs, productos y ventas en el panel de administración.
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com/dashboard)
-- 2. Click en "SQL Editor" en el menú lateral
-- 3. Copia y pega TODO este script
-- 4. Click en "Run" para ejecutarlo
-- 5. Refresca tu aplicación para ver los cambios
-- =====================================================================

-- Crear o actualizar la función is_admin()
-- Esta función verifica si el usuario actual es administrador
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================================
-- POLÍTICAS PARA PROFILES
-- =====================================================================
DROP POLICY IF EXISTS "profiles_select_admin" ON public.profiles;
CREATE POLICY "profiles_select_admin"
  ON public.profiles FOR SELECT
  USING (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA IPVs
-- =====================================================================
DROP POLICY IF EXISTS "ipvs_select_admin" ON public.ipvs;
CREATE POLICY "ipvs_select_admin"
  ON public.ipvs FOR SELECT
  USING (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA PRODUCTS
-- =====================================================================
DROP POLICY IF EXISTS "products_select_admin" ON public.products;
CREATE POLICY "products_select_admin"
  ON public.products FOR SELECT
  USING (public.is_admin());

-- =====================================================================
-- POLÍTICAS PARA SALES
-- =====================================================================
DROP POLICY IF EXISTS "sales_select_admin" ON public.sales;
CREATE POLICY "sales_select_admin"
  ON public.sales FOR SELECT
  USING (public.is_admin());

-- =====================================================================
-- ¡Listo! Después de ejecutar este script, los administradores podrán
-- ver todos los IPVs, productos y ventas en el panel de administración.
-- =====================================================================
