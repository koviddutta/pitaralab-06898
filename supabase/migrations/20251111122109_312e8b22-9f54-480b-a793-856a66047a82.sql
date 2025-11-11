-- Create ingredient_costs table for user-specific pricing
CREATE TABLE IF NOT EXISTS public.ingredient_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  ingredient_name TEXT NOT NULL,
  cost_per_kg DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, ingredient_name)
);

-- Enable RLS
ALTER TABLE public.ingredient_costs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own ingredient costs"
  ON public.ingredient_costs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ingredient costs"
  ON public.ingredient_costs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ingredient costs"
  ON public.ingredient_costs FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ingredient costs"
  ON public.ingredient_costs FOR DELETE
  USING (auth.uid() = user_id);

-- Create optimization_presets table
CREATE TABLE IF NOT EXISTS public.optimization_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  preset_name TEXT NOT NULL,
  product_type TEXT NOT NULL,
  target_metrics JSONB NOT NULL,
  algorithm TEXT DEFAULT 'genetic',
  config JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, preset_name)
);

-- Enable RLS
ALTER TABLE public.optimization_presets ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own presets"
  ON public.optimization_presets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own presets"
  ON public.optimization_presets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own presets"
  ON public.optimization_presets FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own presets"
  ON public.optimization_presets FOR DELETE
  USING (auth.uid() = user_id);

-- Create analysis_history table
CREATE TABLE IF NOT EXISTS public.analysis_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  analysis_type TEXT NOT NULL, -- 'chemistry', 'cost', 'optimization', 'sugar_blend'
  recipe_name TEXT,
  recipe_data JSONB NOT NULL,
  results JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.analysis_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own analysis history"
  ON public.analysis_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analysis history"
  ON public.analysis_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own analysis history"
  ON public.analysis_history FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger for ingredient_costs
CREATE TRIGGER update_ingredient_costs_updated_at
  BEFORE UPDATE ON public.ingredient_costs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for optimization_presets
CREATE TRIGGER update_optimization_presets_updated_at
  BEFORE UPDATE ON public.optimization_presets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_ingredient_costs_user_id ON public.ingredient_costs(user_id);
CREATE INDEX idx_optimization_presets_user_id ON public.optimization_presets(user_id);
CREATE INDEX idx_analysis_history_user_id ON public.analysis_history(user_id);
CREATE INDEX idx_analysis_history_type ON public.analysis_history(analysis_type);
CREATE INDEX idx_analysis_history_created_at ON public.analysis_history(created_at DESC);