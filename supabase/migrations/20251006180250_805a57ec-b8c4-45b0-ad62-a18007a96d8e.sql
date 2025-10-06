-- Add versioning support to recipes table
-- Create recipe_versions table for full version history

-- Create recipe_versions table
CREATE TABLE IF NOT EXISTS public.recipe_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  name text NOT NULL,
  rows_json jsonb NOT NULL,
  metrics jsonb,
  product_type text,
  profile_id text,
  profile_version text DEFAULT '2025',
  change_notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(recipe_id, version_number)
);

-- Enable RLS on recipe_versions
ALTER TABLE public.recipe_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipe_versions
CREATE POLICY "Authenticated users can read all recipe versions"
  ON public.recipe_versions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create recipe versions"
  ON public.recipe_versions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Function to auto-increment version numbers
CREATE OR REPLACE FUNCTION public.increment_recipe_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the next version number for this recipe
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO NEW.version_number
  FROM public.recipe_versions
  WHERE recipe_id = NEW.recipe_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-set version number
CREATE TRIGGER set_recipe_version_number
  BEFORE INSERT ON public.recipe_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_recipe_version();

-- Add index for faster version lookups
CREATE INDEX idx_recipe_versions_recipe_id ON public.recipe_versions(recipe_id);
CREATE INDEX idx_recipe_versions_created_at ON public.recipe_versions(created_at DESC);