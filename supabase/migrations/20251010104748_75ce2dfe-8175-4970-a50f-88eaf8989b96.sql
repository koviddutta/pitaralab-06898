-- Phase 2 Compliance Fixes (v2)
-- 1. Add is_public column to recipes table
-- 2. Fix recipe_versions RLS to be owner-scoped

-- Add is_public column with default false
ALTER TABLE public.recipes 
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false;

-- Update recipe_versions RLS policies to be owner-scoped
-- First, add user_id column to recipe_versions for proper ownership tracking
ALTER TABLE public.recipe_versions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Set default for new rows
ALTER TABLE public.recipe_versions 
ALTER COLUMN user_id SET DEFAULT auth.uid();

-- Backfill user_id from created_by where it exists
UPDATE public.recipe_versions 
SET user_id = created_by 
WHERE user_id IS NULL AND created_by IS NOT NULL;

-- Make user_id NOT NULL after backfill
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.recipe_versions WHERE user_id IS NULL) THEN
    ALTER TABLE public.recipe_versions ALTER COLUMN user_id SET NOT NULL;
  END IF;
END $$;

-- Drop ALL existing policies on recipe_versions
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'recipe_versions' AND schemaname = 'public')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.recipe_versions';
    END LOOP;
END $$;

-- Create owner-scoped policies for recipe_versions
CREATE POLICY "Users can read own recipe versions"
ON public.recipe_versions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipe versions"
ON public.recipe_versions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_recipe_versions_user_id ON public.recipe_versions(user_id);

-- Comment
COMMENT ON COLUMN public.recipes.is_public IS 'Whether this recipe is publicly visible to other users';
COMMENT ON COLUMN public.recipe_versions.user_id IS 'Owner of this recipe version, used for RLS policies';