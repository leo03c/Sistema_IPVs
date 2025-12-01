-- =====================================================================
-- SOLUCIÓN: Permitir que los administradores vean todos los IPVs y productos
-- =====================================================================
-- Este script soluciona el problema donde los administradores solo pueden
-- ver los IPVs que ellos crearon. Después de ejecutar este script, los
-- administradores podrán ver TODOS los IPVs y productos en el panel de admin.
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com/dashboard)
-- 2. Click en "SQL Editor" en el menú lateral
-- 3. Copia y pega TODO este script
-- 4. Click en "Run" para ejecutarlo
-- 5. Refresca tu aplicación para ver los cambios
-- =====================================================================

-- Primero, crear o actualizar la función is_admin()
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

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "ipvs_select_admin" ON public.ipvs;
DROP POLICY IF EXISTS "products_select_admin" ON public.products;

-- Crear política para que los administradores puedan ver TODOS los IPVs
CREATE POLICY "ipvs_select_admin"
  ON public.ipvs FOR SELECT
  USING (public.is_admin());

-- Crear política para que los administradores puedan ver TODOS los productos
CREATE POLICY "products_select_admin"
  ON public.products FOR SELECT
  USING (public.is_admin());

-- =====================================================================
-- ¡Listo! Después de ejecutar este script, los administradores podrán
-- ver todos los IPVs en la pestaña de IPVs y seleccionarlos al crear productos.
-- =====================================================================
