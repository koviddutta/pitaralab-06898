-- Phase 1: Critical Security Fixes for Ingredients Tables

-- Fix ingredients table RLS policies
-- The issue: Current policies use USING (true) which allows access regardless of authentication
-- The fix: Ensure policies properly check for authenticated users

-- Drop the overly permissive duplicate policies
DROP POLICY IF EXISTS "Authenticated users can read all ingredient data" ON public.ingredients;
DROP POLICY IF EXISTS "ingredients_read_all" ON public.ingredients;

-- Add proper authenticated read policy
-- This policy allows authenticated users to read all ingredient data (including cost_per_kg)
-- This is intentional for this app's security model where logged-in users need cost data for calculations
CREATE POLICY "ingredients_authenticated_read"
  ON public.ingredients
  FOR SELECT
  TO authenticated
  USING (true);

-- Note: The ingredients_public view doesn't need RLS policies since it's a view
-- Views inherit access control from the underlying table and SELECT grants
-- The view is already defined to exclude cost_per_kg column for public access scenarios

-- Grant SELECT on ingredients_public view to authenticated users
-- This allows the view to be queried even though it queries the underlying table
GRANT SELECT ON public.ingredients_public TO authenticated;
GRANT SELECT ON public.ingredients_public TO anon;

-- Security summary:
-- 1. ingredients table: Only authenticated users can read (includes cost data)
-- 2. ingredients_public view: Available to authenticated and anonymous users (excludes cost data)
-- 3. INSERT/UPDATE/DELETE on ingredients: Already restricted to admins via existing policies