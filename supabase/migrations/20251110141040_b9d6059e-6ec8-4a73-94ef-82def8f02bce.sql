-- Create recipe_versions table for version history
CREATE TABLE IF NOT EXISTS public.recipe_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  recipe_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  ingredients_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  metrics_json JSONB,
  change_description TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, version_number)
);

-- Enable RLS on recipe_versions
ALTER TABLE public.recipe_versions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipe_versions
CREATE POLICY "Users can read versions of their own recipes"
  ON public.recipe_versions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_versions.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert versions for their own recipes"
  ON public.recipe_versions
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes
      WHERE recipes.id = recipe_versions.recipe_id
        AND recipes.user_id = auth.uid()
    )
  );

-- Create index for faster version lookups
CREATE INDEX idx_recipe_versions_recipe_id ON public.recipe_versions(recipe_id);
CREATE INDEX idx_recipe_versions_created_at ON public.recipe_versions(created_at DESC);

-- Auto-increment version number trigger (already exists, but ensure it's correct)
CREATE OR REPLACE FUNCTION public.increment_recipe_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Get the next version number for this recipe
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO NEW.version_number
  FROM public.recipe_versions
  WHERE recipe_id = NEW.recipe_id;
  
  RETURN NEW;
END;
$$;

-- Create trigger for auto-incrementing version numbers
DROP TRIGGER IF EXISTS trigger_increment_recipe_version ON public.recipe_versions;
CREATE TRIGGER trigger_increment_recipe_version
  BEFORE INSERT ON public.recipe_versions
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_recipe_version();