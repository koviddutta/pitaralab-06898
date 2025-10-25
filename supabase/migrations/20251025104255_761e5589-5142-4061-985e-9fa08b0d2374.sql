-- Drop existing recipe-related tables and start fresh
DROP TABLE IF EXISTS recipe_outcomes CASCADE;
DROP TABLE IF EXISTS recipe_versions CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;

-- Create new recipes table with exact format specified
CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_name TEXT NOT NULL,
  product_type TEXT DEFAULT 'ice_cream',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create recipe_rows table to store individual ingredient rows
CREATE TABLE public.recipe_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  ingredient TEXT NOT NULL,
  quantity_g NUMERIC NOT NULL CHECK (quantity_g > 0),
  water_g NUMERIC NOT NULL DEFAULT 0,
  sugars_g NUMERIC NOT NULL DEFAULT 0,
  fat_g NUMERIC NOT NULL DEFAULT 0,
  msnf_g NUMERIC NOT NULL DEFAULT 0,
  other_solids_g NUMERIC NOT NULL DEFAULT 0,
  total_solids_g NUMERIC NOT NULL DEFAULT 0,
  lactose_g NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create calculated_metrics table for aggregated recipe metrics
CREATE TABLE public.calculated_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL UNIQUE REFERENCES public.recipes(id) ON DELETE CASCADE,
  total_quantity_g NUMERIC NOT NULL,
  total_water_g NUMERIC NOT NULL,
  total_sugars_g NUMERIC NOT NULL,
  total_fat_g NUMERIC NOT NULL,
  total_msnf_g NUMERIC NOT NULL,
  total_other_solids_g NUMERIC NOT NULL,
  total_solids_g NUMERIC NOT NULL,
  total_lactose_g NUMERIC NOT NULL,
  -- Percentages
  water_pct NUMERIC NOT NULL,
  sugars_pct NUMERIC NOT NULL,
  fat_pct NUMERIC NOT NULL,
  msnf_pct NUMERIC NOT NULL,
  other_solids_pct NUMERIC NOT NULL,
  total_solids_pct NUMERIC NOT NULL,
  lactose_pct NUMERIC NOT NULL,
  -- Scientific metrics
  sp NUMERIC DEFAULT 0,
  pac NUMERIC DEFAULT 0,
  fpdt NUMERIC DEFAULT 0,
  pod_index NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create recipe_outcomes for ML training
CREATE TABLE public.recipe_outcomes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'needs_improvement', 'failed')),
  actual_texture TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculated_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipe_outcomes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recipes
CREATE POLICY "Users can read own recipes" ON public.recipes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes" ON public.recipes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes" ON public.recipes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes" ON public.recipes
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for recipe_rows
CREATE POLICY "Users can read recipe rows" ON public.recipe_rows
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recipes 
      WHERE recipes.id = recipe_rows.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert recipe rows" ON public.recipe_rows
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes 
      WHERE recipes.id = recipe_rows.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update recipe rows" ON public.recipe_rows
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.recipes 
      WHERE recipes.id = recipe_rows.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete recipe rows" ON public.recipe_rows
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.recipes 
      WHERE recipes.id = recipe_rows.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

-- RLS Policies for calculated_metrics
CREATE POLICY "Users can read calculated metrics" ON public.calculated_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.recipes 
      WHERE recipes.id = calculated_metrics.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert calculated metrics" ON public.calculated_metrics
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.recipes 
      WHERE recipes.id = calculated_metrics.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update calculated metrics" ON public.calculated_metrics
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.recipes 
      WHERE recipes.id = calculated_metrics.recipe_id 
      AND recipes.user_id = auth.uid()
    )
  );

-- RLS Policies for recipe_outcomes
CREATE POLICY "Users can read own outcomes" ON public.recipe_outcomes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own outcomes" ON public.recipe_outcomes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX idx_recipe_rows_recipe_id ON public.recipe_rows(recipe_id);
CREATE INDEX idx_calculated_metrics_recipe_id ON public.calculated_metrics(recipe_id);
CREATE INDEX idx_recipe_outcomes_recipe_id ON public.recipe_outcomes(recipe_id);
CREATE INDEX idx_recipes_user_id ON public.recipes(user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calculated_metrics_updated_at
  BEFORE UPDATE ON public.calculated_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();