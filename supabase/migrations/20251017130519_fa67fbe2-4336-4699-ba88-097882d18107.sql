-- Create table for ML training data (recipe outcomes)
CREATE TABLE IF NOT EXISTS public.recipe_outcomes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID,
  outcome TEXT NOT NULL CHECK (outcome IN ('success', 'needs_improvement', 'failed')),
  actual_texture TEXT,
  notes TEXT,
  metrics JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recipe_outcomes ENABLE ROW LEVEL SECURITY;

-- Users can view their own outcomes
CREATE POLICY "Users can view their own recipe outcomes"
ON public.recipe_outcomes
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own outcomes
CREATE POLICY "Users can log their own recipe outcomes"
ON public.recipe_outcomes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_recipe_outcomes_user_id ON public.recipe_outcomes(user_id);
CREATE INDEX idx_recipe_outcomes_outcome ON public.recipe_outcomes(outcome);
CREATE INDEX idx_recipe_outcomes_created_at ON public.recipe_outcomes(created_at DESC);

-- Comment
COMMENT ON TABLE public.recipe_outcomes IS 'Stores recipe outcomes for ML model training and continuous learning';