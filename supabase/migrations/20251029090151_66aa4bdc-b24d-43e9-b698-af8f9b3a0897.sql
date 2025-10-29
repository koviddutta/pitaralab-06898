-- Create base_recipes table for storing user-defined base recipes
CREATE TABLE IF NOT EXISTS public.base_recipes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL DEFAULT 'ice_cream',
  ingredients_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.base_recipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can read own base recipes"
  ON public.base_recipes
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own base recipes"
  ON public.base_recipes
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own base recipes"
  ON public.base_recipes
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own base recipes"
  ON public.base_recipes
  FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_base_recipes_updated_at
  BEFORE UPDATE ON public.base_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();