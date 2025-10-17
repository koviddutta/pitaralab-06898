-- Create production_plans table for commercial batch production
CREATE TABLE public.production_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  total_liters NUMERIC NOT NULL,
  sku_size NUMERIC NOT NULL,
  waste_factor NUMERIC NOT NULL DEFAULT 5,
  recipe_allocations JSONB NOT NULL DEFAULT '[]'::jsonb,
  procurement_list JSONB DEFAULT '[]'::jsonb,
  total_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.production_plans ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own production plans"
  ON public.production_plans
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own production plans"
  ON public.production_plans
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own production plans"
  ON public.production_plans
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own production plans"
  ON public.production_plans
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_production_plans_updated_at
  BEFORE UPDATE ON public.production_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();