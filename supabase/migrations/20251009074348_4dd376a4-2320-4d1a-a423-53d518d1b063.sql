-- Security Enhancement: RBAC, Recipe Versions Ownership, Cost Data Protection
-- This migration implements role-based access control and fixes data exposure issues

-- ============================================================================
-- PART 1: Role-Based Access Control (RBAC) System
-- ============================================================================

-- Step 1.1: Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Step 1.2: Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Step 1.3: Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Step 1.4: RLS policies for user_roles table
CREATE POLICY "Users can read their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Only admins can assign roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- PART 2: Fix Recipe Versions Ownership
-- ============================================================================

-- Step 2.1: Add user_id to recipe_versions for direct ownership validation
ALTER TABLE public.recipe_versions 
ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Step 2.2: Set default for new rows
ALTER TABLE public.recipe_versions 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Step 2.3: Backfill existing recipe_versions with owner from parent recipe
UPDATE public.recipe_versions rv
SET user_id = r.user_id
FROM public.recipes r
WHERE rv.recipe_id = r.id AND rv.user_id IS NULL;

-- Step 2.4: Make NOT NULL after backfill
ALTER TABLE public.recipe_versions 
ALTER COLUMN user_id SET NOT NULL;

-- Step 2.5: Create index for performance
CREATE INDEX IF NOT EXISTS idx_recipe_versions_user_id ON public.recipe_versions(user_id);

-- Step 2.6: Drop overly-permissive policies
DROP POLICY IF EXISTS "Authenticated users can read all recipe versions" ON public.recipe_versions;
DROP POLICY IF EXISTS "Authenticated users can create recipe versions" ON public.recipe_versions;

-- Step 2.7: Create owner-scoped policies
CREATE POLICY "Users can read own recipe versions"
ON public.recipe_versions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipe versions"
ON public.recipe_versions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- PART 3: Protect Cost Data with Public View
-- ============================================================================

-- Step 3.1: Create public view without cost_per_kg
CREATE OR REPLACE VIEW public.ingredients_public AS
SELECT 
  id, name, category, water_pct, fat_pct, msnf_pct,
  sugars_pct, other_solids_pct, sp_coeff, pac_coeff,
  notes, tags, sugar_split, created_at, updated_at
  -- Explicitly exclude cost_per_kg
FROM public.ingredients;

-- Step 3.2: Grant access to public view
GRANT SELECT ON public.ingredients_public TO anon;
GRANT SELECT ON public.ingredients_public TO authenticated;

-- Step 3.3: Drop public read policy on main ingredients table
DROP POLICY IF EXISTS "Public users can read non-sensitive ingredient data" ON public.ingredients;

-- Step 3.4: Keep authenticated read policy (they can see costs)
-- No change needed - "Authenticated users can read all ingredient data" stays

-- ============================================================================
-- PART 4: Restrict Ingredient Write Access to Admins
-- ============================================================================

-- Step 4.1: Drop overly-permissive write policies
DROP POLICY IF EXISTS "Authenticated users can insert ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Authenticated users can update ingredients" ON public.ingredients;
DROP POLICY IF EXISTS "Authenticated users can delete ingredients" ON public.ingredients;

-- Step 4.2: Create admin-only write policies
CREATE POLICY "Admins can insert ingredients"
ON public.ingredients FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ingredients"
ON public.ingredients FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ingredients"
ON public.ingredients FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================================
-- PART 5: Initial Admin Assignment (IMPORTANT)
-- ============================================================================

-- Note: You'll need to manually insert your admin user_id after migration
-- Run this SQL in the Supabase SQL editor with your actual user ID:
-- 
-- INSERT INTO public.user_roles (user_id, role)
-- VALUES ('your-user-id-here', 'admin')
-- ON CONFLICT (user_id, role) DO NOTHING;
--
-- To find your user_id, run: SELECT id, email FROM auth.users;

COMMENT ON TABLE public.user_roles IS 'Stores user role assignments for RBAC. Admin role required for ingredient management.';
COMMENT ON FUNCTION public.has_role IS 'Security definer function to check user roles without RLS recursion.';
COMMENT ON VIEW public.ingredients_public IS 'Public view of ingredients without cost data. Unauthenticated users see this.';